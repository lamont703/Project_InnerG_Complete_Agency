import { google } from "googleapis";

// Google Business Profile OAuth + API helpers. Reuses the existing Google OAuth
// client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) with a GBP-specific redirect
// URI and the business.manage scope. Per-user (each owner grants access to their
// own locations), unlike the single admin-minted GSC/Ads tokens.
//
// SETUP (one-time, in Google Cloud Console for that OAuth client):
//   • Enable: Business Profile API + My Business Account Management / Business
//     Information APIs (and request GBP API access — it's approval-gated).
//   • Add these Authorized redirect URIs to the OAuth client:
//       http://localhost:3000/api/google-business/callback
//       https://agency.innergcomplete.com/api/google-business/callback
//   • Add the business.manage scope to the OAuth consent screen (it's a
//     restricted scope → needs Google verification before non-test users).

export const GBP_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/business.manage",
];

export function gbpRedirectUri(origin: string): string {
  return `${origin}/api/google-business/callback`;
}

export function gbpOAuthClient(origin: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    gbpRedirectUri(origin)
  );
}

// Consent URL. access_type=offline + prompt=consent so we always get a refresh
// token (needed for the ongoing background sync).
export function gbpAuthUrl(origin: string, state: string): string {
  return gbpOAuthClient(origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GBP_SCOPES,
    state,
  });
}

export async function gbpExchangeCode(origin: string, code: string) {
  const { tokens } = await gbpOAuthClient(origin).getToken(code);
  return tokens;
}

// Best-effort email of the connected Google account, decoded from the id_token
// (we requested openid+email). Used only for display ("Connected as …").
export function emailFromIdToken(idToken?: string | null): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString("utf8"));
    return payload.email || null;
  } catch {
    return null;
  }
}

export interface GbpLocation {
  account: string;
  name: string;      // locations/{id}
  title: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  placeId: string | null;
  mapsUri: string | null;
}

// Fetch every location the granting account manages, flattened across accounts.
// Uses the REST endpoints directly (googleapis lacks stable typed clients for
// all the mybusiness* surfaces); a readMask is required by the API.
export async function gbpFetchLocations(accessToken: string): Promise<GbpLocation[]> {
  const auth = { Authorization: `Bearer ${accessToken}` };

  const acctRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: auth });
  if (!acctRes.ok) throw new Error(`accounts ${acctRes.status}: ${(await acctRes.text()).slice(0, 200)}`);
  const accounts = (await acctRes.json()).accounts || [];

  const readMask = "name,title,storefrontAddress,phoneNumbers,websiteUri,metadata";
  const out: GbpLocation[] = [];

  for (const acct of accounts) {
    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=${encodeURIComponent(readMask)}&pageSize=100`,
      { headers: auth }
    );
    if (!locRes.ok) continue;
    for (const loc of (await locRes.json()).locations || []) {
      const a = loc.storefrontAddress;
      const address = a
        ? [ (a.addressLines || []).join(" "), a.locality, a.administrativeArea, a.postalCode ].filter(Boolean).join(", ")
        : null;
      out.push({
        account: acct.name,
        name: loc.name,
        title: loc.title || null,
        address,
        phone: loc.phoneNumbers?.primaryPhone || null,
        website: loc.websiteUri || null,
        placeId: loc.metadata?.placeId || null,
        mapsUri: loc.metadata?.mapsUri || null,
      });
    }
  }
  return out;
}
