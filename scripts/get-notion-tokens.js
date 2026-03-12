/**
 * get-notion-tokens.js
 * Script to exchange Notion OAuth code for access tokens.
 * 
 * Usage: 
 * 1. Visit your NOTION_AUTHORIZATION_URL in a browser.
 * 2. Authorize the application.
 * 3. You will be redirected to your redirect_uri with a `code` parameter.
 * 4. Run: node scripts/get-notion-tokens.js <code>
 */

const fs = require('fs');
const path = require('path');

// No dotenv needed for Node 23+ when using --env-file

const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
const redirectUri = "https://agency.innergcomplete.com"; // Must match what's in Notion Dashboard

async function getTokens(code) {
    if (!clientId || !clientSecret) {
        console.error("❌ Missing NOTION_OAUTH_CLIENT_ID or NOTION_OAUTH_CLIENT_SECRET in .env.local");
        return;
    }

    if (!code) {
        console.log("\n🚀 Notion Token Retrieval");
        console.log("-------------------------");
        console.log("1. Visit this URL in your browser:\n");
        console.log(process.env.NOTION_AUTHORIZATION_URL || `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`);
        console.log("\n2. After authorizing, copy the 'code' from the URL parameter in your browser.");
        console.log("3. Run this script again with the code: node scripts/get-notion-tokens.js <YOUR_CODE>\n");
        return;
    }

    console.log("⏳ Exchanging code for tokens...");

    try {
        const response = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error("❌ Notion API Error:", data.error_description || data.error);
            return;
        }

        console.log("\n✅ Success! Here are your Notion credentials:\n");
        console.log(`Access Token:  ${data.access_token}`);
        console.log(`Workspace ID:  ${data.workspace_id}`);
        console.log(`Workspace Name: ${data.workspace_name}`);
        console.log(`Workspace Icon: ${data.workspace_icon}`);
        console.log(`Bot ID:         ${data.bot_id}`);
        
        console.log("\n💡 Add these to your .env.local or use them to configure your Notion Connector in the Admin dashboard.");
        
    } catch (err) {
        console.error("❌ Network or Parsing Error:", err.message);
    }
}

const code = process.argv[2];
getTokens(code);
