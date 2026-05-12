const { EngineServiceClient } = require("@google-cloud/discoveryengine").v1;
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listEngines() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
  const location = "us-west1"; 

  console.log(`🕵️ Scanning Project ${projectId} for Engines in ${location}...`);

  try {
    const client = new EngineServiceClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      apiEndpoint: "us-west1-discoveryengine.googleapis.com"
    });

    const parent = `projects/${projectId}/locations/${location}/collections/default_collection`;
    const [engines] = await client.listEngines({ parent });

    if (engines.length === 0) {
      console.log(`  No Engines found in ${location}.`);
    } else {
      console.log(`✅ FOUND ${engines.length} ENGINES!`);
      engines.forEach(e => {
        console.log(` - Display Name: ${e.displayName}`);
        console.log(` - Name: ${e.name}`);
      });
    }
  } catch (err: any) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

listEngines();
