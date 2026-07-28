// Google Business Profile API access checker — answers one question: can we
// actually call the GBP APIs yet, or are we still waiting on Google?
//
// Getting to a working GBP connect takes three separate approvals, and each one
// fails with a DIFFERENT error, so the error text is the whole diagnosis:
//   • API not enabled on the Cloud project  → 403 SERVICE_DISABLED
//   • GBP API access not granted / quota 0  → 429 RESOURCE_EXHAUSTED or a 403
//                                             quota message
//   • OAuth token bad or scope missing      → 401 UNAUTHENTICATED / 403 on scope
// A 200 with an accounts array means we're through: the connect flow in
// lib/google-business.ts will start returning real locations.
//
// Uses the refresh token already stored in gbp_connections (the owner account
// that connected during testing), mints a short-lived access token, and makes
// the same two REST calls gbpFetchLocations does. Read-only: it never writes to
// the database and never persists the token it mints.
//
// Usage: node scripts/check_gbp_api_access.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ACCOUNTS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const READ_MASK = 'name,title,storefrontAddress,phoneNumbers,websiteUri,metadata';

// Quota is granted PER SERVICE, so both are probed independently — one can be
// approved while the other is still at zero, and connect needs both. The
// categories endpoint is used for Business Information because it's the only
// call there that doesn't need an account name (which we can't get while
// Account Management is blocked).
const SERVICES = [
  { label: 'Account Management', url: ACCOUNTS_URL },
  {
    label: 'Business Information',
    url: 'https://mybusinessbusinessinformation.googleapis.com/v1/categories?regionCode=US&languageCode=en&view=BASIC&pageSize=1',
  },
];

// Exchange the stored refresh token for a fresh access token. Kept here rather
// than reusing lib/google-business.ts because that's TypeScript/Next-only.
async function mintAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token refresh ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body.access_token;
}

// Pull the API's own reason code out of the error body — that's what
// distinguishes "not enabled" from "no quota".
function diagnose(status, body) {
  const err = body?.error || {};
  const reason = (err.details || []).map((d) => d.reason).filter(Boolean).join(',') || err.status || '';
  const msg = err.message || '';
  if (status === 403 && /SERVICE_DISABLED/i.test(reason + msg)) {
    return 'API NOT ENABLED on the Cloud project — enable mybusinessaccountmanagement + mybusinessbusinessinformation.';
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(reason + msg)) {
    return 'QUOTA STILL ZERO — the GBP API access/quota request has not been granted yet.';
  }
  if (status === 401) return 'TOKEN PROBLEM — refresh token rejected; the owner needs to reconnect.';
  if (status === 403) return 'ACCESS DENIED — scope or GBP API access approval missing.';
  return `Unexpected ${status}.`;
}

async function main() {
  const { data: conn, error } = await supabase
    .from('gbp_connections')
    .select('google_account_email, refresh_token, updated_at')
    .not('refresh_token', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return console.error('Could not read gbp_connections:', error.message);
  if (!conn) return console.error('No GBP connection with a refresh token — connect an account first at /account (Manage My Listing).');

  console.log(`Testing as: ${conn.google_account_email} (connected ${conn.updated_at})\n`);

  const accessToken = await mintAccessToken(conn.refresh_token);
  console.log('✓ OAuth token refreshed — the consent/refresh side is healthy.\n');

  const auth = { Authorization: `Bearer ${accessToken}` };

  let accountsBody = null;
  let blocked = 0;
  for (const svc of SERVICES) {
    const res = await fetch(svc.url, { headers: auth });
    const body = await res.json().catch(() => ({}));
    const meta = (body?.error?.details || []).find((d) => d.metadata)?.metadata;

    if (res.ok) {
      console.log(`✓ ${svc.label} API → HTTP 200 (quota granted)`);
    } else {
      blocked++;
      console.log(`✗ ${svc.label} API → HTTP ${res.status} ${body?.error?.status || ''}`);
      if (meta) console.log(`    quota limit = ${meta.quota_limit_value} (${meta.quota_metric})`);
      console.log(`    ${diagnose(res.status, body)}`);
    }
    if (svc.url === ACCOUNTS_URL && res.ok) accountsBody = body;
  }
  console.log();

  if (blocked) {
    console.log(
      `VERDICT: STILL BLOCKED — ${blocked} of ${SERVICES.length} GBP service(s) unavailable. ` +
        'Connect will keep storing 0 locations until both return 200.'
    );
    process.exit(1);
  }

  const accounts = accountsBody.accounts || [];
  console.log(`✓ ${accounts.length} account(s): ${accounts.map((a) => a.accountName || a.name).join(', ') || '(none)'}\n`);

  let total = 0;
  for (const acct of accounts) {
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=${encodeURIComponent(READ_MASK)}&pageSize=100`;
    const locRes = await fetch(url, { headers: auth });
    const locBody = await locRes.json().catch(() => ({}));
    if (!locRes.ok) {
      console.log(`Business Information API (${acct.name}) → HTTP ${locRes.status}: ${diagnose(locRes.status, locBody)}`);
      continue;
    }
    const locs = locBody.locations || [];
    total += locs.length;
    for (const l of locs) console.log(`  • ${l.title || l.name} — placeId ${l.metadata?.placeId || 'none'}`);
  }

  console.log(
    total > 0
      ? `\nVERDICT: WORKING — ${total} location(s) readable. The connect flow will now match and auto-claim.`
      : '\nVERDICT: APIs are reachable, but this account manages 0 locations. Quota is fine; add a location to the Google account to test end to end.'
  );
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
