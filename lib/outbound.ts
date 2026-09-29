import "server-only";
import { currentDemo, demoMemberFromToken } from "@/lib/demo/core";

/**
 * THE ONE DOOR TO GOOGLE, INSTAGRAM AND GOHIGHLEVEL.
 *
 * Every request to those services goes through here instead of calling fetch
 * directly (lib/outbound.test.ts fails on a direct call). It is a plain fetch
 * except in two cases, both for demo mode (lib/demo/):
 *
 *  1. The request carries a demo credential — a token starting sqdemo_, in
 *     the Authorization header, the access_token parameter, or a token
 *     exchange's refresh_token. It is answered by the fake Google or fake
 *     Instagram for that demo business. This holds OUTSIDE a demo too: a cron
 *     polling every connected profile reaches the fake for a demo one.
 *  2. A demo tool call is running (runInDemo) and the request carries no demo
 *     credential. It is refused unless it goes to our own database. Nothing
 *     leaves a demo by a route nobody anticipated.
 */

function headerValue(init: RequestInit | undefined, name: string): string | null {
  const h = init?.headers;
  if (!h) return null;
  if (h instanceof Headers) return h.get(name);
  if (Array.isArray(h)) return h.find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] ?? null;
  const key = Object.keys(h).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? (h as Record<string, string>)[key] : null;
}

/** The demo member a request's credentials belong to, if any. */
export function demoMemberOfRequest(url: URL, init?: RequestInit): string | null {
  const bearer = headerValue(init, "authorization")?.replace(/^Bearer\s+/i, "");
  const fromHeader = demoMemberFromToken(bearer);
  if (fromHeader) return fromHeader;
  const fromParam = demoMemberFromToken(url.searchParams.get("access_token"));
  if (fromParam) return fromParam;
  const body = init?.body;
  if (typeof body === "string" || body instanceof URLSearchParams) {
    const params = new URLSearchParams(String(body));
    return demoMemberFromToken(params.get("refresh_token")) ?? demoMemberFromToken(params.get("access_token"));
  }
  return null;
}

function ownDatabaseHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
  } catch {
    return null;
  }
}

export async function outboundFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  const demoMemberId = demoMemberOfRequest(url, init);
  if (demoMemberId) {
    const { fakeServiceResponse } = await import("@/lib/demo/fake-services");
    return fakeServiceResponse(demoMemberId, url, init);
  }
  if (currentDemo() && url.host !== ownDatabaseHost()) {
    throw new Error(`Demo mode: a request to ${url.host} was blocked. Nothing in a demo reaches a real service.`);
  }
  return fetch(input, init);
}
