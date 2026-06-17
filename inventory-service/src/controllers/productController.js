import { prisma } from "../config/bd.js";

export const createProduct = async (req,res)=>{
    const {name,sku,price,stockQuantity} = req.body;
    const product = await prisma.product.create({
        data:{
            name,
            sku,
            price,
            stockQuantity
        }
    });
    res.status(200).json({
        message:"Product created successfully",
        product
    });
    


}