const fs = require('fs');
const path = require('path');

function getTexasSchoolRankings() {
    const csvPath = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Barber School Benchmarking.csv';
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');

    const testFilter = "Class A Barber Written English";
    const schools = new Map();

    console.log(`Processing ${lines.length} lines...`);

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        const schoolCode = values[0];
        const studentName = values[5];
        const testName = values[6];

        if (testName !== testFilter || studentName === "NO DATA" || schoolCode === "N/A") continue;

        if (!schools.has(schoolCode)) {
            schools.set(schoolCode, {
                schoolCode,
                schoolName: values[3] !== "N/A" ? values[3] : values[2],
                totalExams: 0,
                passes: 0,
                fails: 0
            });
        }

        const s = schools.get(schoolCode);
        s.totalExams++;
        const result = values[9];
        if (result === "PASS") s.passes++;
        if (result === "FAIL") s.fails++;
    }

    console.log(`Found ${schools.size} schools matching criteria.`);
    return Array.from(schools.values());
}

const res = getTexasSchoolRankings();
console.log('Sample ranking:', res.slice(0, 3));
