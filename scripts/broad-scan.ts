import { EngineServiceClient } from "@google-cloud/discoveryengine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function broadScan() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const locations = ["us-west1", "us", "global"];

  console.log(`🕵️ Broad Scanning Project: ${projectId}...`);

  for (const location of locations) {
    console.log(`\nChecking Location: ${location}...`);
    const apiEndpoint = location === "global" ? "discoveryengine.googleapis.com" : `${location}-discoveryengine.googleapis.com`;
    
    const client = new EngineServiceClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      apiEndpoint: apiEndpoint
    });

    const parent = `projects/${projectId}/locations/${location}/collections/default_collection`;

    try {
      const [engines] = await client.listEngines({ parent });
      if (engines.length > 0) {
        console.log(`✅ FOUND ENGINES IN ${location}!`);
        engines.forEach(e => console.log(` - ${e.displayName} (ID: ${e.name?.split('/').pop()})`));
      } else {
        console.log(`  No engines in ${location}/default_collection`);
      }
    } catch (error: any) {
      console.log(`  Error in ${location}: ${error.message}`);
    }
  }
}

broadScan();
