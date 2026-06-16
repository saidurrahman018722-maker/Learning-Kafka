
import jwt from "jsonwebtoken";


export const generateRfreshToken = async (userId,res)=>{
    const payload = {id:userId}
    const token = jwt.sign(payload,process.env.JWT_SECRET,{
        expiresIn:"7d"    
    })
    res.cookie("refreshToken",token,{
        httpOnly:true,
        secure:process.env.NODE_ENV!=="development",
        sameSite:"strict",
        maxAge:7*24*60*60*1000
    })
    return token;
}