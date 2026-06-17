import {Kafka} from "kafkajs"
import  {sendRegistrationWelcomeEmail} from "./email.js"


const kafka = new Kafka({
    clientId:"Email-Service",
    brokers:["localhost:9092"]
})

const consumer = kafka.consumer({groupId:"user-registration"});
const consumer_1 = kafka.consumer({groupId:"Order-Quantity-failed"});

export const connectConsumer = async ()=>{
    try{
    await consumer.connect();
    await consumer_1.connect();
    console.log("Consumer connected with the kafka server");
    await consumer.subscribe({topic:"user-registration",fromBeginning: true});
    await consumer_1.subscribe({topic:"inventory-events",fromBeginning: true});
    await consumer.run({
        eachMessage:async ({topic,partition,message})=>{
            try{
                const rowData = message.value.toString();
                const events = JSON.parse(rowData);
                console.log(rowData);
                if(events.action === "USER_REGISTERED" && topic==="user-registration"){
                    await sendRegistrationWelcomeEmail(events.email,events.name);
                }
                if (events.type === 'InventoryFailed' && events.topic=== 'inventory-events') {
                const { orderId, userId, failedItems } = events.data;

                try {
                    console.log(`Fetching user details for User ID: ${userId}...`);
                    
                    // 1. Synchronous API Call to User Service
                    const response = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${userId}`);
                    
                    if (!response.ok) {
                    throw new Error(`User Service responded with status: ${response.status}`);
                    }

                    const userData = await response.json();

                    // 2. We now have the email! Send the notification.
                    console.log(`Sending out-of-stock email to ${userData.email}`);
                    
                    await sendOrderFailedForInventory(
                    userData.email,
                    userData.name, // Fetched from API
                    orderId,        // From Kafka
                    failedItems     // From Kafka
                    );

                } catch (error) {
                    console.error(`Failed to process notification for Order ${orderId}:`, error);
                throw error;
          }
        }
            }catch(err){
                console.log("Error connecting to the kafka server",err);
            }
        }
    })
    }catch(err){
        console.log("Error connecting to the kafka server",err);
    }
    

}

