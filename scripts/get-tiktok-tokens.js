/**
 * scripts/get-tiktok-tokens.js
 * TikTok OAuth Helper — No external dependencies required.
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// 💡 Simple env parser to load credentials from .env.local
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error("❌ Error: .env.local file not found in current directory.");
        process.exit(1);
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    });
    return env;
}

const env = loadEnv();

// Use Sandbox keys if available, otherwise fallback to standard keys
const CLIENT_KEY = env['TIKTOK_SANDBOX_CLIENT_KEY'] || env['TIKTOK_CLIENT_KEY'];
const CLIENT_SECRET = env['TIKTOK_SANDBOX_CLIENT_SECRET'] || env['TIKTOK_CLIENT_SECRET'];
const REDIRECT_URI = "https://agency.innergcomplete.com/api/auth/callback/tiktok";

if (!CLIENT_KEY || !CLIENT_SECRET) {
    console.error("❌ Error: TIKTOK_SANDBOX_CLIENT_KEY or TIKTOK_SANDBOX_CLIENT_SECRET missing in .env.local");
    process.exit(1);
}

// Scopes required for the TikTok Connector
const SCOPES = [
    'user.info.basic',
    'user.info.profile',
    'user.info.stats',
    'video.list'
].join(',');

async function run() {
    console.log("=== TikTok OAuth Helper ===");
    
    // Step 1: Generate Auth URL
    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.append('client_key', CLIENT_KEY);
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('state', Math.random().toString(36).substring(7));
    authUrl.searchParams.append('disable_auto_auth', '1');
    authUrl.searchParams.append('prompt', 'login');
    
    console.log("\n1. IMPORTANT: Ensure your Redirect URI in TikTok Developer Portal is set to:");
    console.log("\x1b[32m%s\x1b[0m", REDIRECT_URI);
    
    console.log("\n2. Visit this URL to authorize the application:\n");
    console.log("\x1b[36m%s\x1b[0m", authUrl.toString());
    
    console.log("\n3. After authorizing, you will be redirected to your website.");
    console.log("4. Copy the entire 'code' parameter from the URL query string.");
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("\n👉 Enter the authorization code: ", async (input) => {
        rl.close();
        if (!input) {
            console.error("No code provided. Exiting.");
            process.exit(1);
        }

        // Clean up the input in case they paste the full URL
        let code = input.trim();
        if (code.includes('code=')) {
            const matches = code.match(/[?&]code=([^&]+)/) || code.match(/^code=([^&]+)/);
            if (matches) code = matches[1];
        } else if (code.includes('&')) {
            code = code.split('&')[0];
        }

        console.log(`\n🔄 Exchanging code for tokens...`);

        try {
            const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_key: CLIENT_KEY,
                    client_secret: CLIENT_SECRET,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI
                })
            });
            
            const data = await tokenResponse.json();
            
            if (!tokenResponse.ok) {
                console.error("\n❌ Error from TikTok:", data);
                return;
            }

            console.log("\n✅ AUTHENTICATION SUCCESSFUL");
            console.log("==================================================");
            console.log("TikTok Access Token:  " + data.access_token);
            console.log("TikTok Refresh Token: " + data.refresh_token);
            console.log("TikTok User ID:       " + data.open_id);
            console.log("Expires In:           " + data.expires_in + " seconds");
            console.log("==================================================");
            
            console.log("\n💡 Next Step: Copy these values into your Admin Connectors page to finish the TikTok setup!");
        } catch (err) {
            console.error("\n❌ Request Error:", err.message);
        }
    });
}

run();
