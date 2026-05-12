import { PlaybooksClient } from "@google-cloud/dialogflow-cx";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listPlaybooks() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER; // 1022222320701
  const location = process.env.GOOGLE_CLOUD_LOCATION;   // us-west1
  const agentId = process.env.GOOGLE_CLOUD_AGENT_ID;     // 1778519997983

  console.log(`🕵️ Scanning Agent ${agentId} for Playbooks...`);

  try {
    const client = new PlaybooksClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      apiEndpoint: `${location}-dialogflow.googleapis.com`
    });

    const parent = `projects/${projectId}/locations/${location}/agents/${agentId}`;
    const [playbooks] = await client.listPlaybooks({ parent });

    if (playbooks.length === 0) {
      console.log(`  No Playbooks found. This might be a standard Flow-based agent.`);
    } else {
      console.log(`✅ FOUND ${playbooks.length} PLAYBOOKS!`);
      playbooks.forEach(p => {
        console.log(` - Display Name: ${p.displayName}`);
        console.log(` - ID: ${p.name}`);
      });
    }
  } catch (err: any) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

listPlaybooks();
