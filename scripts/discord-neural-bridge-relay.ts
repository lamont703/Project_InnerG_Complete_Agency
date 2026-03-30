/**
 * scripts/discord-neural-bridge-relay.ts
 * Sarah's Ears — Discord Gateway → Neural Bridge Relay
 *
 * This script connects to the Discord Gateway (WebSockets) to "hear" events
 * that the Interactions Endpoint cannot (e.g. Member Joins, Mentions).
 *
 * It forwards these events to the Supabase Edge Function Brain for processing.
 *
 * Requirements:
 * - BOT must have "GUILD_MEMBERS" and "MESSAGE_CONTENT" intents enabled in Discord Developer Portal.
 * - NEURAL_BRIDGE_SECRET must be set in your .env.local and correctly configured in Sarah's Brain.
 *
 * TO RUN LOCALLY:
 * deno run --allow-all scripts/discord-neural-bridge-relay.ts
 */

import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

export {}; // Make this a module

// Load environment variables (non-strictly, only what's available)
const env = await load({ export: true, examplePath: null });

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const NEURAL_BRIDGE_URL = Deno.env.get("NEURAL_BRIDGE_URL") || "https://senkwhdxgtypcrtoggyf.supabase.co/functions/v1/webhook-discord";
const NEURAL_BRIDGE_SECRET = Deno.env.get("NEURAL_BRIDGE_SECRET");

if (!DISCORD_BOT_TOKEN || !NEURAL_BRIDGE_SECRET) {
  console.error("❌ Missing DISCORD_BOT_TOKEN or NEURAL_BRIDGE_SECRET. Check your .env.local");
  Deno.exit(1);
}

/**
 * Discord Gateway Connection
 */
const socket = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

let sequence: number | null = null;
let sessionId: string | null = null;
let lastHeartbeat: number | null = null;

socket.onopen = () => {
  console.log("Sarah is now listening via Neural Bridge relay...");
};

socket.onmessage = async (event) => {
  const payload = JSON.parse(event.data);
  const { op, d, t, s } = payload;

  if (s) sequence = s;

  switch (op) {
    case 10: // Hello
      const { heartbeat_interval } = d;
      console.log(`📡 Connected to Gateway (Heartbeat: ${heartbeat_interval}ms)`);
      startHeartbeat(heartbeat_interval);
      identify();
      break;

    case 11: // Heartbeat ACK
      console.log("💖 Heartbeat ACK");
      break;

    case 0: // Dispatch Event
      handleDispatch(t, d);
      break;
  }
};

/**
 * Identify Sarah to Discord with required intents
 */
function identify() {
  const identifyPayload = {
    op: 2,
    d: {
      token: DISCORD_BOT_TOKEN,
      intents: 1 << 0 | 1 << 1 | 1 << 9 | 1 << 15, // GUILDS, GUILD_MEMBERS, GUILD_MESSAGES, MESSAGE_CONTENT
      properties: {
        os: "linux",
        browser: "deno",
        device: "neural-bridge-relay",
      },
    },
  };
  socket.send(JSON.stringify(identifyPayload));
}

/**
 * Gateway Events Handler
 */
async function handleDispatch(eventType: string, data: any) {
  // 1. Member Joined Server (Onboarding Automation)
  if (eventType === "GUILD_MEMBER_ADD") {
    console.log(`🔔 New Member Joined: ${data.user?.username || "unknown"}`);
    await forwardToBrain("member_join", data.guild_id, {
      id: data.user?.id,
      username: data.user?.username,
    });
  }

    // 2. Message Created (Natural Mention Listening)
    if (eventType === "MESSAGE_CREATE") {
      const botId = Deno.env.get("DISCORD_APP_ID");
      const mentions = data.mentions || [];
      const isMentioned = mentions.some((m: any) => m.id === botId);
      
      // Improved Reply Detection: Hear replies to Bot ID OR replies to Webhooks named "Sarah"
      const refAuthor = data.referenced_message?.author;
      const isReplyToSarah = (refAuthor?.id === botId) || 
                            (refAuthor?.bot && (refAuthor?.username === "Sarah" || refAuthor?.username === "sarah"));

      if ((isMentioned || isReplyToSarah) && !data.author?.bot) {
        console.log(`💬 Sarah was ${isMentioned ? '@mentioned' : 'replied to'} by ${data.author?.username}`);
        await forwardToBrain("message_create", data.guild_id, {
          channel_id: data.channel_id,
          content: data.content,
          author: {
             id: data.author?.id,
             username: data.author?.username
          }
        });
      }
    }
}

/**
 * Heartbeat Logic
 */
function startHeartbeat(interval: number) {
  setInterval(() => {
    socket.send(JSON.stringify({ op: 1, d: sequence }));
    lastHeartbeat = Date.now();
  }, interval);
}

/**
 * Forward Event to Sarah's AI Brain (Edge Function)
 */
async function forwardToBrain(type: string, guildId: string, data: any) {
  try {
    const res = await fetch(NEURAL_BRIDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Neural-Bridge-Secret": NEURAL_BRIDGE_SECRET!,
      },
      body: JSON.stringify({
        event_type: type,
        guild_id: guildId,
        data: data,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      const brain = result.data || result; // Handle both direct and wrapped responses
      
      if (brain.success) {
        console.log(`✨ Sarah responded via AI brain successfully (${brain.status || 'interaction'}).`);
      } else {
        console.warn(`⚠️ Sarah's response failed: ${JSON.stringify(result)}`);
      }
    } else {
      const err = await res.text();
      console.error(`❌ Neural Bridge Error: ${err}`);
    }
  } catch (err: any) {
    console.error(`❌ Neural Bridge Connection Failed: ${err.message}`);
  }
}
