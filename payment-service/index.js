import express from "express"
import { config } from "dotenv"
import { connectDB,disconnectDB} from "./src/config/db.js"
import paymentRoutes from "./src/routes/payment.js"
import { connectProducer } from "./src/utils/kafka.js";
import { connectConsumer } from "./src/utils/kafka.js";

config();
connectDB();
const app = express();
app.use("/payment",paymentRoutes);
app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.listen(process.env.PORT,async()=>{
    console.log(`the server is running on port ${process.env.PORT}`);
    await connectDB();
})

await connectProducer();
await connectConsumer();