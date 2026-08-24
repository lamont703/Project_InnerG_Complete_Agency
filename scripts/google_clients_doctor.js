/**
 * Check every Google OAuth credential against Google. Read-only.
 *
 *   node scripts/google_clients_doctor.js
 *
 * WHY A SCRIPT AND NOT A GLANCE AT THE CONFIG. Reading environment variables
 * proves nothing about whether a credential works, and this project has now
 * been bitten by that twice: `vercel env pull` returns EMPTY STRINGS for
 * variables that are set, which was misread as "the credential is missing", and
 * a client secret that had been rotated in the console sat stale in .env for
 * long enough that a page failed before anyone noticed. The only reliable
 * question is the one Google answers.
 *
 * WHAT EACH CHECK MEANS. Two probes per purpose, neither of which changes
 * anything:
 *
 *   1. Client probe — an authorization_code exchange with a deliberately bogus
 *      code. Google replies before it ever looks at the code:
 *        invalid_grant   -> the id + secret PAIR is good
 *        invalid_client  -> the secret does not match this client
 *        deleted_client  -> the client no longer exists in the console
 *
 *   2. Token probe — a real refresh_token exchange. This is the one that says
 *      whether the stored token still belongs to that client, and it is where
 *      a mismatched triple shows up.
 *
 * A refresh token belongs to the client that minted it, so a purpose whose
 * client is fine and whose token is dead means exactly one thing: re-mint it.
 */

require("dotenv").config({ path: ".env.local" });

// The chain is duplicated from lib/google-clients.ts rather than imported,
// because that file is TypeScript and this must run under plain node like every
// other script here. Keep the two in step — the canonical name is index 0.
const CHAIN = {
  gbp_owner: {
    label: "Business Profile — owner connect (customer-facing)",
    id: ["GOOGLE_GBP_OWNER_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GBP_OWNER_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: null, // per-user; tokens live in gbp_connections
  },
  gbp_brand: {
    label: "Business Profile — our own listing",
    id: ["GOOGLE_GBP_BRAND_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GBP_BRAND_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    // NOT an env var. The brand token is stored per-connection in
    // publisher_connections, minted by scripts/publisher_connect.js gbp.
    // Reporting a missing env var here was a false alarm.
    refresh: null,
  },
  youtube: {
    label: "YouTube publishing",
    id: ["GOOGLE_YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID"],
    secret: ["GOOGLE_YOUTUBE_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET"],
    refresh: ["GOOGLE_YOUTUBE_REFRESH_TOKEN", "YOUTUBE_REFRESH_TOKEN"],
  },
  gsc: {
    label: "Search Console",
    id: ["GOOGLE_GSC_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_GSC_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: ["GOOGLE_GSC_REFRESH_TOKEN"],
  },
  ads: {
    label: "Google Ads",
    id: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_INTERNAL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secret: ["GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_INTERNAL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    refresh: ["GOOGLE_ADS_REFRESH_TOKEN"],
  },
};

const PROBE_REDIRECT = "https://shearquery.com/api/google-business/callback";

function pick(names) {
  if (!names) return { index: -1 };
  for (let i = 0; i < names.length; i++) {
    const v = process.env[names[i]];
    if (v && v.trim()) return { value: v.trim(), name: names[i], index: i };
  }
  return { index: -1 };
}

async function clientProbe(clientId, clientSecret) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: "probe", client_id: clientId, client_secret: clientSecret,
      grant_type: "authorization_code", redirect_uri: PROBE_REDIRECT,
    }),
  });
  const b = await res.json().catch(() => ({}));
  switch (b.error) {
    case "invalid_grant": return { ok: true, note: "id + secret agree" };
    case "invalid_client": return { ok: false, note: "SECRET DOES NOT MATCH THIS CLIENT" };
    case "deleted_client": return { ok: false, note: "CLIENT NO LONGER EXISTS" };
    default: return { ok: false, note: b.error || "unexpected response" };
  }
}

async function tokenProbe(clientId, clientSecret, refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
  });
  const b = await res.json().catch(() => ({}));
  if (b.access_token) {
    // The granted scopes are the useful half: they are how you notice a
    // customer-facing client quietly holding sensitive scopes it should not.
    const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${b.access_token}`)
      .then(r => r.json()).catch(() => ({}));
    return { ok: true, scopes: (info.scope || "").split(" ").filter(Boolean) };
  }
  return { ok: false, note: b.error === "invalid_grant"
    ? "TOKEN DEAD — re-mint it against this client"
    : (b.error || "unexpected response") };
}

const SENSITIVE = /youtube|yt-analytics|adwords|webmasters|gmail|drive/;

(async () => {
  console.log("\nGoogle OAuth credentials — checked against Google, nothing changed.");
  console.log("Reading .env.local. THIS IS NOT PRODUCTION — Vercel holds its own copies,");
  console.log("and they drift: a secret rotated in the console reaches one and not the other.");
  console.log("To check production, pull its env into a temp file and run with");
  console.log("  dotenv_config_path=<that file> node -r dotenv/config scripts/google_clients_doctor.js\n");
  let problems = 0;

  for (const [purpose, c] of Object.entries(CHAIN)) {
    const id = pick(c.id), secret = pick(c.secret), refresh = pick(c.refresh);
    console.log(`${c.label}`);
    console.log(`  purpose        ${purpose}`);

    if (!id.value || !secret.value) {
      console.log(`  ✗ not configured — set ${c.id[0]} and ${c.secret[0]}\n`);
      problems++;
      continue;
    }

    const legacy = id.index > 0 || secret.index > 0;
    console.log(`  client         ${id.value.split(".")[0]}`);
    console.log(`  from           ${id.name} / ${secret.name}${legacy ? "   ← LEGACY NAME, migrate to " + c.id[0] : ""}`);

    const cp = await clientProbe(id.value, secret.value);
    console.log(`  client check   ${cp.ok ? "✓" : "✗"} ${cp.note}`);
    if (!cp.ok) problems++;

    if (c.refresh) {
      if (!refresh.value) {
        console.log(`  token check    ✗ no refresh token — set ${c.refresh[0]}`);
        problems++;
      } else if (cp.ok) {
        const tp = await tokenProbe(id.value, secret.value, refresh.value);
        if (tp.ok) {
          console.log(`  token check    ✓ works (${refresh.name})`);
          const sens = tp.scopes.filter(s => SENSITIVE.test(s));
          for (const s of tp.scopes) console.log(`                   ${s.replace("https://www.googleapis.com/auth/", "")}`);
          if (purpose === "gbp_owner" && sens.length) {
            console.log(`  ⚠ the customer-facing client holds SENSITIVE scopes — it should not`);
            problems++;
          }
        } else {
          console.log(`  token check    ✗ ${tp.note}`);
          problems++;
        }
      } else {
        // Deliberately NOT probed. An invalid_client failure is the SECRET
        // being wrong, and a token probe against a bad secret returns
        // invalid_client too — which reads as "the token is dead" and sends
        // someone off to re-mint a token that was never broken. That exact
        // misreading happened before this script existed.
        console.log(`  token check    – SKIPPED. The client check failed, so nothing here`);
        console.log(`                   can be concluded about the token. Fix the secret first.`);
      }
    } else {
      console.log(`  token check    – ${purpose === "gbp_owner"
        ? "per-user, tokens live in gbp_connections"
        : "token lives in publisher_connections; run scripts/publisher_connect.js gbp"}`);
    }
    console.log("");
  }

  console.log(problems === 0
    ? "All credentials healthy.\n"
    : `${problems} problem(s) above.\n`);
})();
