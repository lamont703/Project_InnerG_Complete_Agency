import React from 'react';
import fs from 'fs';
import path from 'path';
import BarberPlacementMatcherClient from './BarberPlacementMatcherClient';

export const dynamic = 'force-dynamic';

interface RawShop {
  licenseType: string;
  licenseNumber: string;
  businessCounty: string;
  businessName: string;
  addressLine1: string;
  cityStateZip: string;
  telephone: string;
  expirationDate: string;
  ownerName: string;
  subtype: string;
  continuingEducation: string;
  longitude: number;
  latitude: number;
}

export default async function TexasBarbershopPlacementMatcher() {
  let sampledShops: RawShop[] = [];
  let errorMsg = '';

  try {
    const csvPath = path.join(process.cwd(), 'public/2026 Texas Barber and Beauty Salons.csv');
    
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');
      const allShops: RawShop[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row: string[] = [];
        let inQuotes = false;
        let currentField = '';

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(currentField.replace(/^"|"$/g, '').trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        row.push(currentField.replace(/^"|"$/g, '').trim());

        if (row.length >= 19) {
          const lon = parseFloat(row[17]);
          const lat = parseFloat(row[18]);

          // Strip out zero coordinates and ensure valid geocodes
          if (!isNaN(lon) && !isNaN(lat) && lon !== 0 && lat !== 0) {
            // High-fidelity light optimization: only select essential fields needed by the interactive client
            allShops.push({
              licenseType: row[0],
              licenseNumber: row[1],
              businessCounty: row[2],
              businessName: row[3],
              addressLine1: row[4],
              cityStateZip: row[6],
              telephone: row[7],
              expirationDate: row[8],
              ownerName: row[9],
              subtype: row[15],
              continuingEducation: row[16],
              longitude: lon,
              latitude: lat,
            });
          }
        }
      }

      // Group by major Texas city hubs
      const cities = ['DALLAS', 'HOUSTON', 'AUSTIN', 'SAN ANTONIO', 'FORT WORTH', 'EL PASO'];
      const groups: { [key: string]: RawShop[] } = {
        DALLAS: [], HOUSTON: [], AUSTIN: [], 'SAN ANTONIO': [], 'FORT WORTH': [], 'EL PASO': [], OTHER: []
      };

      for (const shop of allShops) {
        const addrUpper = shop.cityStateZip.toUpperCase();
        let matched = false;
        for (const city of cities) {
          if (addrUpper.includes(city)) {
            groups[city].push(shop);
            matched = true;
            break;
          }
        }
        if (!matched) {
          groups.OTHER.push(shop);
        }
      }

      // Pass the entire, unfiltered dataset to the frontend client to map all 35,000+ shops
      cities.forEach(city => {
        sampledShops = sampledShops.concat(groups[city]);
      });

      // Include all remaining non-major municipal areas across Texas
      sampledShops = sampledShops.concat(groups.OTHER);

      console.log(`Parsed CSV dataset. Built rich Sovereign geospace index of ${sampledShops.length} active storefronts.`);
    } else {
      errorMsg = 'CSV dataset not found in public directory.';
    }
  } catch (err: any) {
    console.error('Error parsing salons CSV:', err.message);
    errorMsg = `Failed to load CSV: ${err.message}`;
  }

  return (
    <BarberPlacementMatcherClient 
      initialShops={sampledShops} 
      errorMsg={errorMsg}
    />
  );
}
