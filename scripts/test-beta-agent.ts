import { SessionsClient } from "@google-cloud/dialogflow-cx/build/src/v3beta1";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testBetaAgent() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER; 
  const location = process.env.GOOGLE_CLOUD_LOCATION; 
  const agentId = process.env.GOOGLE_CLOUD_AGENT_ID;

  console.log(`📡 [BETA] Testing Agent: ${agentId} in ${location}...`);

  try {
    const client = new SessionsClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      apiEndpoint: `${location}-dialogflow.googleapis.com`
    });

    const sessionPath = client.projectLocationAgentSessionPath(
      projectId!,
      location!,
      agentId!,
      "test-session-123"
    );

    console.log(`🔗 Session Path: ${sessionPath}`);

    const [response] = await client.detectIntent({
      session: sessionPath,
      queryInput: {
        text: { text: "Hello" },
        languageCode: "en"
      }
    });

    console.log("✅ [BETA] SUCCESS!");
    console.log("Response:", response.queryResult?.responseMessages?.[0]?.text?.text?.[0]);
  } catch (err: any) {
    console.log("❌ [BETA] FAILED");
    console.log("Error Detail:", err.message);
  }
}

testBetaAgent();
