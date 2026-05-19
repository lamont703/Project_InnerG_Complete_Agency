require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function checkNewLicenseTypes() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Pulling sample of Cosmetology Private Schools to see if they are actually Barber Schools...');

  const query = {
    query: "SELECT * WHERE `license_type` IN ('Cosmetology Private School', 'Cosmetology Junior College') AND `license_expiration_date_mmddccyy` > '05/16/2026' LIMIT 20",
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
    console.table(data.map(d => ({ name: d.business_name, type: d.license_type, exp: d.license_expiration_date_mmddccyy })));

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkNewLicenseTypes();
