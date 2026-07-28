import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync, createSign } from "node:crypto";
import { verifySecurityEventToken, subjectOf, GOOGLE_ISSUER, REVOCATION_EVENTS } from "@/lib/risc";

// This endpoint is public and unauthenticated by design — Google posts to it
// with none of our credentials — and a token that gets past verification causes
// us to delete a user's stored Google credentials. So these tests are less
// "does it work" than "can a forged token get through": each one signs its own
// JWT with a throwaway key and tries a different way in.

const AUDIENCE = "test-client-id.apps.googleusercontent.com";
const KID = "test-key-1";

let privateKey: string;
let jwks: any[];
let foreignPrivateKey: string;

const b64url = (input: object | string) =>
  Buffer.from(typeof input === "string" ? input : JSON.stringify(input)).toString("base64url");

/** Sign a JWT with the given key — mirrors how Google signs a real SET. */
function signJwt(header: object, payload: object, key: string): string {
  const segments = `${b64url(header)}.${b64url(payload)}`;
  const signature = createSign("RSA-SHA256").update(segments).sign(key).toString("base64url");
  return `${segments}.${signature}`;
}

const validPayload = (over: object = {}) => ({
  iss: GOOGLE_ISSUER,
  aud: AUDIENCE,
  iat: Math.floor(Date.now() / 1000),
  jti: "abc123",
  events: {
    "https://schemas.openid.net/secevent/risc/event-type/tokens-revoked": {
      subject: { subject_type: "iss-sub", iss: GOOGLE_ISSUER, sub: "1234567890" },
    },
  },
  ...over,
});

const keyProvider = async () => jwks;

beforeAll(() => {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  privateKey = pair.privateKey.export({ type: "pkcs1", format: "pem" }) as string;
  const jwk = pair.publicKey.export({ format: "jwk" }) as any;
  jwks = [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }];

  const foreign = generateKeyPairSync("rsa", { modulusLength: 2048 });
  foreignPrivateKey = foreign.privateKey.export({ type: "pkcs1", format: "pem" }) as string;
});

describe("verifySecurityEventToken — accepts genuine events", () => {
  it("accepts a token signed by the advertised key", async () => {
    const token = signJwt({ alg: "RS256", kid: KID }, validPayload(), privateKey);
    const payload = await verifySecurityEventToken(token, AUDIENCE, keyProvider);
    expect(payload).not.toBeNull();
    expect(payload.iss).toBe(GOOGLE_ISSUER);
  });

  it("accepts an audience array containing our client", async () => {
    const token = signJwt({ alg: "RS256", kid: KID }, validPayload({ aud: ["other", AUDIENCE] }), privateKey);
    expect(await verifySecurityEventToken(token, AUDIENCE, keyProvider)).not.toBeNull();
  });
});

describe("verifySecurityEventToken — rejects forgeries", () => {
  it("rejects a token signed by a key that isn't Google's", async () => {
    const token = signJwt({ alg: "RS256", kid: KID }, validPayload(), foreignPrivateKey);
    expect(await verifySecurityEventToken(token, AUDIENCE, keyProvider)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = signJwt({ alg: "RS256", kid: KID }, validPayload(), privateKey);
    const [h, , s] = token.split(".");
    const swapped = `${h}.${b64url(validPayload({ jti: "tampered" }))}.${s}`;
    expect(await verifySecurityEventToken(swapped, AUDIENCE, keyProvider)).toBeNull();
  });

  it('rejects "alg": "none"', async () => {
    const unsigned = `${b64url({ alg: "none", kid: KID })}.${b64url(validPayload())}.`;
    expect(await verifySecurityEventToken(unsigned, AUDIENCE, keyProvider)).toBeNull();
  });

  it("rejects an algorithm swap to HS256", async () => {
    const token = signJwt({ alg: "HS256", kid: KID }, validPayload(), privateKey);
    expect(await verifySecurityEventToken(token, AUDIENCE, keyProvider)).toBeNull();
  });

  it("rejects an unknown key id", async () => {
    const token = signJwt({ alg: "RS256", kid: "rotated-away" }, validPayload(), privateKey);
    expect(await verifySecurityEventToken(token, AUDIENCE, keyProvider)).toBeNull();
  });

  it("rejects an event addressed to a different app", async () => {
    const token = signJwt({ alg: "RS256", kid: KID }, validPayload({ aud: "someone-else" }), privateKey);
    expect(await verifySecurityEventToken(token, AUDIENCE, keyProvider)).toBeNull();
  });

  it("rejects a non-Google issuer", async () => {
    const token = signJwt({ alg: "RS256", kid: KID }, validPayload({ iss: "https://evil.example" }), privateKey);
    expect(await verifySecurityEventToken(token, AUDIENCE, keyProvider)).toBeNull();
  });

  it("fails closed when no audience is configured", async () => {
    // A deploy missing GOOGLE_CLIENT_ID must not accept everything.
    const token = signJwt({ alg: "RS256", kid: KID }, validPayload(), privateKey);
    expect(await verifySecurityEventToken(token, undefined, keyProvider)).toBeNull();
  });

  it("rejects malformed tokens instead of throwing", async () => {
    for (const bad of ["", "not-a-jwt", "a.b", "a.b.c.d", "!!!.???.***"]) {
      expect(await verifySecurityEventToken(bad, AUDIENCE, keyProvider)).toBeNull();
    }
  });
});

describe("subjectOf", () => {
  it("reads the stable Google user id", () => {
    expect(subjectOf({ subject: { subject_type: "iss-sub", sub: "42" } })).toEqual({ sub: "42" });
  });

  it("falls back to email", () => {
    expect(subjectOf({ subject: { subject_type: "email", email: "a@b.com" } })).toEqual({ email: "a@b.com" });
  });

  it("returns nothing identifiable rather than guessing", () => {
    expect(subjectOf({})).toEqual({});
    expect(subjectOf({ subject: {} })).toEqual({});
  });
});

describe("event coverage", () => {
  it("handles revocation for every event type we ask Google to send", () => {
    // Exactly the URIs in EVENTS_REQUESTED (scripts/register_risc_endpoint.js),
    // which are in turn exactly what Google's live `events_supported` offers.
    // The plural `tokens-revoked` is under the OAUTH namespace, not risc — the
    // first registration got that wrong and Google dropped it silently.
    for (const type of [
      "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
      "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
      "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
      "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
      "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
    ]) {
      expect(REVOCATION_EVENTS.has(type), type).toBe(true);
    }
  });
});
