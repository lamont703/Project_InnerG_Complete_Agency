const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: 'hello'
    });
    console.log('Success text-embedding-004:', res.embeddings[0].values.length);
  } catch (e) {
    console.error('Error text-embedding-004:', e.message);
  }
}
run();
