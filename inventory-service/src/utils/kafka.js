import { Kafka } from "kafkajs";
import { prisma } from "../config/bd.js"; // Note: ensure 'bd.js' isn't a typo for 'db.js'

// 1. Initialize Kafka (Changed clientId to match the service)
const kafka = new Kafka({
  clientId: "inventory-service",
  brokers: ["localhost:9092"]
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "inventory-service-group" });

// 2. Connect Producer
export const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("Producer connected to the Kafka server");
  } catch (err) {
    console.log("Error connecting Producer to the Kafka server", err);
  }
};

// 3. Connect Consumer and Listen
export const connectConsumer = async () => {
  try {
    await consumer.connect();
    console.log("Consumer connected to the Kafka server");

    await consumer.subscribe({ topic: "order-created", fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const rowData = message.value.toString();
        
        // FIX #1: Renamed variable to 'eventData' to match your code below
        const eventData = JSON.parse(rowData);

        if (eventData.type === 'OrderCreated' && topic === 'order-created') {
          try {
            // Step A: Fetch current stock for all items in the order
            const productIds = eventData.items.map(item => parseInt(item.productId));
            const productsInDb = await prisma.product.findMany({
              where: { id: { in: productIds } }
            });

            // Step B: Cross-reference requested quantity vs actual stock
            const failedItems = [];
            for (const reqItem of eventData.items) {
              const dbProduct = productsInDb.find(p => p.id === parseInt(reqItem.productId));
              
              // If product doesn't exist OR stock is too low, flag it!
              if (!dbProduct || dbProduct.stockQuantity < reqItem.quantity) {
                failedItems.push({
                  productId: reqItem.productId,
                  requested: reqItem.quantity,
                  available: dbProduct ? dbProduct.stockQuantity : 0
                });
              }
            }

            // Step C: If any items failed, abort and send the exact failed items to Kafka
            if (failedItems.length > 0) {
              console.log(`Order ${eventData.orderId} failed. Out of stock items:`, failedItems);
              
              await producer.send({
                topic: 'inventory-events',
                messages: [{ 
                  value: JSON.stringify({ 
                    type: 'InventoryFailed', 
                    data: { orderId: eventData.orderId, failedItems: failedItems } 
                  }) 
                }]
              });
              
              return; // EXIT EARLY: Do not proceed to update anything!
            }

            // Step D: ALL items have enough stock! Proceed with transaction.
            await prisma.$transaction(
              eventData.items.map(item => 
                prisma.product.update({
                  where: { id: parseInt(item.productId) },
                  data: { stockQuantity: { decrement: item.quantity } }
                })
              )
            );

            // FIX #2: ADDED THE MISSING SUCCESS EVENT
            // If the transaction succeeds, we MUST tell the Payment Service to continue!
            console.log(`Successfully reserved inventory for Order: ${eventData.orderId}`);
            await producer.send({
              topic: 'inventory-events',
              messages: [{
                value: JSON.stringify({
                  type: 'InventoryReserved',
                  data: { orderId: eventData.orderId, status: "RESERVED" }
                })
              }]
            });

          } catch (error) {
            // This catches any Prisma database crashes
            console.error(`Error processing inventory for order ${eventData.orderId}:`, error);
          }
        }
      }
    });
  } catch (error) {
    // FIX #3: Fixed bracket structure so this catches top-level consumer connection errors
    console.error("Error connecting Consumer to the Kafka server", error);
  }
};