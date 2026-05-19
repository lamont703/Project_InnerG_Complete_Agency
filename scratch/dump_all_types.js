require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function dumpAllTypes() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Querying all unique license types...');

  const query = {
    query: "SELECT `license_type`, count(*) as total GROUP BY `license_type` ORDER BY total DESC",
    page: {
      pageNumber: 1,
      pageSize: 500
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
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    fs.writeFileSync('scratch/all_types.json', JSON.stringify(data, null, 2));
    console.log('Successfully saved to scratch/all_types.json');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

dumpAllTypes();
