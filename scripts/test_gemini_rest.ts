async function test() {
  const key = Deno.env.get("GEMINI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "What is the instagram handle for Buzzards Barbershop in Houston 77070? Return only the @handle. Search the web." }] }],
      tools: [{ googleSearch: {} }]
    })
  });
  const data = await res.json();
  console.log(data.candidates?.[0]?.content?.parts?.[0]?.text);
}
test();
