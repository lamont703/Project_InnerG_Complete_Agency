import * as z from "zod"

export const leadSchema = z.object({
    full_name: z.string().min(2, { message: "Full name is required." }),
    email: z.string().email({ message: "Please enter a valid work email address." }),
    phone: z.string().min(10, { message: "Phone number is required (at least 10 digits)." }),
    company_name: z.string().min(2, { message: "Company name is required." }),
    challenge: z.string().optional(),
})

export type LeadInput = z.infer<typeof leadSchema>
