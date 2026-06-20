import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
    try {
        // 1. Check if the header even exists
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log("🚨 MIDDLEWARE BLOCKED: No authorization header provided!");
            return res.status(401).json({ message: "No authorization header provided" });
        }

        // 2. Check if it is formatted correctly
        if (!authHeader.startsWith("Bearer ")) {
            console.log("🚨 MIDDLEWARE BLOCKED: Header missing 'Bearer ' prefix ->", authHeader);
            return res.status(401).json({ message: "Invalid token format. Must be 'Bearer <token>'" });
        }

        // 3. Extract the token
        const token = authHeader.split(" ")[1];
        console.log("🕵️ THE IMPOSTER TOKEN IS:", token);
        if (!token) {
            console.log("🚨 MIDDLEWARE BLOCKED: Token string is empty!");
            return res.status(401).json({ message: "Token is empty" });
        }

        // 4. Verify the token mathematically
        // ⚠️ WARNING: Ensure your User Service signed the token with 'JWT_ACCESS_SECRET' and not 'JWT_SECRET'!
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        
        // 5. Ask User Service for the profile
        const response = await fetch(`${process.env.USER_SERVICE_URL}/auth/profile/${decoded.id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
       
        if (!response.ok) {
            console.log("🚨 MIDDLEWARE BLOCKED: User Service rejected the request. Status:", response.status);
            return res.status(response.status).json({ message: "User Service error" });
        }
        
        const user = await response.json();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        req.user = user;
        next();
        
    } catch (error) {
        // 🚨 THIS IS THE MAGIC LOG! It will tell you exactly why JWT failed.
        console.log("🚨 MIDDLEWARE CRASHED:", error.message);
        return res.status(403).json({ message: "Invalid token", error: error.message });
    }
};