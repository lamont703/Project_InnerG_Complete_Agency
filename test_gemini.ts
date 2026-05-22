import "https://deno.land/std@0.167.0/dotenv/load.ts";

const geminiKey = Deno.env.get("GEMINI_API_KEY")!
async function generateAiMessage(prompt: string, geminiApiKey: string, maxTokens = 500): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
      }),
    }
  )
  const data = await response.json()
  console.log(JSON.stringify(data, null, 2))
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

const formattedThread = `[2026-05-21] Shop Owner: I got two chairs open and we do booth rent
[2026-05-21] Lamont (Agent): Excellent! Two open chairs with a booth rent setup sounds like a fantastic opportunity for our graduating barbers. To help me find the perfect fit, could you share what the monthly booth rent is?
[2026-05-21] Shop Owner: $600
[2026-05-21] Shop Owner: Booth rent is only $500
[2026-05-21] Shop Owner: And we do commission`

const extractionPrompt = `You are a CRM data extraction engine for a barber placement agency.
Review the FULL conversation thread below and extract the most up-to-date values for these 5 fields.
If a field has not been explicitly mentioned in the conversation, output null for that field.

Full conversation:
${formattedThread}

Respond with ONLY raw JSON (no markdown, no explanation). Use this exact schema:
{
  "hiring_need": boolean,
  "rent_type": "Commission|Booth Rent|Unknown",
  "rent_rate": "string (e.g. '$150/week' or '60/40 split') or null",
  "specialty_desired": "string or null",
  "booth_count_available": "number (the amount of open chairs) or null"
}`

generateAiMessage(extractionPrompt, geminiKey)
