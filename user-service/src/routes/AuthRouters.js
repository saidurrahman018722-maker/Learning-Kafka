import express from "express";
import { register,login,logout,profile } from "../controllers/authControllers.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";


const router = express.Router();




router.post("/register",register);
router.post("/login",login);
router.patch('/logout',logout);
router.get('/profile',authMiddleware,profile);


export default router;