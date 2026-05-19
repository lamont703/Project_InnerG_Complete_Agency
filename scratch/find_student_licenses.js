require('dotenv').config({ path: '.env.local' });

async function findStudentLicenses() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Searching for student-related license types...');

  const query = {
    query: "SELECT `license_type`, count(*) as total GROUP BY `license_type` HAVING `license_type` LIKE '%Student%' OR `license_type` LIKE '%Permit%'",
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

    const data = await response.json();
    console.table(data);

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findStudentLicenses();
