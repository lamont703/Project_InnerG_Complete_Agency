require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function sampleBarberStudents() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Sampling Class A Barber data...');

  const query = {
    query: "SELECT * WHERE `license_type` = 'Class A Barber'",
    page: {
      pageNumber: 1,
      pageSize: 100
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
    console.log(`Successfully pulled ${data.length} Class A Barber records.`);
    
    fs.writeFileSync('/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas_API_Barber_Students_Sample.json', JSON.stringify(data, null, 2));
    console.log('Saved to public/Texas_API_Barber_Students_Sample.json');

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

sampleBarberStudents();
