const { AppServiceClient } = require("@google-cloud/discoveryengine").v1;
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listApps() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
  const location = "us"; 

  console.log(`🕵️ Scanning Project ${projectId} for Apps in ${location}...`);

  try {
    const client = new AppServiceClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      apiEndpoint: "us-discoveryengine.googleapis.com"
    });

    const parent = `projects/${projectId}/locations/${location}/collections/default_collection`;
    const [apps] = await client.listApps({ parent });

    if (apps.length === 0) {
      console.log(`  No Apps found in ${location}.`);
    } else {
      console.log(`✅ FOUND ${apps.length} APPS!`);
      apps.forEach(app => {
        console.log(` - Display Name: ${app.displayName}`);
        console.log(` - Name: ${app.name}`);
      });
    }
  } catch (err: any) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

listApps();
