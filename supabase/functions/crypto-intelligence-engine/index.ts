import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { AlpacaClient } from 'https://esm.sh/@alpacahq/alpaca-trade-api'

// --- SMC/ICT Logic Types ---
interface Bar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

interface MarketStructure {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  lastBOS?: number;
  lastCHoCH?: number;
}

// --- The Intelligence Engine ---
export const serve = async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Active Strategies (from the projects we toggled ON)
    const { data: configs, error: configError } = await supabase
      .from('crypto_intelligence_config')
      .select('*, projects(name, slug)')
      .eq('is_active', true)

    if (configError || !configs) return new Response(JSON.stringify({ error: 'No active strategies' }), { status: 200 })

    const results = []

    for (const config of configs) {
      // 2. Initialize Alpaca for this project (or use Agency keys)
      const alpaca = new AlpacaClient({
        keyId: Deno.env.get('ALPACA_API_KEY_ID') ?? '',
        secretKey: Deno.env.get('ALPACA_SECRET_KEY') ?? '',
        paper: true,
      })

      for (const symbol of config.symbols) {
        // 3. GET Market Data (4H for Bias, 1m for Sniper Entry)
        const bars4H = await fetchBars(alpaca, symbol, '4H', 50)
        const bars1m = await fetchBars(alpaca, symbol, '1Min', 20)

        // 4. ANALYZE Structure (SMC Pattern Recognition)
        const structure = analyzeStructure(bars4H)
        const zone = findSupplyDemandZone(bars4H)
        const fvg = detectFVG(bars4H.slice(-5))

        // 5. CHECK for Signal Confluence
        const isEntryReady = checkEntryConfirmation(bars1m, zone, structure)

        if (isEntryReady && structure.bias !== 'NEUTRAL') {
          // Generate AI Reasoning (Gemini)
          const narrative = await generateNarrative(symbol, structure, config.projects.name)

          // 6. STAGE THE SIGNAL (Human-in-the-Loop)
          const { data: signal, error: signalError } = await supabase
            .from('crypto_signals')
            .insert({
                project_id: config.project_id,
                symbol,
                bias: structure.bias === 'BULLISH' ? 'LONG' : 'SHORT',
                entry_price: bars1m[bars1m.length - 1].c,
                stop_loss: structure.bias === 'BULLISH' ? zone.l : zone.h,
                take_profit_1: calculateTP(bars1m[bars1m.length - 1].c, zone, 2), // 1:2 R/R
                confidence_score: calculateConfidence(structure, fvg, zone),
                narrative_reasoning: narrative,
                smc_reasoning: {
                    structure: structure.lastCHoCH ? 'CHoCH' : 'BOS',
                    zone_type: zone.type,
                    has_fvg: !!fvg
                },
                status: 'STAGED' // IMPORTANT: Marked as STAGED for human approval
            })
            .select()
            .single()

          results.push({ symbol, status: 'STAGED', id: signal?.id })
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Market Scan Complete', results }), { status: 200 })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

// --- SMC Utility Functions (Simplified for the Core Brain) ---

function analyzeStructure(bars: Bar[]): MarketStructure {
  // Logic to detect Higher Highs / Lower Lows
  // Placeholder for BOS/CHoCH detection logic
  return { bias: 'BULLISH', lastBOS: bars[bars.length-1].h }
}

function findSupplyDemandZone(bars: Bar[]) {
  // Finds the last opposite candle before a momentum move
  return { h: 52000, l: 51500, type: 'DEMAND' }
}

function detectFVG(bars: Bar[]) {
  // Detects Fair Value Gaps in 3-candle sequences
  return bars[0].h < bars[2].l ? 'BULLISH_FVG' : null
}

async function fetchBars(client: any, symbol: string, timeframe: string, limit: number): Promise<Bar[]> {
  // Alpaca SDK call
  return [] // Mocked for structure
}

async function generateNarrative(symbol: string, structure: any, projectName: string) {
  // Gemini API call to "think" about the trade narrative
  return `The institutional structure for ${symbol} has successfully shifted bullish (CHoCH) on the 4H timeframe. We are seeing strong accumulation within the demand zone. Aligning with the ${projectName} strategy for a high-probability reversal.`
}

function calculateTP(entry: number, zone: any, rr: number) {
    const risk = Math.abs(entry - zone.l)
    return entry + (risk * rr)
}

function calculateConfidence(structure: any, fvg: any, zone: any) {
    let score = 70;
    if (fvg) score += 10;
    if (structure.lastCHoCH) score += 15;
    return Math.min(score, 99);
}

function checkEntryConfirmation(bars: any, zone: any, structure: any) {
    // Check if price is inside zone + waiting for LTF shift
    return true // Simplified for initial agent staging logic
}
