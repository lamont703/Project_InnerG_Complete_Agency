"use client"

import { useParams } from "next/navigation"
import { MockExamConsole } from "@/features/student/components/MockExamConsole"

/**
 * The dashboard's mock exam.
 *
 * The console itself moved to features/student/components/MockExamConsole so
 * /account/mock-exam can render the same one. This route is the project-bound
 * entry point and nothing else — the behaviour here is unchanged.
 */
export default function MockExamPage() {
    const params = useParams()
    return <MockExamConsole projectSlug={params?.slug as string} />
}
