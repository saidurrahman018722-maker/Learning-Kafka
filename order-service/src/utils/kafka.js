import {Kafka} from "kafkajs";

const kafka = new Kafka({
    clientId:"order-service",
    brokers:["localhost:9092"]
})
export const producer = kafka.producer();
export const consumer = kafka.consumer({groupId:"order-service"});

export const connectProducer = async ()=>{
    try{
    await producer.connect();
    console.log("Producer connected with the kafka server");

    }catch(err){
        console.log("Error connecting to the kafka server",err);
    }
}

export const connectConsumer = async ()=>{
    try{
    await consumer.connect();
    console.log("Consumer connected with the kafka server");

    //form the payment service
    await consumer.subscribe({topic:"paymentStatus",fromBeginning: true});
    //from the inventory service
    await comsumer.subscribe({topic:"insufficient-quantity",fromBeginning: true})
    }
    catch(error){
        console.log("Error connecting to the kafka server",error);
    }
    
}