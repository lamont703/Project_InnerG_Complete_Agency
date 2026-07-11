import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import {
  SchoolRankingTemplate,
  BoothRentTemplate,
  MythBustTemplate,
  EntityLeaderboardTemplate,
  OpenChairsTemplate,
} from "@/lib/pinterest/templates";

export const runtime = "nodejs";

// Pure "data -> image" renderer for scripts/generate_pinterest_pins.js — no
// Supabase calls happen here. The script fetches real data once and POSTs
// it here to get the PNG, then reuses that same data to build the pin's
// title/description/link, so the image and metadata can never disagree.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { templateType, props } = body || {};

  switch (templateType) {
    case "school_ranking":
      return new ImageResponse(<SchoolRankingTemplate rows={props.rows} headline={props.headline} />, { width: 1000, height: 1500 });
    case "booth_rent":
      return new ImageResponse(<BoothRentTemplate rows={props.rows} headline={props.headline} />, { width: 1000, height: 1500 });
    case "myth_bust":
      return new ImageResponse(<MythBustTemplate eyebrow={props.eyebrow} headline={props.headline} facts={props.facts} />, { width: 1000, height: 1500 });
    case "entity_leaderboard":
      return new ImageResponse(<EntityLeaderboardTemplate rows={props.rows} headline={props.headline} />, { width: 1000, height: 1500 });
    case "open_chairs":
      return new ImageResponse(<OpenChairsTemplate rows={props.rows} headline={props.headline} />, { width: 1000, height: 1500 });
    default:
      return NextResponse.json({ error: `Unknown templateType: ${templateType}` }, { status: 400 });
  }
}
