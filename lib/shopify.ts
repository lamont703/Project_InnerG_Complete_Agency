import "server-only";

/**
 * Read-only client for the Inner G Complete Shopify store.
 *
 * The store is the barbershop's checkout — `officialmontfitness.myshopify.com`
 * is a fossil handle from an earlier business, and the primary domain is
 * innergcomplete.com. Every "order" is a visit to the chair, which is the only
 * reason lib/rebooking/cadence.ts can model when a client is due.
 *
 * THIS IS A DEV DASHBOARD APP, NOT A LEGACY CUSTOM APP, and the difference
 * decides the auth flow. Shopify retired admin-created custom apps on
 * 2026-01-01 ("You can no longer create new admin-created custom apps"), so
 * there is no long-lived `shpat_` token to paste into an env var. Instead we
 * hold a client ID/secret and mint a token through the client credentials
 * grant, which returns `expires_in: 86399` — 24 hours, always.
 *
 * That expiry is why the token is cached in module scope with a safety margin
 * rather than fetched per request: a page render that pulls 3,000 orders makes
 * a dozen GraphQL calls and must not mint a dozen tokens.
 *
 * The grant only works while the app and the store live in the same Shopify
 * organization. If this starts returning 401 after an org change, that is the
 * first thing to check — the credentials will look perfectly valid.
 *
 * @see https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens
 */

/**
 * Pinned to a version Shopify currently lists as supported.
 *
 * `2025-07` worked when this integration was first probed and is already off
 * the supported list — Shopify keeps roughly a year of versions live, so this
 * constant is a maintenance item, not a set-and-forget. Ask the store itself
 * what it supports rather than guessing:
 *
 *     { publicApiVersions { handle supported } }
 */
const API_VERSION = "2026-07";

/** Client credentials tokens last 86399s; refresh early so none expires mid-render. */
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super("Shopify credentials are not set (SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET)");
    this.name = "ShopifyNotConfiguredError";
  }
}

/**
 * The store's myshopify subdomain, with whatever shape the env var was pasted in.
 *
 * Accepts `officialmontfitness`, `officialmontfitness.myshopify.com` and a full
 * URL, because all three are what a person copies out of the admin bar and any
 * of them silently produces a 404 against the token endpoint otherwise.
 */
export function normalizeShopHandle(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const bare = t
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.myshopify\.com$/i, "");
  return /^[a-z0-9][a-z0-9-]*$/i.test(bare) ? bare : null;
}

export function isShopifyConfigured(): boolean {
  return Boolean(
    normalizeShopHandle(process.env.SHOPIFY_SHOP) &&
      process.env.SHOPIFY_CLIENT_ID &&
      process.env.SHOPIFY_CLIENT_SECRET,
  );
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const shop = normalizeShopHandle(process.env.SHOPIFY_SHOP);
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!shop || !clientId || !clientSecret) throw new ShopifyNotConfiguredError();

  const res = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify token request failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Shopify token response contained no access_token");

  cachedToken = { value: json.access_token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return cachedToken.value;
}

/**
 * Run a GraphQL query against the Admin API.
 *
 * Shopify returns HTTP 200 with an `errors` array for query-level failures, so
 * a naive `res.ok` check reports success on a query that returned nothing.
 * Both shapes are turned into a thrown Error here.
 */
export async function shopifyGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const shop = normalizeShopHandle(process.env.SHOPIFY_SHOP);
  if (!shop) throw new ShopifyNotConfiguredError();
  const token = await getAccessToken();

  const res = await fetch(`https://${shop}.myshopify.com/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify GraphQL HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors).slice(0, 300)}`);
  }
  if (!json.data) throw new Error("Shopify GraphQL response contained no data");
  return json.data;
}

/** Exported for tests only — lets a test start from a known-empty token cache. */
export function __resetShopifyTokenCache() {
  cachedToken = null;
}
