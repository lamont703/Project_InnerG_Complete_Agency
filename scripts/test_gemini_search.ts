import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  tools: [{ googleSearch: {} }]
});

async function test() {
  try {
    const result = await model.generateContent("What is the instagram handle for Buzzards Barbershop in Houston 77070? Return only the handle.");
    console.log(result.response.text());
  } catch(e) {
    console.error(e);
  }
}
test();
