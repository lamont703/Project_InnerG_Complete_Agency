/**
 * CommonJS twin of lib/google-internal-oauth.ts — see that file for why internal
 * Google automation must not share an OAuth client with the customer-facing app.
 *
 * Usage in a script:
 *   const { internalEnv } = require('./_google_internal_oauth');
 *   const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ... } = internalEnv();
 */
let warned = false;

function internalGoogleCredentials() {
  const clientId = process.env.GOOGLE_INTERNAL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_INTERNAL_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return { clientId, clientSecret, usingAppClient: false };
  }

  if (!warned) {
    warned = true;
    console.warn(
      "[google-internal-oauth] GOOGLE_INTERNAL_CLIENT_ID / _SECRET are not set — " +
        "falling back to the customer-facing app's OAuth client."
    );
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    usingAppClient: true,
  };
}

function internalEnv() {
  const { clientId, clientSecret } = internalGoogleCredentials();
  return { ...process.env, GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret };
}

module.exports = { internalGoogleCredentials, internalEnv };
