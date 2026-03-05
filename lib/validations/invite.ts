import * as z from "zod"

export const inviteSchema = z.object({
    email: z.string().email({ message: "Please enter a valid work email address." }),
    intended_role: z.enum(["developer", "client_admin", "client_viewer"], {
        errorMap: () => ({ message: "Please select a valid intended role." }),
    }),
    client_id: z.string().uuid().optional().nullable(),
})

export type InviteInput = z.infer<typeof inviteSchema>

export const acceptInviteSchema = z.object({
    full_name: z.string().min(2, { message: "Full name is required." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Please confirm your password." }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
})

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
