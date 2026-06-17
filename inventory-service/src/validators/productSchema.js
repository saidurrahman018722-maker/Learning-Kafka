import {z} from "zod";


export const CreateProductSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters long" }),
  sku: z.string().min(3, { message: "SKU is required" }),
  price: z.number().positive({ message: "Price must be greater than 0" }),
  stockQuantity: z.number().int().min(0, { message: "Initial stock cannot be negative" }),
});