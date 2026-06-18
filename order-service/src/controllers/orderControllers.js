import { prisma } from "./config/db.js";
import { consumer,producer } from "../utils/kafka.js";


export const createOrder = async (req,res)=>{
    const {total,items} = req.body;
    const order = await prisma.order.create({
    data: {
        total,
        userId: req.user.id,
        items: { 
        createMany: {
            data: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            })),
        },
        },
    },
    include: {
    items: true, 
    },
    });

    const payload_1={
        orderId:order.id,
        userId:req.user.id,
        total:order.total,
        status:order.status
    }
    const payload_2 = {
        orderId:order.id,
        userId:req.user.id,
        status:order.status,
        items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity }))
    }

    try{
    await producer.send({
        topic:"order-created",
        messages:[{
            key:order.id,
            value:JSON.stringify({type:"OrderCreated",data:payload_2})
        }]
    })
    }catch(err){
    console.log("error sending the create-Order",err);
    return res.status(500).json({message:"error sending the create-Order"});
    
    }



    //we have to run a consumer to check in the inventory server has given us the green flag(it has appropeate amount of quantity) so now we can procced to payment
      
    try {
        await producer.send({
            topic:"go-to-payment",
            messages:[{
                key:order.id,
                value:JSON.stringify(payload_1)
            }]
        })
    } catch (error) {
        console.log("error sending the create-Order",error);
        return res.status(500).json({message:"error sending the create-Order"});
    }

    res.status(200).json({
        message:"Order created successfully",
        order
    })
}



const getAllOrders = async (req,res)=>{
    const orders = await prisma.order.findMany({
        where:{
            userId:req.user.id
        },
        include:{
            items:true
        }
    })
    res.status(200).json({
        message:"Orders fetched successfully",
        orders
    })

}


const getOrderById = async (req,res)=>{
    const {id} = req.params;
    const order = await prisma.order.findUnique({
        where:{
            id,
        }
    })
    res.status(200).json({
        message:"Order fetched successfully",
        order
    })

}