import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

await config({ path: ".env.local", export: true })
const geminiApiKey = Deno.env.get("GEMINI_API_KEY")

const repStr = "Unknown Director"
const schoolName = "Inner G Complete Agency"

const emailOutreachPrompt = `You are Lamont from Inner G Complete Agency, a professional barber and cosmetology career placement coordinator.
Write a brief, professional outreach email to barber school ${repStr} at ${schoolName}.
The purpose of this email is ONLY to ask if they have any students graduating this month who would be available and interested in working at nearby barbershops.
Do NOT mention any student names. Do NOT pitch or reference any specific barbershop yet.
Simply introduce Inner G Complete Agency as a barber placement service and ask if they have active graduates available this month.
Keep it concise, warm, and professional. Format EXACTLY as:
Subject: [subject line]
Body: [email body]`

const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: emailOutreachPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1500,
    }
  })
})

const data = await response.json()
console.log("RAW GEMINI RESPONSE:\n", JSON.stringify(data, null, 2))
console.log("TEXT:\n", data.candidates?.[0]?.content?.parts?.[0]?.text)
