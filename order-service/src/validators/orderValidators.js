import {z} from "zod"

export const orderSchema = z.object({
  // No orderId here!
  total: z.number().positive("Total must be a positive number"),
  items: z.array(z.object({
    productId: z.number().int(), 
    quantity: z.number().int().positive("Quantity must be a positive integer")
  })).min(1, "Order must have at least one item")
});