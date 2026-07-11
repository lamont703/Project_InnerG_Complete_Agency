// Posts pending rows from `pinterest_pins` to Pinterest via GoHighLevel,
// routed through the shared GhlProvider (the one file that's allowed to
// talk HTTP to GHL — see the guardrail comment in
// supabase/functions/_shared/lib/providers/ghl.ts), same runtime/loading
// pattern as the existing scripts/agent_ghl_social_poster.ts.
//
// Usage:
//   deno run --allow-net --allow-read --allow-env scripts/post_pinterest_pins.ts --dry-run
//   deno run --allow-net --allow-read --allow-env scripts/post_pinterest_pins.ts --limit=1   (do this before a full run)
//   deno run --allow-net --allow-read --allow-env scripts/post_pinterest_pins.ts

async function loadEnvFile(filePath: string) {
  try {
    const envText = await Deno.readTextFile(filePath);
    envText.split("\n").forEach((line) => {
      const cleanLine = line.replace(/\r/g, "");
      if (cleanLine.includes("=") && !cleanLine.startsWith("#")) {
        const [key, ...rest] = cleanLine.split("=");
        Deno.env.set(key.trim(), rest.join("=").trim().replace(/^"|"$/g, ""));
      }
    });
  } catch {
    // File might not exist
  }
}
await loadEnvFile(".env");
await loadEnvFile(".env.local");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GhlProvider } from "../supabase/functions/_shared/lib/providers/ghl.ts";

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const LOCATION_ID = "QLyYYRoOhCg65lKW9HDX";
// The Inner G Complete Agency Pinterest account, confirmed live via GET
// /social-media-posting/{locationId}/accounts.
const PINTEREST_ACCOUNT_ID = "6a514a7be28154dc1a18951e_QLyYYRoOhCg65lKW9HDX_456200774662236491_profile";
const PINTEREST_OAUTH_ID = "6a514a7be28154dc1a18951e";
// Same GHL user id already proven working for a real published post in
// scripts/agent_ghl_social_poster.ts.
const USER_ID = "SqbVVbHNjxmEHxJTw59e";

// board_name -> real Pinterest board id, confirmed live via GHL's API
// developer playground (GET /social-media-posting/{locationId}/accounts/{id}/boards) —
// no stable public GhlProvider method for this yet, so these were captured
// once and hardcoded rather than re-fetched per run.
const BOARD_IDS: Record<string, string> = {
  "Texas Barber & Cosmetology Licensing Guides": "456200705943873323",
  "Barber Booth Rent & Chair Rental in Texas": "456200705943873324",
  "Best Barbershops & Salons in Houston": "456200705943873325",
  "Barber & Cosmetology School Rankings": "456200705943873326",
};

const args = Deno.args;
const DRY_RUN = args.includes("--dry-run");
const LIMIT = (() => {
  const arg = args.find((a) => a.startsWith("--limit="));
  return arg ? parseInt(arg.split("=")[1], 10) : 1000;
})();

async function main() {
  const ghlApiKey = Deno.env.get("GHL_API_KEY");
  if (!ghlApiKey && !DRY_RUN) {
    console.error("Missing GHL_API_KEY in .env.local");
    Deno.exit(1);
  }
  const ghl = new GhlProvider(ghlApiKey);

  const { data: pending, error } = await supabase
    .from("pinterest_pins")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(LIMIT);

  if (error) throw error;
  if (!pending || pending.length === 0) {
    console.log("No pending pins to post.");
    return;
  }

  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Processing ${pending.length} pending pin(s)...`);

  for (const pin of pending) {
    const boardId = BOARD_IDS[pin.board_name];
    if (!boardId) {
      console.error(`SKIPPED: [${pin.board_name}] "${pin.title}" — no known board id for this board_name`);
      continue;
    }

    const payload = {
      content: pin.description,
      accountIds: [PINTEREST_ACCOUNT_ID],
      userId: USER_ID,
      mediaUrl: pin.image_url,
      mediaType: "image/png",
      pinterestPostDetails: {
        title: pin.title,
        link: pin.link,
        pinterestBoards: [{ accountId: PINTEREST_OAUTH_ID, boards: [boardId] }],
      },
    };

    if (DRY_RUN) {
      console.log(`\n--- DRY RUN [${pin.board_name}] "${pin.title}" ---`);
      console.log(JSON.stringify(payload, null, 2));
      continue;
    }

    try {
      const result = await ghl.publishSocialPost(LOCATION_ID, payload);
      await supabase.from("pinterest_pins").update({ status: "posted", posted_at: new Date().toISOString() }).eq("id", pin.id);
      console.log(`Posted: [${pin.board_name}] ${pin.title}`);
      console.log(`  GHL response: ${JSON.stringify(result).slice(0, 200)}`);
    } catch (err) {
      console.error(`FAILED: [${pin.board_name}] ${pin.title}\n  ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  Deno.exit(1);
});
