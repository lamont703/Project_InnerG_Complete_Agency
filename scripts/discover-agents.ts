import { EngineServiceClient } from "@google-cloud/discoveryengine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function discoverAgents() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = "us-west1"; 
  const apiEndpoint = "us-west1-discoveryengine.googleapis.com";

  console.log(`🔍 Searching for your Barber Agent in location: ${location} at ${apiEndpoint}...`);

  const client = new EngineServiceClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    apiEndpoint: apiEndpoint
  });

  const parent = `projects/${projectId}/locations/${location}/collections/default_collection`;

  try {
    const [engines] = await client.listEngines({ parent });
    
    if (engines.length === 0) {
      console.log(`\n⚠️ No engines found in ${location}.`);
    } else {
      console.log("\n✅ SUCCESS: Found your Engines!");
      console.log("-----------------------------------");
      engines.forEach(engine => {
        console.log(`- Display Name: ${engine.displayName}`);
        console.log(`- Engine ID: ${engine.name?.split('/').pop()}`);
        console.log(`- Full Name Path: ${engine.name}`);
      });
      console.log("-----------------------------------");
    }

  } catch (error: any) {
    console.error(`\n❌ ERROR in ${location}`);
    console.error("Detail:", error.message);
  }
}

discoverAgents();
