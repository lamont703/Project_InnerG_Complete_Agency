require('dotenv').config({ path: '.env.local' });

async function checkFields() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Checking all available fields for one record...');

  const query = {
    query: "SELECT *",
    page: {
      pageNumber: 1,
      pageSize: 1
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
    console.log('Full record structure:');
    console.log(JSON.stringify(data[0], null, 2));

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFields();
