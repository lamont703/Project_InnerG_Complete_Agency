/**
 * scripts/get-linkedin-tokens.js
 * LinkedIn OAuth Helper — No external dependencies required.
 */

const fs = require('fs');
const readline = require('readline');
const https = require('https');
const path = require('path');

// 1. Simple env parser
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
const CLIENT_ID = env['LINKEDIN_CLIENT_ID'];
const CLIENT_SECRET = env['LINKEDIN_CLIENT_SECRET'];
const REDIRECT_URI = "https://agency.innergcomplete.com";

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Error: LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET missing in .env.local");
    process.exit(1);
}

// Scopes for Page Management
const SCOPES = [
    'r_basicprofile',
    'r_ads',
    'r_ads_reporting',
    'r_organization_social',
    'r_organization_admin',
    'w_organization_social',
    'rw_organization_admin',
    'rw_ads',
    'w_member_social',
    'r_1st_connections_size'
].join(' ');

async function run() {
    console.log("=== LinkedIn OAuth Helper ===");
    
    // Step 1: Generate Auth URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('state', Math.random().toString(36).substring(7));
    authUrl.searchParams.append('scope', SCOPES);
    
    console.log("\n1. Visit this URL to authorize the application:\n");
    console.log("\x1b[36m%s\x1b[0m", authUrl.toString());
    
    console.log("\n2. After authorizing, you will be redirected to: " + REDIRECT_URI);
    console.log("3. Copy the 'code' parameter from the URL query string.");
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("\nEnter the authorization code: ", async (input) => {
        rl.close();
        if (!input) {
            console.error("No code provided. Exiting.");
            process.exit(1);
        }

        // Clean up the input: if the user pasted the full URL or "code=...&state=...", extract just the code
        let code = input.trim();
        if (code.includes('code=')) {
            const matches = code.match(/[?&]code=([^&]+)/) || code.match(/^code=([^&]+)/);
            if (matches) code = matches[1];
        } else if (code.includes('&')) {
            // If they just pasted "code&state=...", take everything before the first &
            code = code.split('&')[0];
        }

        console.log(`\n🔄 Exchanging code for tokens... (Code length: ${code.length})`);

        try {
            const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET
                })
            });
            
            const tokens = await tokenResponse.json();
            
            if (!tokenResponse.ok) {
                console.error("\n❌ Error from LinkedIn:", tokens);
                return;
            }

            console.log("\n=== AUTHENTICATION SUCCESSFUL ===");
            console.log("Copy these values into your Admin Connectors page:");
            console.log("--------------------------------------------------");
            console.log("Access Token:  " + tokens.access_token);
            console.log("Expires In:    " + tokens.expires_in + " seconds");
            if (tokens.refresh_token) {
                console.log("Refresh Token: " + tokens.refresh_token);
                console.log("Refresh Exp:   " + tokens.refresh_token_expires_in + " seconds");
            } else {
                console.log("Refresh Token: (Optional) Not returned. LinkedIn only returns this if your app has the authorized refresh token product.");
            }
            console.log("--------------------------------------------------");
            
            console.log("\n💡 Pro-tip: You can now use the Access Token to set up the LinkedIn Connector in the AI Dashboard.");
        } catch (err) {
            console.error("❌ Request Error:", err);
        }
    });
}

run();
