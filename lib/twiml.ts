import { NextResponse } from "next/server";

/**
 * TwiML response helpers.
 *
 * Twilio requires `Content-Type: text/xml` and will treat anything else as a
 * failed webhook, which it surfaces as a generic "application error" on the
 * call rather than as a parse error you could debug. Getting the header wrong
 * is the single most common way a working handler looks broken.
 */
export function twiml(body: string): NextResponse {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
