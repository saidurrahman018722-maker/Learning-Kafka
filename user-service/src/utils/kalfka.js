import {Kafka} from "kafkajs";

const kafka = new Kafka({
    clientId:"User-Service",
    brokers:["localhost:9092"]
})

export const producer = kafka.producer();

export const connectProducer = async ()=>{
    try{
    await producer.connect();
    console.log("Producer connected with the kafka server");

    }catch(err){
        console.log("Error connecting to the kafka server",err);
    }

}