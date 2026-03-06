import * as z from "zod"

export const loginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid work email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
})

export const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Please enter your registered work email address." }),
})

export const resetPasswordSchema = z.object({
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Please confirm your new password." }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
})

export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
