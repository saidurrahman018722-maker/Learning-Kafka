import {z} from "zod"

export const orderSchema = {
  OrderCreated: z.object({
    orderId: z.string().uuid(),
    total: z.number("Total must be a positive number").positive(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number("Quantity must be a positive integer").int().positive("Quantity must be a positive integer")
    })).min(1,"Order must have at least one item") 
  }),
};