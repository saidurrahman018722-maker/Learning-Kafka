import express from "express"
import {config} from "dotenv"
import { connectDB } from "./src/config/db.js"
import { connectProducer,connectConsumer } from "./src/utils/kafka.js"
import orderRoutes from "./src/routes/orderRoutes.js"


config()
connectDB();
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use("/order",orderRoutes);


app.listen(process.env.PORT,()=>{
    console.log(`the server is running on port ${process.env.PORT}`)

})
await connectProducer();
await connectConsumer();