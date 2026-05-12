import { askBarberAgent } from "../lib/barber-intelligence/google-agent";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testGenAIAgent() {
  console.log("📡 Testing Barber Intelligence (GenAI SDK)...");

  const mockTelemetry = {
    user_context: { username: "Lamont" },
    performance_telemetry_snapshot: {
      estimated_pass_probability: "85%",
      overall_accuracy: 78,
      domain_breakdown: {
        "Shaving": 0.9,
        "Health and Safety": 0.45,
        "Chemical Services": 0.6
      }
    }
  };

  try {
    const response = await askBarberAgent(
      "Give me a diagnostic question about my weakest domain.",
      "session-genai-123",
      mockTelemetry
    );

    console.log("✅ SUCCESS!");
    console.log("Agent Reply:", response.reply);
  } catch (err: any) {
    console.log("❌ FAILED");
    console.log("Error:", err.message);
  }
}

testGenAIAgent();
