import { askBarberAgent } from "../lib/barber-intelligence/google-agent";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function smokeTest() {
  console.log("🚀 Starting Barber Intelligence Smoke Test...");
  
  console.log("DEBUG: Env Variables Found:");
  console.log("- Project ID:", process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log("- Agent ID:", process.env.GOOGLE_CLOUD_AGENT_ID);
  console.log("- Location:", process.env.GOOGLE_CLOUD_LOCATION);
  console.log("- Credentials Path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_AGENT_ID) {
    console.error("❌ ERROR: Missing environment variables in .env.local!");
    return;
  }

  const mockTelemetry = {
    user_context: { username: "Lamont (Smoke Test)" },
    performance_telemetry_snapshot: {
      overall_accuracy: 0.72,
      estimated_pass_probability: "72%",
      domain_breakdown: [
        { domain: "Chemical Texture Services", accuracy: 0.42 }
      ]
    }
  };

  try {
    console.log("📡 Calling Google Agent Platform...");
    const response = await askBarberAgent(
      "Hi, who am I and what is my weakest area?",
      "smoke-test-session-123",
      mockTelemetry
    );

    console.log("\n✅ CONNECTION SUCCESSFUL!");
    console.log("-----------------------------------");
    console.log("Agent Response:", response.reply);
    console.log("-----------------------------------");
    
  } catch (error: any) {
    console.error("\n❌ CONNECTION FAILED");
    console.error("Error Detail:", error.message);
  }
}

smokeTest();
