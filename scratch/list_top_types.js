require('dotenv').config({ path: '.env.local' });

async function listTopLicenseTypes() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Listing top 20 License Types...');

  const query = {
    query: "SELECT `license_type`, count(*) as total GROUP BY `license_type` ORDER BY total DESC",
    page: {
      pageNumber: 1,
      pageSize: 20
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

listTopLicenseTypes();
