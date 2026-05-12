import { z } from "zod"

export const portalSchema = z.object({
    // Client Details
    clientName: z.string().min(2, "Client name must be at least 2 characters"),
    industry: z.enum([
        "barbering",
        "cosmetology",
        "wellness",
        "other"
    ], {
        required_error: "Please select an industry",
    }),
    primaryContactName: z.string().min(2, "Primary contact name is required"),
    primaryContactEmail: z.string().email("Invalid email address"),
    ghlLocationId: z.string().optional().nullable(),

    // Project Details
    projectName: z.string().min(2, "Project name must be at least 2 characters"),
    slug: z.string()
        .min(2, "Slug must be at least 2 characters")
        .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be URL-safe (lowercase letters, numbers, and hyphens)"),
    projectType: z.string().min(2, "Project type is required"),
})

export type PortalInput = z.infer<typeof portalSchema>
