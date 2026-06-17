/**
 * scripts/loop_sms_barber_agent.ts
 *
 * Runs the SMS Barber Recruitment trigger in a continuous loop.
 */

// ==========================================
// ⚙️ CONFIGURATION
// Easily change this integer to adjust the interval (in minutes)
const INTERVAL_MINUTES = 5;

// Number of leads to process per run
const BATCH_SIZE = "1";
// ==========================================

console.log(`🚀 Starting SMS Barber Recruitment Agent Loop every ${INTERVAL_MINUTES} minutes.`);

async function runLoop() {
  while (true) {
    console.log(`\n======================================================`);
    console.log(`⏱️ Running Barber Agent at ${new Date().toISOString()}`);
    console.log(`======================================================`);

    try {
      // Use Deno.Command if available (newer Deno), fallback to Deno.run
      if (typeof Deno.Command !== "undefined") {
        const command = new Deno.Command(Deno.execPath(), {
          args: ["run", "-A", "scripts/trigger_sms_barber_agent.ts", BATCH_SIZE],
          env: { AUTO_APPROVE: "1" },
          stdout: "inherit",
          stderr: "inherit",
        });
        const { code } = await command.output();
        if (code !== 0) console.error(`⚠️ Agent run exited with code ${code}`);
      } else {
        // @ts-ignore: Deprecated Deno.run fallback
        const p = Deno.run({
          cmd: [Deno.execPath(), "run", "-A", "scripts/trigger_sms_barber_agent.ts", BATCH_SIZE],
          env: { AUTO_APPROVE: "1" },
        });
        const status = await p.status();
        if (!status.success) console.error(`⚠️ Agent run exited with code ${status.code}`);
      }
    } catch (err) {
      console.error("Error executing agent:", err);
    }

    console.log(`\n💤 Sleeping for ${INTERVAL_MINUTES} minutes...`);
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MINUTES * 60 * 1000));
  }
}

runLoop();
