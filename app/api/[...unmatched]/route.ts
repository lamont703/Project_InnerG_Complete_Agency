import { NextResponse } from "next/server";

/**
 * A small, machine-readable 404 for anything under /api that matches no route.
 *
 * WHY THIS EXISTS. A POST to a mistyped or not-yet-deployed API path fell
 * through to the app's HTML not-found page — 907KB, half of it the entire
 * stylesheet inlined into the RSC flight payload. GoHighLevel's webhook action
 * refuses any response near 1MB, so a real inbound SMS test came back as
 * "Webhook Action error: Response is too large" with no mention of a 404.
 *
 * The endpoint was simply not deployed yet. The diagnosis cost an hour because
 * the error described the symptom of the 404 page rather than the 404 itself,
 * and nothing in that message points at a missing route.
 *
 * Every API caller is a machine. None of them wants HTML, and any of them may
 * choke on a megabyte of it. A JSON body of a few dozen bytes says the same
 * thing and cannot be mistaken for anything else.
 *
 * ROUTE PRECEDENCE MAKES THIS SAFE. Next.js resolves static and dynamic
 * segments before catch-alls, so every real route under /api still wins; only
 * genuinely unmatched paths land here. That is asserted by the fact that the
 * existing routes keep answering — worth re-checking if this file ever moves.
 *
 * This does NOT fix the HTML 404 page, which still ships 907KB to a human who
 * mistypes a URL. That is a separate and real problem.
 */

function notFound() {
  return NextResponse.json(
    { error: "Not found", hint: "No API route matches this path." },
    { status: 404 }
  );
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
