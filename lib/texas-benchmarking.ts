import fs from 'fs';
import path from 'path';

export interface SchoolRanking {
    schoolCode: string;
    schoolName: string;
    licenseNumber: string;
    licenseType: string;
    city: string;
    county: string;
    totalExams: number;
    passes: number;
    fails: number;
    passRate: number;
    status: string;
}

export function getTexasSchoolRankings(): SchoolRanking[] {
    const csvPath = path.join(process.cwd(), 'public', 'Barber School Benchmarking.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');

    const testFilter = "Class A Barber Written English";
    const schools = new Map<string, any>();

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Simple CSV parser for quoted strings
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let char of lines[i]) {
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
        const licenseNumber = values[1];
        const schoolNameRoster = values[2];
        const schoolNameAPI = values[3];
        const licenseType = values[4];
        const studentName = values[5];
        const testName = values[6];
        const result = values[9];
        const city = values[10];
        const county = values[11];
        const status = values[12];

        if (testName !== testFilter || studentName === "NO DATA" || schoolCode === "N/A") continue;

        if (!schools.has(schoolCode)) {
            schools.set(schoolCode, {
                schoolCode,
                schoolName: schoolNameAPI !== "N/A" ? schoolNameAPI : schoolNameRoster,
                licenseNumber,
                licenseType,
                city,
                county,
                totalExams: 0,
                passes: 0,
                fails: 0,
                status
            });
        }

        const s = schools.get(schoolCode);
        s.totalExams++;
        if (result === "PASS") s.passes++;
        if (result === "FAIL") s.fails++;
    }

    const ranking: SchoolRanking[] = Array.from(schools.values()).map(s => ({
        ...s,
        passRate: s.totalExams > 0 ? (s.passes / s.totalExams) * 100 : 0
    }));

    return ranking.sort((a, b) => b.passRate - a.passRate || b.totalExams - a.totalExams);
}
