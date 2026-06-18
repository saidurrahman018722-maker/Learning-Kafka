import { z } from 'zod';

export const PaymentSchema =  z.object({
    orderId: z.string().uuid({ message: "Invalid Order ID format" }),
    amount: z.number().positive({ message: "Amount must be greater than 0" }),
    currency: z.string().length(3).default("USD")
  })

