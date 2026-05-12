const { EndpointServiceClient } = require("@google-cloud/aiplatform").v1;
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listEndpoints() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
  const location = "us-west1"; 

  console.log(`🕵️ Scanning Project ${projectId} for Vertex AI Endpoints in ${location}...`);

  try {
    const client = new EndpointServiceClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      apiEndpoint: `${location}-aiplatform.googleapis.com`
    });

    const parent = `projects/${projectId}/locations/${location}`;
    const [endpoints] = await client.listEndpoints({ parent });

    if (endpoints.length === 0) {
      console.log(`  No Endpoints found in ${location}.`);
    } else {
      console.log(`✅ FOUND ${endpoints.length} ENDPOINTS!`);
      endpoints.forEach(e => {
        console.log(` - Display Name: ${e.displayName}`);
        console.log(` - Name: ${e.name}`);
      });
    }
  } catch (err: any) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

listEndpoints();
