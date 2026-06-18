import { Kafka } from "kafkajs";
// import { prisma } from "../config/db.js"; // Uncomment if you have a Payment DB schema

const kafka = new Kafka({
    clientId: "payment-service",
    brokers: ["localhost:9092"]
});

export const producer = kafka.producer();
export const paymentConsumer = kafka.consumer({ groupId: "payment-service-group" });

export const connectProducer = async () => {
    try {
        await producer.connect();
        console.log("Payment Producer connected to Kafka");
    } catch (err) {
        console.error("Error connecting Payment Producer:", err);
    }
};

export const connectConsumer = async () => {
    try {
        await paymentConsumer.connect();
        console.log("Payment Consumer connected to Kafka");

        // The Payment Service waits for the Inventory to be successfully reserved
        await consumer.subscribe({ topic: "start-payment", fromBeginning: true });

    } catch (error) {
        console.error("Error connecting Payment Consumer:", error);
    }
};