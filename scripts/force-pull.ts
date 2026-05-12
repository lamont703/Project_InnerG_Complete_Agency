import { AgentsClient } from "@google-cloud/dialogflow-cx";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function forcePull() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const agentId = "1778519997983"; // From your URL
  const locations = ["global", "us-central1", "us-west1", "us"];

  console.log(`🚀 Force Pulling Agent: ${agentId}...`);

  for (const location of locations) {
    console.log(`\nTrying Location: ${location}...`);
    try {
      const client = new AgentsClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        apiEndpoint: `${location}-dialogflow.googleapis.com`
      });

      const name = `projects/${projectId}/locations/${location}/agents/${agentId}`;
      const [agent] = await client.getAgent({ name });

      console.log(`✅ SUCCESS! Found Agent in ${location}:`);
      console.log(` - Display Name: ${agent.displayName}`);
      console.log(` - Full Name: ${agent.name}`);
      return; // Stop if we found it

    } catch (err: any) {
      console.log(`  Not in ${location}: ${err.message}`);
    }
  }
}

forcePull();
