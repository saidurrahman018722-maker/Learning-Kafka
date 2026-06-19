import express from "express"
import { createIntent, handleWebhook } from "../controllers/paymentController.js";
import { validateRequest } from "../middlewares/validateRequest.js"
import { PaymentSchema } from "../validators/paymentValidator.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";




const router = express.Router();

router.post('/create-intent',express.json(),authMiddleware,validateRequest(PaymentSchema),createIntent);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;