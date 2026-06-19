
import jwt from "jsonwebtoken";



export const authMiddleware = async (req,res,next)=>{
    try{
        let token;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
         token = req.headers.authorization.split(" ")[1];
    }
    const decoded = jwt.verify(token,process.env.JWT_ACCESS_SECRET);
    const response = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${decoded.id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
       
        if(!response.ok) {
            console.log("User Service rejected the request. Status Code:", response.status);
            return res.status(response.status).json({ message: "User Service error" });
        }
    const user = await response.json();
    if(!user){
        return res.status(400).json({message:"User not found"});
    }
    req.user = user;
    next();
    }catch(error){
        console.log("invalid token from the order middleware.")
        return res.status(400).json({message:"Invalid token"});
    
    }

    }