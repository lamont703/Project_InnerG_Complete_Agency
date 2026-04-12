import * as z from "zod"

export const leadSchema = z.object({
    full_name: z.string().min(2, { message: "Full name is required." }),
    email: z.string().email({ message: "Please enter a valid work email address." }),
    phone: z.string().min(10, { message: "Phone number is required (at least 10 digits)." }),
    company_name: z.string().min(2, { message: "Company name is required." }),
    project_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
    project_type: z.string().min(1, { message: "Please select a primary tech focus." }),
    budget_range: z.string().min(1, { message: "Please select your budget." }),
    project_stage: z.string().min(1, { message: "Please select your timeline depth." }),
    industry: z.string().min(2, { message: "Please define your industry." }),
    challenge: z.string().optional(),
})

export type LeadInput = z.infer<typeof leadSchema>
