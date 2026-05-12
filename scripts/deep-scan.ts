import { DataStoreServiceClient } from "@google-cloud/discoveryengine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function deepScan() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = "global";

  console.log(`🕵️ Deep Scanning Project: ${projectId}...`);

  const client = new DataStoreServiceClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  const parent = `projects/${projectId}/locations/${location}/collections/default_collection`;

  try {
    const [dataStores] = await client.listDataStores({ parent });
    
    if (dataStores.length === 0) {
      console.log(`\n⚠️ No Data Stores found in ${location}.`);
    } else {
      console.log("\n💎 FOUND DATA STORES:");
      console.log("-----------------------------------");
      dataStores.forEach(ds => {
        console.log(`- Name: ${ds.displayName}`);
        console.log(`- ID: ${ds.name?.split('/').pop()}`);
        console.log(`- Path: ${ds.name}`);
      });
      console.log("-----------------------------------");
    }

  } catch (error: any) {
    console.error(`\n❌ DEEP SCAN ERROR`);
    console.error("Detail:", error.message);
  }
}

deepScan();
