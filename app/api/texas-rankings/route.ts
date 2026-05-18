import { NextResponse } from 'next/server';
import { getTexasSchoolRankings } from '@/lib/texas-benchmarking';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const year = searchParams.get('year') || 'all';

        console.log(`API: Fetching Texas rankings for year: ${year}...`);
        const rankings = getTexasSchoolRankings(year);
        console.log(`API: Successfully found ${rankings.length} schools.`);

        return NextResponse.json(rankings);
    } catch (error: any) {
        console.error('API Error fetching rankings:', error.message);
        return NextResponse.json({ error: 'Failed to fetch rankings', details: error.message }, { status: 500 });
    }
}
