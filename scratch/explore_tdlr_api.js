require('dotenv').config({ path: '.env.local' });

async function exploreTDLRData() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';

  console.log('Exploring TDLR Dataset (7358-krk7) with Basic Auth...');

  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  const query = {
    query: "SELECT `license_type`, count(*) as total GROUP BY `license_type` HAVING `license_type` LIKE '%Barber%'",
    page: {
      pageNumber: 1,
      pageSize: 100
    }
  };

  try {
    // Try with Basic Auth
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
      console.warn(`Basic Auth failed: ${response.status} ${errorText}`);
      
      console.log('Trying without any token (throttled)...');
      const response2 = await fetch(`${url}?pageSize=5`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'SELECT *' })
      });
      if (response2.ok) {
          const data2 = await response2.json();
          console.log('Success without token (limited):');
          console.table(data2);
          return data2;
      } else {
          const errorText2 = await response2.text();
          throw new Error(`Public API Error: ${response2.status} ${errorText2}`);
      }
    }

    const data = await response.json();
    console.log('Found Barber-related License Types:');
    console.table(data);

    return data;
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

exploreTDLRData();
