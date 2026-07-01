const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.listModels();
    for await (const m of response) {
      if (m.name.includes('embedding')) {
         console.log(m.name);
      }
    }
  } catch (e) {
    console.error('Error listModels:', e.message);
  }
}
run();
