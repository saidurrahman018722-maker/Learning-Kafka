import { Kafka } from "kafkajs";
import { sendRegistrationWelcomeEmail, sendOrderFailedForInventory } from "./email.js";
import paymentService from "../payment-service/src/services/paymentService.js";

const kafka = new Kafka({
    clientId: "Email-Service",
    brokers: ["localhost:9092"]
});

// 1. Define two separate consumers with distinct Group IDs
const registrationConsumer = kafka.consumer({ groupId: "user-registration-group" });
const inventoryConsumer = kafka.consumer({ groupId: "inventory-failed-group" });
const paymentConsumer = kafka.consumer({ groupId: "order-payment-group" });


export const connectConsumer = async () => {
    try {
        // 2. Connect and subscribe both consumers
        await registrationConsumer.connect();
        await inventoryConsumer.connect();
        console.log("Both Consumers connected with the Kafka server");

        await registrationConsumer.subscribe({ topic: "user-registration", fromBeginning: true });
        await inventoryConsumer.subscribe({ topic: "inventory-events", fromBeginning: true });
        await paymentConsumer.subscribe({ topic: "payment-events", fromBeginning: true });


        // 3. Run them concurrently using Promise.all
        // This prevents the first consumer.run() from blocking the second one!
        await Promise.all([
            
            // --- CONSUMER 1: WELCOME EMAILS ---
            registrationConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const events = JSON.parse(message.value.toString());
                        
                        if (events.action === "USER_REGISTERED") {
                            console.log(`Sending Welcome Email to ${events.email}`);
                            await sendRegistrationWelcomeEmail(events.email, events.name);
                        }
                    } catch (err) {
                        console.error("Error processing user registration event:", err);
                    }
                }
            }),

            // --- CONSUMER 2: INVENTORY FAILED EMAILS ---~
            inventoryConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const events = JSON.parse(message.value.toString());

                        // Notice we check the 'topic' variable provided by kafkajs, not 'events.topic'
                        if (events.type === 'InventoryFailed' && topic === 'inventory-events') {
                            const { orderId, userId, failedItems } = events.data;

                            console.log(`Fetching user details for User ID: ${userId}...`);
                            const response = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${userId}`);
                            
                            if (!response.ok) {
                                throw new Error(`User Service responded with status: ${response.status}`);
                            }

                            const userData = await response.json();

                            console.log(`Sending out-of-stock email to ${userData.email}`);
                            await sendOrderFailedForInventory(
                                userData.email,
                                userData.name, 
                                orderId,        
                                failedItems
                            );
                        }
                    } catch (error) {
                        console.error(`Failed to process notification for Order:`, error);
                        throw error; 
                    }
                }
            }),

            paymentConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const events = JSON.parse(message.value.toString());
                        if(events.type === 'PaymentProcessed' && events.data.status === 'SUCCESS'){
                            const respones = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${events.data.userId}`);
                            if(!respones.ok) return;
                            const user = JSON.parse(respones);
                            await sendPaymentSuccessfulEmail(user.email, events.data.orderId);
                        }
                         if(events.type === 'PaymentProcessed' && events.data.status === 'FAILED'){
                            const respones = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${events.data.userId}`);
                            if(!respones.ok) return;
                            const user = JSON.parse(respones);
                            await sendPaymentFailedEmail(user.email, events.data.orderId);
                        }
                    } catch (err) {
                        console.error("Error processing payment event:", err);
                    }
                }
            })
        ]);

    } catch (err) {
        console.error("Error initializing Kafka consumers:", err);
    }
};