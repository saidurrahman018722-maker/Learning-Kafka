import {prisma} from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { generateRfreshToken } from "../utils/generateRefreshToken.js";

export const register = async (req,res)=>{
    const {name,email,password} = req.body;
    const userExits = await prisma.user.findUnique({
        where:{
            email
        }
    });
    if(userExits){
        return res.status(400).json({message:"User already exists"});
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);
    let user = await prisma.user.create({
        data:{
            name,
            email,
            password:hashedPassword
        }
    });
    const refreshToken = await generateRfreshToken(user.id,res);
    const hasshedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    user = await prisma.user.update({
        where:{
            id:user.id
        },
        data:{
            refreshToken:hasshedRefreshToken
        }
    })
    const acessToken = jwt.sign({id:user.id},process.env.JWT_ACCESS_SECRET,{
        expiresIn:"1d"
    })

    res.status(200).json({
        message:"User created successfully",
        user,
        acessToken
    })
}


export const login = async (req,res)=>{
    const {email,password} = req.body;
    const user = await prisma.user.findUnique({
        where:{
            email
        }
    });
    if(!user){
        return res.status(400).json({message:"Invalid credentials"});
    }
    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
        return res.status(400).json({message:"Invalid credentials"});
    }
    const refreshToken = await generateRfreshToken(user.id,res);
    const hasshedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await prisma.user.update({
        where:{
            id:user.id
        },
        data:{
            refreshToken:hasshedRefreshToken
        }
    })
    const acessToken = jwt.sign({id:user.id},process.env.JWT_ACCESS_SECRET,{
        expiresIn:"1d"
    })
    res.status(200).json({
        message:"User logged in successfully",
        user,
        acessToken
    })
}

export const logout = async (req,res)=>{
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        return res.status(400).json({message:"No refresh token found"});
    }
    const hasshedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await prisma.user.update({
        where:{
            refreshToken:hasshedRefreshToken,
            sessionRevoked:false
        },
        data:{
            refreshToken:null,
            sessionRevoked:true
        }
    })
    res.clearCookie("refreshToken",{
        httpOnly:true,
        secure:process.env.NODE_ENV!=="development",
        sameSite:"strict",
    });
    res.status(200).json({message:"User logged out successfully"});
}

export const accessToken = async (req,res)=>{
    const refreshToken = req.cookies.refreshToken;
    const hasshedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const user = await prisma.user.findUnique({
        where:{
            refreshToken:hasshedRefreshToken,
            sessionRevoked:false
        }
    });
    if(!user){
        return res.status(400).json({message:"Invalid refresh token"});
    }
    const newRefreshToken = await generateRfreshToken(user.id,res);
    const newHasshedRefreshToken = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    await prisma.user.update({
        where:{
            id:user.id
        },
        data:{
            refreshToken:newHasshedRefreshToken
        }
    })
    const accessToken = jwt.sign({id:user.id},process.env.JWT_ACCESS_SECRET,{
        expiresIn:"1d"
    })
    res.status(200).json({
        message:"Access token generated successfully",
        accessToken
    })

}


export const profile = async (req,res)=>{
    const user = await prisma.user.findUnique({
        where:{
            id:req.user.id
        }
    });
    if(!user){
        return res.status(400).json({message:"User not found"});
    }
    res.status(200).json({
        message:"User profile fetched successfully",
        user
    })
}
