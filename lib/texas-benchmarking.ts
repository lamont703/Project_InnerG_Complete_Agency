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
    // New metrics
    firstTimePassRate: number;
    repeaterPassRate: number;
    firstTimeCount: number;
    repeaterCount: number;
    countyAvgPassRate: number;
    stateAvgPassRate: number;
    status: string;
}

export function getTexasSchoolRankings(): SchoolRanking[] {
    const csvPath = path.join(process.cwd(), 'public', 'Barber School Benchmarking.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split('\n');

    const testFilter = "Class A Barber Written English";
    
    // 1. First, group all exams by student to identify first-timers
    const studentHistory = new Map<string, any[]>();
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i]);
        const studentName = values[5];
        const testName = values[6];
        const schoolCode = values[0];

        if (testName !== testFilter || studentName === "NO DATA" || schoolCode === "N/A") continue;

        if (!studentHistory.has(studentName)) studentHistory.set(studentName, []);
        studentHistory.get(studentName).push({
            schoolCode: values[0],
            schoolName: values[3] !== "N/A" ? values[3] : values[2],
            licenseType: values[4],
            result: values[9],
            date: new Date(values[7]),
            city: values[10],
            county: values[11],
            status: values[12]
        });
    }

    // 2. Aggregate data by school
    const schoolStats = new Map<string, any>();
    const countyStats = new Map<string, { passes: number, total: number }>();
    let statePasses = 0;
    let stateTotal = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line).map(v => v.trim());
        const schoolCode = values[0];
        const studentName = values[5];
        const testName = values[6];
        const result = values[9];
        const attemptType = values[16] || "FIRST-TIME";

        if (testName !== testFilter || studentName === "NO DATA" || schoolCode === "N/A") continue;

        if (!schoolStats.has(schoolCode)) {
            schoolStats.set(schoolCode, {
                schoolCode,
                schoolName: values[3] !== "N/A" ? values[3] : values[2],
                licenseType: values[4],
                city: values[10],
                county: values[11],
                status: values[12],
                totalExams: 0,
                passes: 0,
                firstTimePasses: 0,
                firstTimeTotal: 0,
                repeaterPasses: 0,
                repeaterTotal: 0
            });
        }

        const s = schoolStats.get(schoolCode);
        s.totalExams++;
        if (result === "PASS") s.passes++;

        if (attemptType === "FIRST-TIME") {
            s.firstTimeTotal++;
            if (result === "PASS") s.firstTimePasses++;
        } else {
            s.repeaterTotal++;
            if (result === "PASS") s.repeaterPasses++;
        }

        // County aggregation
        const county = values[11];
        if (county && county !== "N/A") {
            if (!countyStats.has(county)) countyStats.set(county, { passes: 0, total: 0 });
            const c = countyStats.get(county)!;
            c.total++;
            if (result === "PASS") c.passes++;
        }
        
        stateTotal++;
        if (result === "PASS") statePasses++;
    }

    const stateAvg = stateTotal > 0 ? (statePasses / stateTotal) * 100 : 0;

    const ranking: SchoolRanking[] = Array.from(schoolStats.values()).map(s => {
        const countyData = countyStats.get(s.county);
        const countyAvg = countyData ? (countyData.passes / countyData.total) * 100 : 0;

        return {
            ...s,
            passRate: s.totalExams > 0 ? (s.passes / s.totalExams) * 100 : 0,
            firstTimePassRate: s.firstTimeTotal > 0 ? (s.firstTimePasses / s.firstTimeTotal) * 100 : 0,
            repeaterPassRate: s.repeaterTotal > 0 ? (s.repeaterPasses / s.repeaterTotal) * 100 : 0,
            firstTimeCount: s.firstTimeTotal,
            repeaterCount: s.repeaterTotal,
            countyAvgPassRate: countyAvg,
            stateAvgPassRate: stateAvg,
            licenseNumber: "" // Not strictly needed for the audit but kept for compat
        };
    });

    return ranking.sort((a, b) => b.passRate - a.passRate || b.totalExams - a.totalExams);
}

function parseCSVLine(line: string): string[] {
    const values: string[] = [];
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
    return values;
}
