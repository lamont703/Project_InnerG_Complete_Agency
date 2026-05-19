import fs from 'fs';
import path from 'path';

export interface GooglePlacesData {
    placeId: string;
    name: string;
    address: string;
    lat: string;
    lng: string;
    telephone: string;
    website: string;
    rating: string;
    totalReviews: string;
    types: string;
    businessStatus: string;
    openingHours: string;
}

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
    firstTimePassRate: number;
    repeaterPassRate: number;
    firstTimeCount: number;
    repeaterCount: number;
    countyAvgPassRate: number;
    stateAvgPassRate: number;
    status: string;
    isAccredited: boolean;
    googleData: GooglePlacesData | null;
}

interface CSVFileConfig {
    year: number;
    filename: string;
}

const files: CSVFileConfig[] = [
    { year: 2023, filename: '2023 Texas Barber Written Exam Pass-Fail Scores Both First Time and Repeat.csv' },
    { year: 2024, filename: '2024 Texas Barber Written Exam Pass-Fail Scores Both First Time and Repeat.csv' },
    { year: 2025, filename: '2025 Texas Barber Written Pass-Fail Scores Both First Time and Repeat.csv' },
    { year: 2026, filename: '2026 Texas Barber Written Exam Pass-Fail Scores Both First Time and Repeat.csv' },
];

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;
    const len = line.length;
    for (let i = 0; i < len; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(line.slice(start, i).replace(/^"|"$/g, ''));
            start = i + 1;
        }
    }
    result.push(line.slice(start).replace(/^"|"$/g, ''));
    return result;
}

function cleanName(n: string): string {
    return n.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\b(inc|llc|corp|ltd|co)\b/g, '');
}

export function getTexasSchoolRankings(year: string = 'all'): SchoolRanking[] {
    // 1. Load the 2026 Accredited Barber Schools list as source of truth
    const accreditedSet = new Set<string>();
    const accreditedPath = path.join(
        process.cwd(), 
        'public', 
        'Texas Accredited Barber Schools', 
        '2026 Texas Accredited Barber Schools.csv'
    );
    
    if (fs.existsSync(accreditedPath)) {
        const content = fs.readFileSync(accreditedPath, 'utf8');
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseCSVLine(lines[i]).map(v => v.trim());
            const schoolName = values[0];
            if (schoolName && schoolName !== "School") {
                accreditedSet.add(cleanName(schoolName));
            }
        }
    }

    // Load Google Places Premium Data
    const googleDataMap = new Map<string, GooglePlacesData>();
    const googlePath = path.join(process.cwd(), 'public', '2026 Texas Accredited Schools Plus Google Places Data.csv');
    if (fs.existsSync(googlePath)) {
        const content = fs.readFileSync(googlePath, 'utf8');
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseCSVLine(lines[i]).map(v => v.trim());
            if (values.length < 16) continue;
            const schoolName = values[0];
            if (schoolName && schoolName !== "School") {
                googleDataMap.set(cleanName(schoolName), {
                    placeId: values[4],
                    name: values[5],
                    address: values[6],
                    lat: values[7],
                    lng: values[8],
                    telephone: values[9],
                    website: values[10],
                    rating: values[11],
                    totalReviews: values[12],
                    types: values[13],
                    businessStatus: values[14],
                    openingHours: values[15]
                });
            }
        }
    }

    function checkAccreditation(name: string): boolean {
        const c = cleanName(name);
        for (const acc of accreditedSet) {
            if (c === acc || c.includes(acc) || acc.includes(c)) {
                return true;
            }
        }
        return false;
    }

    function getGoogleData(name: string): GooglePlacesData | null {
        const c = cleanName(name);
        for (const [key, data] of googleDataMap.entries()) {
            if (c === key || c.includes(key) || key.includes(c)) {
                return data;
            }
        }
        return null;
    }

    // 2. Gather rich metadata for schools (city, county, license status, type) from historical roster
    const metadataMap = new Map<string, { city: string, county: string, status: string, licenseType: string }>();
    const benchPath = path.join(process.cwd(), 'public', 'Barber School Benchmarking.csv');
    
    if (fs.existsSync(benchPath)) {
        const content = fs.readFileSync(benchPath, 'utf8');
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseCSVLine(lines[i]).map(v => v.trim());
            const code = values[0];
            if (!code || code === "School Code" || code === "N/A") continue;
            
            if (!metadataMap.has(code)) {
                metadataMap.set(code, {
                    city: values[10] || "UNKNOWN",
                    county: values[11] || "UNKNOWN",
                    status: values[12] || "ACTIVE",
                    licenseType: values[4] || "Barber School"
                });
            }
        }
    }

    // 3. Identify which yearly CSV files to load
    const filesToLoad = files.filter(f => year === 'all' || String(f.year) === year);

    const schoolStats = new Map<string, any>();
    const countyStats = new Map<string, { passes: number, total: number }>();
    let statePasses = 0;
    let stateTotal = 0;

    // 4. Aggregate data across selected files
    for (const fileInfo of filesToLoad) {
        const csvPath = path.join(process.cwd(), 'public', 'Texas Pass Fail Scores', fileInfo.filename);
        if (!fs.existsSync(csvPath)) continue;

        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split('\n');

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseCSVLine(lines[i]).map(v => v.trim());
            const schoolCode = values[0];
            const schoolName = values[1];
            const studentName = values[2];
            const testName = values[3];
            const result = values[5];
            const attemptType = values[7] || "FIRST TIME";

            if (!schoolCode || schoolCode === "School Code" || !testName) continue;

            const testNameLower = testName.toLowerCase();
            if (!testNameLower.includes("class a barber written english") && !testNameLower.includes("barber written english")) {
                continue;
            }

            if (studentName === "NO DATA" || schoolCode === "N/A") continue;

            // Resolve metadata
            const metadata = metadataMap.get(schoolCode);
            const city = metadata ? metadata.city : "UNKNOWN";
            const county = metadata ? metadata.county : "UNKNOWN";
            const status = metadata ? metadata.status : "ACTIVE";
            const licenseType = metadata ? metadata.licenseType : "Barber School";

            if (!schoolStats.has(schoolCode)) {
                schoolStats.set(schoolCode, {
                    schoolCode,
                    schoolName,
                    licenseType,
                    city,
                    county,
                    status,
                    totalExams: 0,
                    passes: 0,
                    firstTimePasses: 0,
                    firstTimeTotal: 0,
                    repeaterPasses: 0,
                    repeaterTotal: 0
                });
            }

            const s = schoolStats.get(schoolCode)!;
            s.totalExams++;
            if (result === "PASS") s.passes++;

            const isFirstTime = attemptType.toUpperCase().includes("FIRST");
            if (isFirstTime) {
                s.firstTimeTotal++;
                if (result === "PASS") s.firstTimePasses++;
            } else {
                s.repeaterTotal++;
                if (result === "PASS") s.repeaterPasses++;
            }

            // Aggregate county averages
            if (county && county !== "UNKNOWN" && county !== "N/A") {
                if (!countyStats.has(county)) countyStats.set(county, { passes: 0, total: 0 });
                const c = countyStats.get(county)!;
                c.total++;
                if (result === "PASS") c.passes++;
            }

            stateTotal++;
            if (result === "PASS") statePasses++;
        }
    }

    // 5. Construct final rankings output
    const stateAvg = stateTotal > 0 ? (statePasses / stateTotal) * 100 : 0;

    const ranking: SchoolRanking[] = Array.from(schoolStats.values()).map(s => {
        const countyData = countyStats.get(s.county);
        const countyAvg = countyData ? (countyData.passes / countyData.total) * 100 : 0;

        return {
            ...s,
            fails: s.totalExams - s.passes,
            passRate: s.totalExams > 0 ? (s.passes / s.totalExams) * 100 : 0,
            firstTimePassRate: s.firstTimeTotal > 0 ? (s.firstTimePasses / s.firstTimeTotal) * 100 : 0,
            repeaterPassRate: s.repeaterTotal > 0 ? (s.repeaterPasses / s.repeaterTotal) * 100 : 0,
            firstTimeCount: s.firstTimeTotal,
            repeaterCount: s.repeaterTotal,
            countyAvgPassRate: countyAvg,
            stateAvgPassRate: stateAvg,
            licenseNumber: "",
            isAccredited: checkAccreditation(s.schoolName),
            googleData: getGoogleData(s.schoolName)
        };
    });

    // Sort by passRate descending, and resolve ties using total exam volume descending
    return ranking.sort((a, b) => b.passRate - a.passRate || b.totalExams - a.totalExams);
}
