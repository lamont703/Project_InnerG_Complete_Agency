import React from 'react';
import fs from 'fs';
import path from 'path';
import ContinuingEducationClient from './ContinuingEducationClient';

export const dynamic = 'force-dynamic';

interface RawSchool {
  license_type: string;
  license_number: string;
  business_county: string;
  business_name: string;
  business_address_line1: string;
  business_city_state_zip: string;
  business_telephone: string;
  license_expiration_date_mmddccyy: string;
  owner_name: string;
}

export default async function BarberCosContinuingEducationPage() {
  let schoolsList: RawSchool[] = [];
  let errorMsg = '';

  try {
    const schoolsPath = path.join(process.cwd(), 'public/Texas_API_Barber_Schools.json');
    if (fs.existsSync(schoolsPath)) {
      const content = fs.readFileSync(schoolsPath, 'utf-8');
      schoolsList = JSON.parse(content);
    } else {
      console.warn('Texas_API_Barber_Schools.json not found in public directory. Initializing with fallback.');
    }
  } catch (err: any) {
    console.error('Error loading barber schools list:', err.message);
    errorMsg = `Failed to load school registers: ${err.message}`;
  }

  return (
    <ContinuingEducationClient 
      schools={schoolsList} 
      errorMsg={errorMsg}
    />
  );
}
