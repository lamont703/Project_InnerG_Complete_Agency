const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: 'hello'
    });
    console.log('Success gemini-embedding-2:', res.embeddings[0].values.length);
  } catch (e) {
    console.error('Error gemini-embedding-2:', e.message);
  }
}
run();
