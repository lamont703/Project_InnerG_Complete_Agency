require('dotenv').config({ path: '.env.local' });

async function findActiveSchools() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Searching for any ACTIVE schools (Expiration > 2026-05-16)...');

  const query = {
    // Note: license_expiration_date_mmddccyy is a string like "MM/DD/YYYY"
    // We'll try to filter by year >= 2027 or something simple if possible, or just pull a sample.
    query: "SELECT `license_type`, `license_expiration_date_mmddccyy`, count(*) as total GROUP BY `license_type`, `license_expiration_date_mmddccyy` ORDER BY `license_expiration_date_mmddccyy` DESC",
    page: {
      pageNumber: 1,
      pageSize: 50
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

    const data = await response.json();
    console.table(data);

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findActiveSchools();
