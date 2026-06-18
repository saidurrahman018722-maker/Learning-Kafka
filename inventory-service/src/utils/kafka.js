import { Kafka } from "kafkajs";
import { prisma } from "../config/db.js";

const kafka = new Kafka({
  clientId: "inventory-service",
  brokers: ["localhost:9092"]
});

export const producer = kafka.producer();

// 1. Two separate consumers with distinct group IDs
export const reserveConsumer = kafka.consumer({ groupId: "inventory-reserve-group" });
export const restockConsumer = kafka.consumer({ groupId: "inventory-restock-group" });

export const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("Inventory Producer connected to Kafka");
  } catch (err) {
    console.log("Error connecting Producer:", err);
  }
};

export const connectConsumer = async () => {
  try {
    await reserveConsumer.connect();
    await restockConsumer.connect();
    console.log("Inventory Consumers connected to Kafka");

    // 2. Subscribe them to their specific topics
    await reserveConsumer.subscribe({ topic: "order-created", fromBeginning: true });
    await restockConsumer.subscribe({ topic: "order-events", fromBeginning: true });

    // 3. Run them concurrently
    await Promise.all([
      
      // ==========================================
      // CONSUMER 1: RESERVE INVENTORY
      // ==========================================
      reserveConsumer.run({
        eachMessage: async ({ message }) => {
          const eventData = JSON.parse(message.value.toString());

          if (eventData.type === 'OrderCreated') {
            try {
              const productIds = eventData.items.map(item => parseInt(item.productId));
              const productsInDb = await prisma.product.findMany({
                where: { id: { in: productIds } }
              });

              const failedItems = [];
              for (const reqItem of eventData.items) {
                const dbProduct = productsInDb.find(p => p.id === parseInt(reqItem.productId));
                if (!dbProduct || dbProduct.stockQuantity < reqItem.quantity) {
                  failedItems.push({
                    productId: reqItem.productId,
                    requested: reqItem.quantity,
                    available: dbProduct ? dbProduct.stockQuantity : 0
                  });
                }
              }

              if (failedItems.length > 0) {
                console.log(`Order ${eventData.orderId} failed. Out of stock items:`, failedItems);
                await producer.send({
                  topic: 'inventory-events',
                  messages: [{ 
                    key: eventData.orderId, 
                    value: JSON.stringify({ 
                      type: 'InventoryFailed', 
                      data: { orderId: eventData.orderId, userId: eventData.userId, failedItems: failedItems } 
                    }) 
                  }]
                });
                return; 
              }

              // DECREMENT STOCK
              await prisma.$transaction(
                eventData.items.map(item => 
                  prisma.product.update({
                    where: { id: parseInt(item.productId) },
                    data: { stockQuantity: { decrement: item.quantity } }
                  })
                )
              );

              console.log(`Successfully reserved inventory for Order: ${eventData.orderId}`);
              await producer.send({
                topic: 'start-payment',
                messages: [{
                  value: JSON.stringify({
                    type: 'StartingPayment',
                    data: { orderId: eventData.orderId, userId: eventData.userId, status: "RESERVED" }
                  })
                }]
              });

            } catch (error) {
              console.error(`Error processing inventory reservation:`, error);
              throw error; 
            }
          }
        }
      }),

      // ==========================================
      // CONSUMER 2: RESTOCK INVENTORY (COMPENSATING TRANSACTION)
      // ==========================================
      restockConsumer.run({
        eachMessage: async ({ message }) => {
          const eventData = JSON.parse(message.value.toString());

          if (eventData.type === 'OrderCancelled' && topic === 'order-events' && eventData.data.reason === 'PAYMENT_FAILED') {
          try {
            const { orderId, items } = eventData.data;

            // Safety check: Make sure items were actually provided
            if (!items || items.length === 0) {
              console.warn(`OrderCancelled event for ${orderId} is missing items to restock.`);
              return; 
            }

            console.log(`Payment failed for Order ${orderId}. Restocking inventory...`);

            await prisma.$transaction(
              items.map(item => 
                prisma.product.update({
                  where: { id: parseInt(item.productId) },
                  data: { stockQuantity: { increment: item.quantity } }
                })
              )
            );

            console.log(`Successfully restocked inventory for cancelled Order: ${orderId}`);

          } catch (error) {
            console.error(`Error restocking inventory for order ${eventData.data.orderId}:`, error);
            throw error; 
          }
        }
        }
      })

    ]);

  } catch (error) {
    console.error("Error connecting Inventory Consumers:", error);
  }
};