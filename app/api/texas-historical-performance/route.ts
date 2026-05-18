import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

// Linear regression to project future months (N months forecast)
function predictNextMonths(actualRates: (number | null)[], count: number = 6): number[] {
    const validPoints: { x: number; y: number }[] = [];
    actualRates.forEach((rate, idx) => {
        if (rate !== null) {
            validPoints.push({ x: idx, y: rate });
        }
    });

    if (validPoints.length === 0) {
        return Array(count).fill(70);
    }

    if (validPoints.length === 1) {
        const singleVal = validPoints[0].y;
        return Array(count).fill(singleVal);
    }

    const n = validPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of validPoints) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = (n * sumXX) - (sumX * sumX);
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = (sumY - (slope * sumX)) / n;

    const projections: number[] = [];
    const lastX = actualRates.length - 1;
    for (let i = 1; i <= count; i++) {
        const nextX = lastX + i;
        let predicted = slope * nextX + intercept;
        predicted = Math.max(0, Math.min(100, predicted));
        projections.push(Number(predicted.toFixed(1)));
    }

    return projections;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolCode = searchParams.get('schoolCode');
        const timePeriod = searchParams.get('timePeriod') || 'all'; // 'all', '2023', '2024', '2025', '2026'

        // 1. Gather the union of all schools from all CSVs to build the selector index
        const schoolsMap = new Map<string, string>();
        for (const fileInfo of files) {
            const csvPath = path.join(process.cwd(), 'public', fileInfo.filename);
            if (!fs.existsSync(csvPath)) continue;

            const fileContent = fs.readFileSync(csvPath, 'utf8');
            const lines = fileContent.split('\n');

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = parseCSVLine(lines[i]).map(v => v.trim());
                const code = values[0];
                const name = values[1];
                const testName = values[3];

                if (!code || code === "School Code" || !testName) continue;

                const testNameLower = testName.toLowerCase();
                if (testNameLower.includes("class a barber written english") || testNameLower.includes("barber written english")) {
                    if (name && name !== "Unknown School") {
                        schoolsMap.set(code, name);
                    }
                }
            }
        }

        const availableSchools = Array.from(schoolsMap.entries()).map(([code, name]) => ({
            code,
            name
        })).sort((a, b) => a.name.localeCompare(b.name));

        // If no school code is provided, just return the list of schools
        if (!schoolCode) {
            return NextResponse.json({ schools: availableSchools });
        }

        // 2. Identify the maximum month in the 2026 CSV file to make months fully dynamic
        let maxMonth2026 = 4; // Default to April
        const path2026 = path.join(process.cwd(), 'public', '2026 Texas Barber Written Exam Pass-Fail Scores Both First Time and Repeat.csv');
        if (fs.existsSync(path2026)) {
            const content2026 = fs.readFileSync(path2026, 'utf8');
            const lines2026 = content2026.split('\n');
            for (let i = 1; i < lines2026.length; i++) {
                if (!lines2026[i].trim()) continue;
                const values = parseCSVLine(lines2026[i]).map(v => v.trim());
                const dateStr = values[4];
                if (dateStr) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        const month = parseInt(parts[0], 10);
                        if (month > maxMonth2026 && month <= 12) {
                            maxMonth2026 = month;
                        }
                    }
                }
            }
        }

        // 3. Define the months sequence based on the requested timePeriod
        const months: string[] = [];
        if (timePeriod === '2023') {
            for (let m = 1; m <= 12; m++) months.push(`2023-${String(m).padStart(2, '0')}`);
        } else if (timePeriod === '2024') {
            for (let m = 1; m <= 12; m++) months.push(`2024-${String(m).padStart(2, '0')}`);
        } else if (timePeriod === '2025') {
            for (let m = 1; m <= 12; m++) months.push(`2025-${String(m).padStart(2, '0')}`);
        } else if (timePeriod === '2026') {
            for (let m = 1; m <= maxMonth2026; m++) months.push(`2026-${String(m).padStart(2, '0')}`);
        } else {
            // 'all' represents continuous 2023, 2024, 2025, 2026 actuals
            for (let m = 1; m <= 12; m++) months.push(`2023-${String(m).padStart(2, '0')}`);
            for (let m = 1; m <= 12; m++) months.push(`2024-${String(m).padStart(2, '0')}`);
            for (let m = 1; m <= 12; m++) months.push(`2025-${String(m).padStart(2, '0')}`);
            for (let m = 1; m <= maxMonth2026; m++) months.push(`2026-${String(m).padStart(2, '0')}`);
        }

        // 4. Initialize aggregators for all target months
        const stateMonthly = months.reduce((acc, m) => {
            acc[m] = { passes: 0, total: 0 };
            return acc;
        }, {} as Record<string, { passes: number; total: number }>);

        const schoolMonthly = months.reduce((acc, m) => {
            acc[m] = { passes: 0, total: 0 };
            return acc;
        }, {} as Record<string, { passes: number; total: number }>);

        // Determine which CSV files to load based on selected period
        const yearsToLoad = timePeriod === 'all' 
            ? [2023, 2024, 2025, 2026] 
            : [parseInt(timePeriod, 10)];

        // 5. Aggregate data from selected CSV files
        for (const fileInfo of files) {
            if (!yearsToLoad.includes(fileInfo.year)) continue;

            const csvPath = path.join(process.cwd(), 'public', fileInfo.filename);
            if (!fs.existsSync(csvPath)) continue;

            const fileContent = fs.readFileSync(csvPath, 'utf8');
            const lines = fileContent.split('\n');

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = parseCSVLine(lines[i]).map(v => v.trim());
                const code = values[0];
                const testName = values[3];
                const dateStr = values[4];
                const result = values[5];

                if (!code || !testName || !dateStr) continue;

                const testNameLower = testName.toLowerCase();
                if (!testNameLower.includes("class a barber written english") && !testNameLower.includes("barber written english")) {
                    continue;
                }

                // Parse month key YYYY-MM
                const dateParts = dateStr.split('-');
                if (dateParts.length !== 3) continue;

                const monthVal = parseInt(dateParts[0], 10);
                let yearVal = parseInt(dateParts[2], 10);
                if (yearVal < 100) yearVal += 2000;

                const monthKey = `${yearVal}-${String(monthVal).padStart(2, '0')}`;

                if (stateMonthly[monthKey] !== undefined) {
                    stateMonthly[monthKey].total++;
                    if (result === "PASS") stateMonthly[monthKey].passes++;
                }

                if (code === schoolCode && schoolMonthly[monthKey] !== undefined) {
                    schoolMonthly[monthKey].total++;
                    if (result === "PASS") schoolMonthly[monthKey].passes++;
                }
            }
        }

        // 6. Map month keys to beautiful text labels (e.g. "Jan 23", "Mar 26")
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formatLabel = (key: string) => {
            const [year, monthStr] = key.split('-');
            const monthIdx = parseInt(monthStr, 10) - 1;
            return `${monthNames[monthIdx]} ${year.slice(2)}`;
        };

        const timelineData = months.map(m => {
            const stateTot = stateMonthly[m].total;
            const statePassRate = stateTot > 0 ? (stateMonthly[m].passes / stateTot) * 100 : 0;

            const schoolTot = schoolMonthly[m].total;
            const schoolPassRate = schoolTot > 0 ? (schoolMonthly[m].passes / schoolTot) * 100 : null;

            return {
                month: formatLabel(m),
                statePassRate: Number(statePassRate.toFixed(1)),
                schoolPassRate: schoolPassRate !== null ? Number(schoolPassRate.toFixed(1)) : null,
                schoolExams: schoolTot,
                isPrediction: false
            };
        });

        // 7. Calculate AI projections if active/forecast periods ('2026' or 'all') are selected
        const isForecastPeriod = timePeriod === 'all' || timePeriod === '2026';
        if (isForecastPeriod) {
            const schoolActualRates = timelineData.map(d => d.schoolPassRate);
            const stateActualRates = timelineData.map(d => d.statePassRate);

            const schoolPredictions = predictNextMonths(schoolActualRates, 6);
            const statePredictions = predictNextMonths(stateActualRates, 6);

            // Project next 6 months after maxMonth2026
            for (let i = 1; i <= 6; i++) {
                let nextMonth = maxMonth2026 + i;
                let nextYear = 2026;
                if (nextMonth > 12) {
                    nextMonth -= 12;
                    nextYear += 1;
                }

                const predMonthKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
                timelineData.push({
                    month: formatLabel(predMonthKey),
                    statePassRate: statePredictions[i - 1],
                    schoolPassRate: schoolPredictions[i - 1],
                    schoolExams: 0,
                    isPrediction: true
                });
            }
        }

        // Calculate overall average for metrics grid
        const schoolTotalExams = timelineData.filter(d => !d.isPrediction).reduce((sum, d) => sum + d.schoolExams, 0);
        
        let schoolTotalPasses = 0;
        months.forEach(m => {
            schoolTotalPasses += schoolMonthly[m].passes;
        });

        const overallPassRate = schoolTotalExams > 0 ? (schoolTotalPasses / schoolTotalExams) * 100 : 0;

        return NextResponse.json({
            schools: availableSchools,
            selectedSchoolName: schoolsMap.get(schoolCode) || "Unknown School",
            overallPassRate: Number(overallPassRate.toFixed(1)),
            totalExams: schoolTotalExams,
            timeline: timelineData
        });

    } catch (error: any) {
        console.error("Error in historical API:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
