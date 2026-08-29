import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { examId } = await req.json()

        if (!examId) {
            return NextResponse.json({ error: "Missing exam context" }, { status: 400 })
        }

        /*
         * An exam id alone used to be enough. This route reads with the
         * service-role key, so anyone who could guess or obtain an id could
         * pull back another person's score and cognitive analysis. The caller
         * now has to be the student the exam belongs to.
         */
        const session = await createServerClient()
        const { data: { user } } = await session.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Not signed in" }, { status: 401 })
        }

        // 1. Fetch the completed exam data
        const { data: exam, error: fetchError } = await (supabase
            .from('mock_exams' as any) as any)
            .select(`
                *,
                projects ( name )
            `)
            .eq('id', examId)
            .single() as any

        if (fetchError || !exam) throw new Error("Could not find exam record")

        // Same 404 either way: "not yours" must not be distinguishable from
        // "does not exist", or this becomes a way to probe which ids are real.
        if (exam.student_id !== user.id) {
            return NextResponse.json({ error: "Could not find exam record" }, { status: 404 })
        }

        // 2. High-Fidelity Mock Autopsy Data
        const isPass = (exam.final_score || 0) >= 70
        
        const mockAnalysis = {
            executive_summary: isPass 
                ? "Excellent performance. You demonstrated a strong grasp of core scientific concepts and sanitation protocols. Your decision latency suggests high confidence in high-stakes domains."
                : "Performance indicates significant fragility in core scientific concepts. While your speed is adequate, accuracy in 'Chemical Services' is currently below the state-board safety threshold.",
            board_risks: isPass 
                ? [
                    "Minor latency spikes observed in 'Shaving & Hirsutism' domain.",
                    "Occasional overthinking on 'Licensing Rules' distractors."
                  ]
                : [
                    "Critical failure risk in 'Chemical Services' due to inconsistent pH scale mastery.",
                    "High probability of time-exhaustion if similar complexity is encountered on the real Board.",
                    "Mastery gap detected in 'Bacterial Motility' and 'Infection Control' terminology."
                  ],
            cognitive_breakthroughs: [
                "Strong performance under the 90-minute time constraint.",
                "High accuracy on 'Tool Disinfection' sequencing."
            ],
            certification_roadmap: isPass 
                ? [
                    "Review 'Hirsutism' terminology once more before the test.",
                    "Simulate one more high-stress session to lock in your timing.",
                    "Focus on maintaining this baseline of calm decision-making."
                  ]
                : [
                    "Mandatory 2-hour deep dive into 'Chemical Texturing' safety protocols.",
                    "Re-take the 'Scientific Concepts' mastery loop until 90% accuracy is reached.",
                    "Eliminate 'Rushed Decision' marker by slowing down on Multi-Step questions."
                  ]
        }

        // 3. Persist the mock analysis
        await (supabase
            .from('mock_exams' as any) as any)
            .update({ cognitive_analysis: mockAnalysis })
            .eq('id', examId)

        // Artificial delay to simulate "AI Thinking"
        await new Promise(resolve => setTimeout(resolve, 2000))

        return NextResponse.json({ success: true, analysis: mockAnalysis })

    } catch (err: any) {
        console.error("[MOCK EXAM AUTOPSY] Critical failure:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
