require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const CSV_HEADER = [
  'License Type',
  'License Number',
  'Business County',
  'Business Name',
  'Business Address Line1',
  'Business Address Line2',
  'Business City State Zip',
  'Business Telephone',
  'License Expiration Date',
  'Owner Name',
  'Mailing Address Line1',
  'Mailing Address Line2',
  'Mailing Address City State Zip',
  'Mailing Address County',
  'Owner Telephone',
  'License Subtype',
  'Continuing Education Flag',
  'Longitude',
  'Latitude'
].map(h => `"${h}"`).join(',') + '\n';

function escapeCsvField(val) {
  if (val === undefined || val === null) return '""';
  // Stringify and escape quotes
  const str = String(val).replace(/"/g, '""').trim();
  return `"${str}"`;
}

async function pullAllBarbers() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';

  if (!keyID || !keySecret) {
    console.error('Error: TexasBarberCosApiKeyID or TexasBarberCosApiKeySecret is not defined in .env.local');
    process.exit(1);
  }

  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');
  const outputPath = path.join(__dirname, '../public/2026 Texas Barbers List.csv');

  // Write header to output file
  fs.writeFileSync(outputPath, CSV_HEADER, 'utf-8');

  console.log('Initiating bulk download of all "Class A Barber" records from live TDLR API...');
  console.log('Target file: public/2026 Texas Barbers List.csv\n');

  let pageNum = 1;
  const pageSize = 5000;
  let totalFetched = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${pageNum} (records ${totalFetched + 1} - ${totalFetched + pageSize})...`);

    const query = {
      query: "SELECT * WHERE `license_type` = 'Class A Barber'",
      page: {
        pageNumber: pageNum,
        pageSize: pageSize
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
        throw new Error(`API Error on page ${pageNum}: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        console.log('No more records returned from API.');
        hasMore = false;
        break;
      }

      console.log(`  Fetched ${data.length} records. Processing...`);

      let csvLines = '';
      for (const row of data) {
        // Extract longitude and latitude from point object if present
        let lon = '';
        let lat = '';
        if (row.business_mailing && Array.isArray(row.business_mailing.coordinates)) {
          lon = row.business_mailing.coordinates[0];
          lat = row.business_mailing.coordinates[1];
        }

        const fields = [
          row.license_type,
          row.license_number,
          row.business_county,
          row.business_name,
          row.business_address_line1,
          row.business_address_line2,
          row.business_city_state_zip,
          row.business_telephone,
          row.license_expiration_date_mmddccyy,
          row.owner_name,
          row.mailing_address_line1,
          row.mailing_address_line2,
          row.mailing_address_city_state_zip,
          row.mailing_address_county,
          row.owner_telephone,
          row.license_subtype,
          row.continuing_education_flag,
          lon,
          lat
        ].map(escapeCsvField);

        csvLines += fields.join(',') + '\n';
      }

      // Append lines to CSV
      fs.appendFileSync(outputPath, csvLines, 'utf-8');

      totalFetched += data.length;
      console.log(`  Appended to CSV. Cumulative total: ${totalFetched} records.\n`);

      if (data.length < pageSize) {
        console.log('Reached the final page of data.');
        hasMore = false;
      } else {
        pageNum++;
      }

    } catch (err) {
      console.error('Error during paginated fetch:', err.message);
      process.exit(1);
    }
  }

  console.log(`Success! File successfully generated with ${totalFetched} records.`);
  console.log(`Output: public/2026 Texas Barbers List.csv`);
}

pullAllBarbers();
