const { createClient } = require('@supabase/supabase-js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const outputDir = path.join(__dirname, '../public/qr_codes');

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

async function run() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const { data: schools, error } = await supabase
    .from("agent_barber_school_leads")
    .select("id, school_name, formatted_address");

  if (error) {
    console.error("Error fetching schools:", error);
    return;
  }

  console.log(`Found ${schools.length} schools. Generating QR codes...`);

  let count = 0;
  for (const school of schools) {
    if (!school.school_name) continue;

    const source = encodeURIComponent(school.school_name);
    const address = encodeURIComponent(school.formatted_address || "Texas");
    const url = `https://agency.innergcomplete.com/barber-beauty-network?source=${source}&address=${address}`;

    const safeName = sanitizeFilename(school.school_name).substring(0, 50);
    // Include part of the address in the filename to ensure uniqueness and readability
    const safeAddr = sanitizeFilename(school.formatted_address || "").substring(0, 20);
    
    const filename = `${safeName}_${safeAddr}.png`;
    const filepath = path.join(outputDir, filename);

    try {
      await qrcode.toFile(filepath, url, {
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 600,
        margin: 2
      });
      console.log(`Generated: ${filename}`);
      count++;
    } catch (err) {
      console.error(`Error generating QR for ${school.school_name}:`, err);
    }
  }

  console.log(`\n✅ Successfully generated ${count} QR codes in public/qr_codes/`);
}

run();
