import express from "express"
import { CreateProductSchema } from "../validators/productSchema.js";



const router = express.Router();

// router.post("/create-product",authMiddleware,validateRequest(CreateProductSchema),createProduct);
// router.get("/get-all-product",authMiddleware,getAllProducts);
// router.get("/get-product/:id",authMiddleware,getProductById);

export default router;