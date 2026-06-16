import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });


export const connectDB = async () => {
    try{
        await prisma.$connect();
        console.log("the DB is connected.")
    }
    catch(error){
        console.log(error);
        process.exit(1);
    }
}

export const disconnectDB = async () => {
    try{
        await prisma.$disconnect();
        console.log("the DB is disconnected.")
        process.exit(0);
    }
    catch(error){
        console.log(error);
        process.exit(1);
    }
}
