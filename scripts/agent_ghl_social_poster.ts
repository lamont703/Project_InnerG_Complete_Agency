async function loadEnvFile(filePath: string) {
  try {
    const envText = await Deno.readTextFile(filePath);
    envText.split("\n").forEach(line => {
      const cleanLine = line.replace(/\r/g, '');
      if (cleanLine.includes("=") && !cleanLine.startsWith("#")) {
        const [key, ...rest] = cleanLine.split("=");
        Deno.env.set(key.trim(), rest.join("=").trim().replace(/^"|"$/g, ''));
      }
    });
  } catch (e) {
    // File might not exist
  }
}
await loadEnvFile(".env");
await loadEnvFile(".env.local");
import * as path from "https://deno.land/std@0.208.0/path/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GhlProvider } from "../supabase/functions/_shared/lib/providers/ghl.ts";

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const ghlApiKey = "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4";
const locationId = "QLyYYRoOhCg65lKW9HDX";

async function uploadMedia(filePath: string): Promise<string> {
  const fileInfo = await Deno.stat(filePath);
  const fileContent = await Deno.readFile(filePath);
  
  const blob = new Blob([fileContent], { type: "video/mp4" });
  const formData = new FormData();
  formData.append("file", blob, path.basename(filePath));

  console.log(`📤 Uploading ${filePath} (${Math.round(fileInfo.size / 1024 / 1024)}MB) to GHL Media Library...`);
  
  const response = await fetch(`${GHL_API_BASE}/medias/upload-file`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ghlApiKey}`,
      "Version": "2021-07-28"
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Media upload failed: ${response.status} ${err}`);
  }

  const data = await response.json();
  console.log(`✅ Upload complete! Raw Response: ${JSON.stringify(data)}`);
  return data.url || data.fileUrl || data.fileId || ""; 
}

async function runGhlSocialAgent() {
  console.log("======================================================");
  console.log("🚀 INITIATING GHL SOCIAL POSTER AGENT");
  console.log("======================================================");

  // 1. Initialize Provider
  Deno.env.set("GHL_API_KEY", ghlApiKey);
  const ghl = new GhlProvider();

  // 2. Find Instagram Account
  console.log("🔍 Fetching connected social accounts...");
  const accounts = await ghl.listSocialAccounts(locationId);
  const igAccounts = accounts.filter((a: any) => 
    (a.accountType && a.accountType.toLowerCase() === "instagram") || 
    (a.platform && a.platform.toLowerCase() === "instagram") || 
    (a.name && a.name.toLowerCase().includes("instagram"))
  );
  
  if (igAccounts.length === 0) {
    console.error("❌ No Instagram account found in GHL Social Planner for this location!");
    return;
  }
  
  console.log(`✅ Found Instagram Account: ${igAccounts[0].name}`);
  const igAccountId = igAccounts[0].id || igAccounts[0].accountId;

  // 3. Upload Media
  const videoPath = path.join(Deno.cwd(), "public", "network-bg-overlay.mp4");
  const mediaUrl = await uploadMedia(videoPath);
  
  // 4. Publish Post
  console.log("📝 Publishing post to Instagram via direct V2 payload...");
  const caption = "Check out this amazing opportunity for barbers!\n\n#BarberLife #Barbershop #DallasBarbers";
  
  const postBody = {
    accountIds: [igAccountId],
    type: "reel",
    summary: caption,
    userId: "SqbVVbHNjxmEHxJTw59e",
    media: [
      { 
        url: mediaUrl,
        type: "video/mp4",
        thumbnail: "",
        defaultThumb: ""
      }
    ]
  };

  const postRes = await fetch(`${GHL_API_BASE}/social-media-posting/${locationId}/posts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ghlApiKey}`,
      "Version": "2023-02-21",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(postBody)
  });

  const postResult = await postRes.text();
  if (!postRes.ok) throw new Error("Post Failed: " + postResult);
  console.log("🎉 Post successfully published via GHL!");
  console.log(postResult);

  // 5. Save to Supabase Post Records Archive
  console.log("💾 Archiving post to Supabase...");
  
  // Find project id
  const { data: projects, error: projectsErr } = await supabase
    .from("projects")
    .select("id, name");
    
  let project = projects?.find(p => p.name.toLowerCase().includes("inner g") || p.name.toLowerCase().includes("innerg"));
  
  if (!project && projects && projects.length > 0) {
    // Fallback to first project
    project = projects[0];
  }
    
  if (!project) {
    console.log("⚠️ Could not find any projects to save record. Error:", projectsErr, "Available:", projects);
    return;
  }

  // Parse details
  const parsedResponse = JSON.parse(postResult);
  const externalPostId = parsedResponse.postId || parsedResponse.traceId || "";
  const hashtags = caption.match(/#[a-zA-Z0-9_]+/g) || [];

  const { error: insertError } = await supabase
    .from("social_post_records")
    .insert({
      project_id: project.id,
      platform: "instagram",
      media_url: mediaUrl,
      caption: caption,
      hashtags: hashtags,
      external_post_id: externalPostId
    });

  if (insertError) {
    console.error("❌ Failed to save post record to Supabase:", insertError);
  } else {
    console.log(`✅ Permanently archived post for project ${project.id}!`);
  }
}

runGhlSocialAgent().catch(err => {
  console.error("❌ Automation Error:", err);
  Deno.exit(1);
});
