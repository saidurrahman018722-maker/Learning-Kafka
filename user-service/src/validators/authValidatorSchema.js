import z, { email } from 'zod'
import { encodeAsync } from 'zod/v4/core'


export const  registerSchema = z.object({
    name:z.string("Name Required.").trim().min(3,"Name must be at least 3 characters long").max(50,'Name must be at most 50 characters long'),
    email:z.string("Invalid email").email('Invalid email address'),
    password:z.string("Invalid password").min(6,"Password must be at least 6 characters long").max(50,"Password must be at most 50 characters long")
}) 

export const loginSchema = z.object({
    email:z.string("Invalid email").email('Invalid email address'),
    password:z.string().min(6,"Password must be at least 6 characters long").max(50,"Password must be at most 50 characters long")

})