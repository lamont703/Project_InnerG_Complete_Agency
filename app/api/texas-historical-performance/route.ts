import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const testFilter = "Class A Barber Written English";

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

// Linear regression to project future months (6 months: indices 4 to 9)
function predictNextMonths(actualRates: (number | null)[]): number[] {
    const validPoints: { x: number; y: number }[] = [];
    actualRates.forEach((rate, idx) => {
        if (rate !== null) {
            validPoints.push({ x: idx, y: rate });
        }
    });

    if (validPoints.length === 0) return [70, 70, 70, 70, 70, 70];

    if (validPoints.length === 1) {
        const singleVal = validPoints[0].y;
        return [singleVal, singleVal, singleVal, singleVal, singleVal, singleVal];
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
    // Project indices 4, 5, 6, 7, 8, 9 (representing May to Oct)
    for (let nextX = 4; nextX <= 9; nextX++) {
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

        const csvPath = path.join(process.cwd(), 'public', 'Barber School Benchmarking.csv');
        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split('\n');

        const schoolsMap = new Map<string, string>();
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseCSVLine(lines[i]).map(v => v.trim());
            const code = values[0];
            const name = values[3] !== "N/A" ? values[3] : values[2];
            const testName = values[6];

            if (code && code !== "N/A" && testName === testFilter) {
                schoolsMap.set(code, name);
            }
        }

        const availableSchools = Array.from(schoolsMap.entries()).map(([code, name]) => ({
            code,
            name
        })).sort((a, b) => a.name.localeCompare(b.name));

        if (!schoolCode) {
            return NextResponse.json({ schools: availableSchools });
        }

        const months = ["2026-01", "2026-02", "2026-03", "2026-04"];
        const monthLabels: Record<string, string> = {
            "2026-01": "Jan 26",
            "2026-02": "Feb 26",
            "2026-03": "Mar 26",
            "2026-04": "Apr 26"
        };

        const stateMonthly = months.reduce((acc, m) => {
            acc[m] = { passes: 0, total: 0 };
            return acc;
        }, {} as Record<string, { passes: number; total: number }>);

        const schoolMonthly = months.reduce((acc, m) => {
            acc[m] = { passes: 0, total: 0 };
            return acc;
        }, {} as Record<string, { passes: number; total: number }>);

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseCSVLine(lines[i]).map(v => v.trim());
            const code = values[0];
            const testName = values[6];
            const dateStr = values[7];
            const result = values[9];

            if (testName !== testFilter || code === "N/A") continue;

            let monthKey = "";
            if (dateStr.startsWith("01-") || dateStr.startsWith("1-")) monthKey = "2026-01";
            else if (dateStr.startsWith("02-") || dateStr.startsWith("2-")) monthKey = "2026-02";
            else if (dateStr.startsWith("03-") || dateStr.startsWith("3-")) monthKey = "2026-03";
            else if (dateStr.startsWith("04-") || dateStr.startsWith("4-")) monthKey = "2026-04";

            if (!monthKey) continue;

            stateMonthly[monthKey].total++;
            if (result === "PASS") stateMonthly[monthKey].passes++;

            if (code === schoolCode) {
                schoolMonthly[monthKey].total++;
                if (result === "PASS") schoolMonthly[monthKey].passes++;
            }
        }

        const timelineData = months.map(m => {
            const stateTot = stateMonthly[m].total;
            const statePassRate = stateTot > 0 ? (stateMonthly[m].passes / stateTot) * 100 : 0;

            const schoolTot = schoolMonthly[m].total;
            const schoolPassRate = schoolTot > 0 ? (schoolMonthly[m].passes / schoolTot) * 100 : null;

            return {
                month: monthLabels[m],
                statePassRate: Number(statePassRate.toFixed(1)),
                schoolPassRate: schoolPassRate !== null ? Number(schoolPassRate.toFixed(1)) : null,
                schoolExams: schoolTot,
                isPrediction: false
            };
        });

        // Predictions for next 6 months (May to Oct 2026)
        const schoolActualRates = timelineData.map(d => d.schoolPassRate);
        const stateActualRates = timelineData.map(d => d.statePassRate);

        const schoolPredictions = predictNextMonths(schoolActualRates);
        const statePredictions = predictNextMonths(stateActualRates);

        const predictionMonths = [
            { key: "May 26", idx: 0 },
            { key: "Jun 26", idx: 1 },
            { key: "Jul 26", idx: 2 },
            { key: "Aug 26", idx: 3 },
            { key: "Sep 26", idx: 4 },
            { key: "Oct 26", idx: 5 }
        ];

        predictionMonths.forEach(m => {
            timelineData.push({
                month: m.key,
                statePassRate: statePredictions[m.idx],
                schoolPassRate: schoolPredictions[m.idx],
                schoolExams: 0,
                isPrediction: true
            });
        });

        const schoolTotalExams = timelineData.filter(d => !d.isPrediction).reduce((sum, d) => sum + d.schoolExams, 0);
        const schoolTotalPasses = months.reduce((sum, m) => sum + schoolMonthly[m].passes, 0);
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
