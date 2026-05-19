require('dotenv').config({ path: '.env.local' });

async function listInstructorTypes() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Querying all License Types with "Instruct" in the name...');

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
    
    // Filter for anything that contains 'Instruct'
    const instructorTypes = data.filter(item => 
      item.license_type && 
      (item.license_type.toLowerCase().includes('instruct') || 
       item.license_type.toLowerCase().includes('teach') ||
       item.license_type.toLowerCase().includes('educator'))
    );
    
    console.log('Instructor-related License Types in TDLR:');
    console.table(instructorTypes);

    return instructorTypes;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listInstructorTypes();
