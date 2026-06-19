import { z } from 'zod';

export const PaymentSchema =  z.object({
    orderId: z.string().uuid({ message: "Invalid Order ID format" }),
  })

