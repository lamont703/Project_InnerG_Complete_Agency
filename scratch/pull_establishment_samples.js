require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const establishmentTypes = [
  'Full Service Establishment',
  'Mini Establishment',
  'Manicurist/Esthetician Establishment',
  'Esthetician Establishment',
  'Manicurist Establishment',
  'Eyelash Extension Establishment',
  'Hair Weaving  Establishment', // Keep double space for API query
  'Mobile Establishment'
];

async function pullEstablishmentSamples() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';

  if (!keyID || !keySecret) {
    console.error('Error: TexasBarberCosApiKeyID or TexasBarberCosApiKeySecret is not defined in .env.local');
    process.exit(1);
  }

  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');
  console.log('Starting Socrata pull for all 8 TDLR Establishment license types...\n');

  for (const type of establishmentTypes) {
    // Generate clean snake_case filename
    const cleanName = type
      .replace(/\//g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    
    const filename = `Texas_API_${cleanName}_Sample.json`;
    const outputPath = path.join(__dirname, '../public', filename);

    console.log(`Fetching 5 records for: "${type}"...`);

    const query = {
      query: `SELECT * WHERE \`license_type\` = '${type}'`,
      page: {
        pageNumber: 1,
        pageSize: 5
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`  Failed for "${type}": ${response.status} ${errorText}`);
        continue;
      }

      const data = await response.json();
      console.log(`  Successfully pulled ${data.length} records.`);

      // Write JSON file to public/
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`  Saved to: public/${filename}\n`);

    } catch (err) {
      console.error(`  Error pulling data for "${type}":`, err.message);
    }
  }

  console.log('All establishment sample pulls complete!');
}

pullEstablishmentSamples();
