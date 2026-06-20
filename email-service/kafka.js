import { Kafka } from "kafkajs";
import { sendRegistrationWelcomeEmail, sendOrderFailedForInventory,sendPaymentFailedEmail,sendPaymentSuccessfulEmail } from "./email.js";
import paymentService from "../payment-service/src/services/paymentService.js";


const kafka = new Kafka({
    clientId: "Email-Service",
    brokers: ["localhost:9092"]
});

// 1. Define two separate consumers with distinct Group IDs
const registrationConsumer = kafka.consumer({ groupId: "user-registration-group" });
const inventoryConsumer = kafka.consumer({ groupId: "inventory-failed-group" });
const paymentConsumer = kafka.consumer({ groupId: "email-payment-group" });


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
                            const { orderId, userId, failedItems,token } = events.data;

                            console.log(`Fetching user details for User ID: ${userId}...`);
                            const response = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${userId}`,{
                                method:"GET",
                                headers:{
                                    "Authorization": `Bearer ${token}`
                                }
                            });
                            
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
            const eventData = JSON.parse(message.value.toString());

            // 1. Only listen for Payment events
            if (eventData.type === 'PaymentProcessed') {
                const { orderId, userId, status, token } = eventData.data;

                console.log(`\n EMAIL SERVICE HEARD EVENT: PaymentProcessed`);
                console.log(` Order: ${orderId} | User: ${userId} | Status: ${status}`);

                if (!userId) {
                    console.error("🚨 ERROR: Cannot send email because userId is missing!");
                    return;
                }

                // 2. Fetch User Data (Do this ONCE for both Success and Failure)
                console.log(` Fetching email address for user: ${userId}...`);
                const response = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${userId}`,{
                    method:'GET',
                    headers:{
                         "Authorization": `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    console.error(`🚨 ERROR: User Service responded with status ${response.status}`);
                    return;
                }

                // THE FIX: Use await response.json() instead of JSON.parse()
                const user = await response.json();

                if (!user.email) {
                    console.error("ERROR: User profile does not contain an email address!");
                    return;
                }

                // 3. Route to the correct email template
                // (Checking for both 'SUCCESS' and 'PAID' just in case!)
                if (status === 'SUCCESS' || status === 'PAID') {
                    console.log(` Sending Success Email to: ${user.email}...`);
                    await sendPaymentSuccessfulEmail(user.email, orderId);
                    console.log(` Success Email officially sent!`);
                } 
                else if (status === 'FAILED') {
                    console.log(` Sending Failed Email to: ${user.email}...`);
                    await sendPaymentFailedEmail(user.email, orderId);
                    console.log(`Failed Email officially sent!`);
                } 
                else {
                    console.log(`⏭️ Ignored: Unknown status '${status}'.`);
                }
            }
            
        } catch (err) {
            console.error(" EMAIL SERVICE CRASHED:", err);
        }
    }
})
        ]);

    } catch (err) {
        console.error("Error initializing Kafka consumers:", err);
    }
};