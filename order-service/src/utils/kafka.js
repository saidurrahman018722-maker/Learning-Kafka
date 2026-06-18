import { Kafka } from "kafkajs";
import { prisma } from "../config/db.js"; // 1. Added missing Prisma import

const kafka = new Kafka({
    clientId: "order-service",
    brokers: ["localhost:9092"]
});

export const producer = kafka.producer();

// 2. Renamed consumers so they are easy to read and debug
export const paymentConsumer = kafka.consumer({ groupId: "order-payment-group" });
export const inventoryConsumer = kafka.consumer({ groupId: "order-inventory-group" });

export const connectProducer = async () => {
    try {
        await producer.connect();
        console.log("Order Producer connected to Kafka");
    } catch (err) {
        console.log("Error connecting Producer:", err);
    }
}

export const connectConsumer = async () => {
    try {
        await paymentConsumer.connect();
        await inventoryConsumer.connect();
        console.log("Order Consumers connected to Kafka");

         await paymentConsumer.subscribe({ topic: "payment-events", fromBeginning: true });
        await inventoryConsumer.subscribe({ topic: "inventory-events", fromBeginning: true });

        await Promise.all([
            
            // --- CONSUMER 1: PAYMENT STATUS ---
            // 3. Added the missing payment consumer run block
            paymentConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    const eventData = JSON.parse(message.value.toString());
                    
                    // Add your payment success/failure logic here later
                    if (eventData.type === "PaymentProcessed" && eventData.data.status === "SUCCESS") {
                        console.log("Received payment update for order:", eventData.data.orderId);
                        const order = await prisma.order.findUnique({
                            where: { id: eventData.data.orderId }
                        });
                        if (!order) return;
                        await prisma.order.update({
                            where: { id: eventData.data.orderId },
                            data: { status: "PAID" }
                        });
                        console.log(`Order ${eventData.data.orderId} marked as PAID.`);
                       
                    }
                   if (eventData.type === 'PaymentProcessed' && topic === 'payment-events' && eventData.data.status === 'FAILED') {
                    const { orderId, userId } = eventData.data;

            
                    try {
                    const order = await prisma.order.findUnique({
                        where: { id: orderId },
                        include: { items: true } // CRITICAL: We need this to tell the Inventory Service what to restock!
                    });

                    if (!order) return;

                    await prisma.order.update({
                        where: { id: orderId },
                        data: { status: 'FAILED' }
                    });

                    console.log(`Order ${orderId} marked as FAILED due to payment decline.`);

                    // 3. Emit the OrderCancelled event with the missing items attached!
                    await producer.send({
                        topic: 'order-events',
                        messages: [{
                        value: JSON.stringify({
                            type: 'OrderCancelled',
                            data: {
                            orderId: orderId,
                            userId: userId, // Passed straight from the Payment Service
                            reason: 'PAYMENT_FAILED',
                            items: order.items // We just fetched these from the DB!
                            }
                        })
                        }]
                    });

                    } catch (error) {
                    console.error(`Error processing payment failure for Order ${orderId}:`, error);
                    throw error;
                    }
                }
        }
            }),

            // --- CONSUMER 2: INVENTORY EVENTS ---
            inventoryConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    const eventData = JSON.parse(message.value.toString());

                    if (eventData.type === "InventoryFailed") {
                        const { orderId, failedItems } = eventData.data;

                        // A. Fetch the order first to get the userId (needed for the email!)
                        const order = await prisma.order.findUnique({
                            where: { id: orderId }
                        });

                        if (!order) return; 

                        // B. Update the database status
                        await prisma.order.update({
                            where: { id: orderId },
                            data: { status: "FAILED" } // or "CANCELLED"
                        });
                        console.log(`Order ${orderId} marked as FAILED due to inventory shortage.`);

                    }
                }
            })
            
        ]); // End of Promise.all

    } catch (error) {
        console.error("Error connecting to the Kafka server", error);
    }
}