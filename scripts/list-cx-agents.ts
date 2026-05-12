import { AgentsClient } from "@google-cloud/dialogflow-cx";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listAgents() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
  const locations = ["us-central1", "us-east1", "global", "us-west1"];

  console.log(`🕵️ Scanning for Agents in Project: ${projectId}...`);

  for (const location of locations) {
    console.log(`\nChecking Location: ${location}...`);
    try {
      const client = new AgentsClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        apiEndpoint: `${location}-dialogflow.googleapis.com`
      });

      const parent = `projects/${projectId}/locations/${location}`;
      const [agents] = await client.listAgents({ parent });

      if (agents.length === 0) {
        console.log(`  No agents found in ${location}.`);
      } else {
        console.log(`✅ FOUND AGENTS IN ${location}!`);
        agents.forEach(a => {
          console.log(` - Display Name: ${a.displayName}`);
          console.log(` - Full ID: ${a.name}`);
        });
      }
    } catch (err: any) {
      console.log(`  Error in ${location}: ${err.message}`);
    }
  }
}

listAgents();
