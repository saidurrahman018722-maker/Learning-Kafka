import {prisma} from "../config/db.js";
import jwt from "jsonwebtoken";


export const authMiddleware = async (req,res,next)=>{
    try{
        let token;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
         token = req.headers.authorization.split(" ")[1];
    }
    const decoded = jwt.verify(token,process.env.JWT_ACCESS_SECRET);
    const user = await prisma.user.findUnique({
        where:{
            id:decoded.id,
            sessionRevoked:false
        }
    });
    if(!user){
        return res.status(400).json({message:"User not found"});
    }
    req.user = user;
    next();
    }catch(error){
        return res.status(400).json({message:"Invalid token"});
    
    }

    }