require('dotenv').config({ path: '.env.local' });

async function listAllLicenseTypes() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Listing all License Types in TDLR dataset...');

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
    console.log(`Found ${data.length} unique license types.`);
    
    // Filter for anything that might be relevant to Barber
    const relevant = data.filter(item => item.license_type && item.license_type.toLowerCase().includes('barber'));
    console.log('Relevant Barber types:');
    console.table(relevant);

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listAllLicenseTypes();
