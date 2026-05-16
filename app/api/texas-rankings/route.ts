import { NextResponse } from 'next/server';
import { getTexasSchoolRankings } from '@/lib/texas-benchmarking';

export async function GET() {
    try {
        console.log('API: Fetching Texas rankings...');
        const rankings = getTexasSchoolRankings();
        console.log(`API: Successfully found ${rankings.length} schools.`);
        return NextResponse.json(rankings);
    } catch (error: any) {
        console.error('API Error fetching rankings:', error.message);
        return NextResponse.json({ error: 'Failed to fetch rankings', details: error.message }, { status: 500 });
    }
}
