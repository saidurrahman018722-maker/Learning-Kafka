import express from "express"
import {config} from "dotenv"
import authRoutes from "../src/routes/AuthRouters.js"
import { connectProducer } from "./utils/kalfka.js"

config()
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/auth',authRoutes);


app.listen(process.env.PORT,()=>{
    console.log(`the server is running on port ${process.env.PORT}`)

})
await connectProducer();

