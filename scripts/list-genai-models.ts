import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listModels() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "gen-lang-client-0027817397";
  const location = "us-west1";

  console.log(`🕵️ Scanning Project ${projectId} for Models in ${location}...`);

  try {
    const genAI = new GoogleGenAI({
      project: projectId,
      location: location,
    });

    const models = await genAI.models.list();
    console.log("✅ RESPONSE RECEIVED:");
    console.log(JSON.stringify(models, null, 2));
  } catch (err: any) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

listModels();
