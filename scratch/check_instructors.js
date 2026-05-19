require('dotenv').config({ path: '.env.local' });

async function checkInstructors() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Querying samples where license_subtype is "I"...');

  const query = {
    query: "SELECT * WHERE `license_subtype` = 'I'",
    page: {
      pageNumber: 1,
      pageSize: 10
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
    console.log('Found instructor samples:');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkInstructors();
