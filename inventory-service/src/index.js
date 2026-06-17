import express from "express"
import {config} from "dotenv"
import { connectProducer,connectConsumer } from "./src/utils/kafka.js"

config()
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use("/products",productRoutes);


app.listen(process.env.PORT,()=>{
    console.log(`the server is running on port ${process.env.PORT}`)

})
await connectProducer();
await connectConsumer();