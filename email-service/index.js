import express from "express"
import {config} from "dotenv"
import { connectConsumer } from "./kafka.js";



config()
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.listen(process.env.PORT,()=>{
    console.log(`the server is running on port ${process.env.PORT}`);
     
})
await connectConsumer();

