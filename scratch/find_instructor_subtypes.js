require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function listAllSubtypes() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Querying all unique license subtypes...');

  const query = {
    query: "SELECT `license_subtype`, count(*) as total GROUP BY `license_subtype` ORDER BY total DESC",
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
    fs.writeFileSync('scratch/all_subtypes.json', JSON.stringify(data, null, 2));
    
    // Also filter for instructor keywords in subtypes
    const instructorSubtypes = data.filter(item => 
      item.license_subtype && 
      (item.license_subtype.toLowerCase().includes('instruct') ||
       item.license_subtype.toLowerCase().includes('teach') ||
       item.license_subtype.toLowerCase().includes('educat'))
    );
    
    console.log('Found Subtypes containing Instructor keywords:');
    console.table(instructorSubtypes);
    
    console.log('All subtypes saved to scratch/all_subtypes.json');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listAllSubtypes();
