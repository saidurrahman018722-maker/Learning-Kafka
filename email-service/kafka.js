import {Kafka} from "kafkajs"
import  {sendRegistrationWelcomeEmail} from "./email.js"


const kafka = new Kafka({
    clientId:"Email-Service",
    brokers:["localhost:9092"]
})

const consumer = kafka.consumer({groupId:"user-registration"});

export const connectConsumer = async ()=>{
    try{
    await consumer.connect();
    console.log("Consumer connected with the kafka server");
    await consumer.subscribe({topic:"user-registration",fromBeginning: true});
    await consumer.run({
        eachMessage:async ({topic,partition,message})=>{
            try{
                const rowData = message.value.toString();
                const events = JSON.parse(rowData);
                console.log(rowData);
                if(events.action === "USER_REGISTERED" && topic==="user-registration"){
                    await sendRegistrationWelcomeEmail(events.email,events.name);
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

