const fs = require('fs');
const path = require('fs');

function cleanName(name) {
    if (!name) return "";
    return name.toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function createBenchmarkingCSV() {
    const apiSchoolsPath = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas_API_All_Schools.json';
    const rawDataPath = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt';
    const outputPath = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Barber School Benchmarking.csv';

    console.log('Loading API Schools (859 institutions)...');
    const apiSchools = JSON.parse(fs.readFileSync(apiSchoolsPath, 'utf8'));

    console.log('Parsing Raw Board Data...');
    const rawData = fs.readFileSync(rawDataPath, 'utf8');
    const studentRecords = [];
    const rosterLines = rawData.split('\n');
    
    const studentRegex = /^(\d{8})\s+(.*?)\s+([A-Z0-9_\-\.\']+\s*,\s+[A-Z0-9\s_\-\.\']+)\s+([A-Z].*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)/;

    for (let line of rosterLines) {
        line = line.trim();
        if (!line) continue;
        const match = line.match(studentRegex);
        if (match) {
            const student = {
                schoolCode: match[1],
                schoolName: match[2].trim(),
                studentName: match[3].trim().replace(/ TX$/, ""),
                testName: match[4].trim(),
                testDate: match[5].trim(),
                result: match[6].trim(),
                score: match[7].trim()
            };
            studentRecords.push(student);
        }
    }

    console.log(`Parsed ${studentRecords.length} student records from roster.`);

    // Create a lookup for API schools by cleaned name, sorted to prioritize ACTIVE licenses
    const apiLookup = new Map();
    const now = new Date();
    
    for (const school of apiSchools) {
        const cleaned = cleanName(school.business_name);
        if (!apiLookup.has(cleaned)) {
            apiLookup.set(cleaned, []);
        }
        apiLookup.get(cleaned).push(school);
    }

    // Sort each group: ACTIVE first, then by latest expiration
    for (const [name, schools] of apiLookup.entries()) {
        schools.sort((a, b) => {
            const expA = new Date(a.license_expiration_date_mmddccyy);
            const expB = new Date(b.license_expiration_date_mmddccyy);
            const activeA = expA > now ? 1 : 0;
            const activeB = expB > now ? 1 : 0;
            if (activeA !== activeB) return activeB - activeA;
            return expB - expA;
        });
    }

    // Now map students to API schools
    const benchmarkData = [];
    const matchedApiLicenses = new Set();

    for (const student of studentRecords) {
        const cleanedRosterName = cleanName(student.schoolName);
        let apiMatch = null;
        
        // Try exact cleaned name match
        if (apiLookup.has(cleanedRosterName)) {
            apiMatch = apiLookup.get(cleanedRosterName)[0];
        } else {
            // Try fuzzy/partial match
            for (const [apiCleaned, schools] of apiLookup.entries()) {
                if (apiCleaned.includes(cleanedRosterName) || cleanedRosterName.includes(apiCleaned)) {
                    apiMatch = schools[0];
                    break;
                }
            }
        }

        // Determine status
        let status = "N/A";
        if (apiMatch && apiMatch.license_expiration_date_mmddccyy) {
            const expStr = apiMatch.license_expiration_date_mmddccyy;
            const expDate = new Date(expStr);
            if (!isNaN(expDate.getTime())) {
                status = expDate > now ? "ACTIVE" : "EXPIRED";
            }
        }

        const row = {
            "School Code": student.schoolCode,
            "License Number": apiMatch ? apiMatch.license_number : "N/A",
            "School Name (Roster)": student.schoolName,
            "School Name (API)": apiMatch ? apiMatch.business_name : "N/A",
            "License Type": apiMatch ? apiMatch.license_type : "N/A",
            "Student Name": student.studentName,
            "Test Name": student.testName,
            "Test Date": student.testDate,
            "Score": student.score,
            "Result": student.result,
            "City": apiMatch && apiMatch.business_city_state_zip ? apiMatch.business_city_state_zip.split(' ')[0] : "N/A",
            "County": apiMatch ? apiMatch.business_county : "N/A",
            "License Status": status,
            "License Expiration": apiMatch ? apiMatch.license_expiration_date_mmddccyy : "N/A",
            "Latitude": apiMatch && apiMatch.business_mailing ? apiMatch.business_mailing.coordinates[1] : "",
            "Longitude": apiMatch && apiMatch.business_mailing ? apiMatch.business_mailing.coordinates[0] : ""
        };
        benchmarkData.push(row);
        
        if (apiMatch) {
            matchedApiLicenses.add(apiMatch.license_number);
        }
    }

    // Add schools from API that have NO student data
    for (const school of apiSchools) {
        if (!matchedApiLicenses.has(school.license_number)) {
            let status = "N/A";
            if (school.license_expiration_date_mmddccyy) {
                const expDate = new Date(school.license_expiration_date_mmddccyy);
                if (!isNaN(expDate.getTime())) {
                    status = expDate > now ? "ACTIVE" : "EXPIRED";
                }
            }

            const row = {
                "School Code": "N/A",
                "License Number": school.license_number,
                "School Name (Roster)": "N/A",
                "School Name (API)": school.business_name,
                "License Type": school.license_type,
                "Student Name": "NO DATA",
                "Test Name": "N/A",
                "Test Date": "N/A",
                "Score": "N/A",
                "Result": "N/A",
                "City": school.business_city_state_zip ? school.business_city_state_zip.split(' ')[0] : "N/A",
                "County": school.business_county,
                "License Status": status,
                "License Expiration": school.license_expiration_date_mmddccyy,
                "Latitude": school.business_mailing ? school.business_mailing.coordinates[1] : "",
                "Longitude": school.business_mailing ? school.business_mailing.coordinates[0] : ""
            };
            benchmarkData.push(row);
        }
    }

    console.log(`Created benchmarking dataset with ${benchmarkData.length} total rows.`);

    // Convert to CSV
    const headers = Object.keys(benchmarkData[0]);
    const csvContent = [
        headers.join(','),
        ...benchmarkData.map(row => headers.map(h => {
            let val = row[h] === null || row[h] === undefined ? "" : String(row[h]);
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(','))
    ].join('\n');

    fs.writeFileSync(outputPath, csvContent);
    console.log(`Saved to ${outputPath}`);
}

createBenchmarkingCSV();
