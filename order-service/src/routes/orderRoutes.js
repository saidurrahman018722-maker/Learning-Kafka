import expess from "express"
import { createOrder, getAllOrders, getOrderById } from "../controllers/orderControllers.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { orderSchema } from "../validators/orderValidators.js";

const router = expess.Router();

router.post("/create-order",authMiddleware,validateRequest(orderSchema),createOrder);
router.get("/get-all-orders",authMiddleware,getAllOrders);
router.get("/get-order/:id",authMiddleware,getOrderById);

export default router;