import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// PSI State Board Blueprint (Approximate Weights for 100 Questions)
const BLUEPRINT = [
    { domain: 'sanitation_disinfection_safety', count: 30 },
    { domain: 'shaving_face_hirsutism', count: 20 },
    { domain: 'haircutting_hairstyling', count: 20 },
    { domain: 'chemical_services_safety', count: 20 },
    { domain: 'licensing_rules_regulations', count: 10 }
]

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        /*
         * IDENTITY COMES FROM THE SESSION, NEVER THE BODY.
         *
         * This route holds the service-role key, which bypasses RLS. It used
         * to take `studentId` from the request JSON, so any caller could POST
         * someone else's user id and open a mock exam in their name — and the
         * row would look, to every policy and report downstream, exactly like
         * one they sat themselves.
         *
         * Any studentId still in the body is ignored rather than rejected, so
         * an older client that keeps sending it does not break.
         */
        const session = await createServerClient()
        const { data: { user } } = await session.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Not signed in" }, { status: 401 })
        }
        const studentId = user.id

        const { projectId = null, predictedScore } = await req.json()
        /*
         * projectId is OPTIONAL. mock_exams.project_id has been nullable since
         * migration 165 — it was only this guard that made a dashboard project
         * mandatory, which is what kept the exam locked inside a portal.
         */

        // 1. Generate the 100-Question Blueprint
        let allQuestions: any[] = []

        for (const target of BLUEPRINT) {
            const { data: questions } = await supabase
                .from('question_bank')
                .select('*')
                .eq('is_verified', true)
                .eq('is_active', true)
                .ilike('domain', `%${target.domain}%`)
                .order('random()') // Random selection within domain
                .limit(target.count)
            
            if (questions) {
                allQuestions = [...allQuestions, ...questions]
            }
        }

        // 2. Fallback: If we don't have enough questions in specific domains, fill with general ones
        if (allQuestions.length < 100) {
            const needed = 100 - allQuestions.length
            const existingIds = allQuestions.map(q => q.id)
            
            const { data: filler } = await supabase
                .from('question_bank')
                .select('*')
                .eq('is_verified', true)
                .eq('is_active', true)
                .not('id', 'in', `(${existingIds.join(',')})`)
                .limit(needed)
            
            if (filler) allQuestions = [...allQuestions, ...filler]
        }

        // 3. Shuffle the final 100 to mix domains
        const shuffledBlueprint = allQuestions.sort(() => Math.random() - 0.5)

        // 4. Persist the Mock Exam Session
        const { data: exam, error } = await (supabase
            .from('mock_exams' as any) as any)
            .insert({
                student_id: studentId,
                project_id: projectId ?? null,
                status: 'started',
                questions: shuffledBlueprint,
                predicted_score: parseInt(predictedScore) || 0,
                time_limit_minutes: 90
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ 
            success: true, 
            examId: exam.id,
            questions: shuffledBlueprint,
            startedAt: exam.started_at
        })

    } catch (err: any) {
        console.error("[MOCK EXAM INIT] Critical failure:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
