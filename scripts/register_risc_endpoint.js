// Registers (or inspects) our Cross-Account Protection event stream with
// Google — the step that makes app/api/security/risc/route.ts actually receive
// anything. Until this runs, the endpoint is live but Google has never been
// told to push to it, and the Project Checkup keeps warning.
//
// PREREQUISITES, in the Cloud project that owns the OAuth client:
//   1. Enable the RISC API.
//   2. Create a service account, give it the "RISC Configuration Admin" role,
//      and download its JSON key.
//   3. Point GOOGLE_APPLICATION_CREDENTIALS at that key file (or set
//      RISC_SERVICE_ACCOUNT_JSON to the key's contents).
//   4. Register the SAME OAuth client the app uses — the receiver rejects
//      events whose audience isn't GOOGLE_CLIENT_ID.
//
// Usage:
//   node scripts/register_risc_endpoint.js            # show current stream config
//   node scripts/register_risc_endpoint.js --update   # point the stream at our endpoint
//   node scripts/register_risc_endpoint.js --verify   # ask Google to send a test event
//
// After --verify, look for "[risc] verification event received" in the
// production logs. That round trip is the proof the whole path works.

require('dotenv').config({ path: '.env.local' });
const { createSign } = require('crypto');

// RISC does NOT take an ordinary OAuth access token. It wants a JWT the service
// account signs for RISC's own audience, sent straight through as the bearer —
// an exchanged access token comes back 401 UNAUTHENTICATED, and a scope-based
// google-auth-library JWT client silently yields "Bearer undefined". Both were
// tried against the live API before landing here.
const RISC_AUDIENCE = 'https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService';
const STREAM_URL = 'https://risc.googleapis.com/v1beta/stream';
const ENDPOINT =
  process.env.RISC_RECEIVER_URL || 'https://agency.innergcomplete.com/api/security/risc';

// Must stay in sync with REVOCATION_EVENTS in app/api/security/risc/route.ts —
// asking for events the receiver ignores just adds noise.
const EVENTS_REQUESTED = [
  'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/tokens-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  'https://schemas.openid.net/secevent/risc/event-type/account-purged',
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
];

// Key lookup, most specific first. risc-service-key.json in the repo root is
// the convention here — it's gitignored, and it's deliberately NOT
// GOOGLE_APPLICATION_CREDENTIALS, which already points at a different
// service account used for other Google APIs.
const DEFAULT_KEY_FILE = 'risc-service-key.json';

function serviceAccount() {
  if (process.env.RISC_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.RISC_SERVICE_ACCOUNT_JSON);

  const path = require('path');
  const fs = require('fs');
  const candidates = [
    process.env.RISC_SERVICE_ACCOUNT_FILE,
    path.resolve(process.cwd(), DEFAULT_KEY_FILE),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return require(resolved);
  }
  throw new Error(
    `No service-account key found. Put one at ./${DEFAULT_KEY_FILE}, or set RISC_SERVICE_ACCOUNT_FILE / RISC_SERVICE_ACCOUNT_JSON.`
  );
}

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

/** Self-signed service-account JWT addressed to the RISC service. */
function riscBearer() {
  const key = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const segments =
    `${b64url({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id })}.` +
    `${b64url({ iss: key.client_email, sub: key.client_email, aud: RISC_AUDIENCE, iat: now, exp: now + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(segments).sign(key.private_key).toString('base64url');
  return `${segments}.${signature}`;
}

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${riscBearer()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed };
}

async function main() {
  const mode = process.argv.includes('--update') ? 'update'
    : process.argv.includes('--verify') ? 'verify'
    : 'show';

  if (mode === 'show') {
    const r = await call('GET', STREAM_URL);
    console.log(`GET stream → ${r.status}`);
    console.log(JSON.stringify(r.body, null, 2));
    // 404 no_risc_configuration is the normal "never set up" answer, not a
    // failure — and it proves auth worked, since a bad key 401s instead.
    if (r.body?.err === 'no_risc_configuration') {
      console.log('\nAuthenticated fine — this project just has no RISC stream yet. Run with --update.');
    } else if (r.ok && !r.body?.delivery?.delivery_uri && !r.body?.delivery?.url) {
      console.log('\nNo delivery endpoint configured yet. Run with --update.');
    }
    return;
  }

  if (mode === 'update') {
    // Preflight: registering a URL that isn't live means Google pushes real
    // security events into a 404, and enough failed deliveries get the stream
    // disabled. A deployed receiver answers 400/401 to this junk body (it
    // rejects the unsigned token); a 404 means it simply isn't there yet.
    const probe = await fetch(ENDPOINT, { method: 'POST', body: 'preflight' })
      .then((r) => r.status)
      .catch(() => 0);
    if (probe === 404 || probe === 0) {
      console.error(
        `Refusing to register: ${ENDPOINT} responded ${probe || 'not reachable'}.\n` +
          'Deploy the receiver first (app/api/security/risc), then re-run this.'
      );
      process.exit(1);
    }
    console.log(`Receiver responded ${probe} to a preflight — it's live.`);
    console.log(`Pointing the RISC stream at: ${ENDPOINT}`);
    const r = await call('POST', `${STREAM_URL}:update`, {
      delivery: {
        delivery_method: 'https://schemas.openid.net/secevent/risc/delivery-method/push',
        url: ENDPOINT,
      },
      events_requested: EVENTS_REQUESTED,
    });
    console.log(`stream:update → ${r.status}`);
    console.log(JSON.stringify(r.body, null, 2));
    if (r.ok) console.log('\nNow run with --verify to make Google send a test event.');
    return;
  }

  // Google echoes this state back inside the verification event, so it's
  // traceable in the receiver's logs.
  const state = `risc-check-${process.pid}`;
  const r = await call('POST', `${STREAM_URL}:verify`, { state });
  console.log(`stream:verify → ${r.status} (state: ${state})`);
  console.log(JSON.stringify(r.body, null, 2));
  if (r.ok) {
    console.log(`\nCheck the production logs for: [risc] verification event received (state: ${state})`);
  }
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
