import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

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

        const { studentId, projectId, predictedScore } = await req.json()

        if (!studentId || !projectId) {
            return NextResponse.json({ error: "Missing identity context" }, { status: 400 })
        }

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
                project_id: projectId,
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
