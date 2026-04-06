/**
 * ============================================================
 *  ALPACA CRYPTO TRADING BOT — CHART SIGNAL ANALYZER
 *
 *  Fetches historical bars for each configured symbol and
 *  computes the following technical indicators:
 *
 *    • SMA  — Simple Moving Average (20 & 50 period)
 *    • EMA  — Exponential Moving Average (12 & 26 period)
 *    • RSI  — Relative Strength Index (14 period)
 *    • MACD — Moving Average Convergence Divergence
 *    • Bollinger Bands (20 period, 2 std dev)
 *
 *  Produces a BUY / SELL / HOLD signal per symbol based on
 *  a weighted confluence of all indicators.
 * ============================================================
 */

import 'dotenv/config';
import axios from 'axios';
import chalk from 'chalk';

// ─── Config ──────────────────────────────────────────────────
const API_KEY = process.env.ALPACA_API_KEY;
const API_SECRET = process.env.ALPACA_API_SECRET;
const DATA_URL = process.env.ALPACA_DATA_BASE_URL || 'https://data.alpaca.markets';
const SYMBOLS = (process.env.CRYPTO_SYMBOLS || 'BTC/USD,ETH/USD,SOL/USD').split(',');
const TIMEFRAME = process.env.BAR_TIMEFRAME || '1Hour';
const LIMIT = parseInt(process.env.BAR_LIMIT || '100', 10);

const authHeaders = {
    'APCA-API-KEY-ID': API_KEY,
    'APCA-API-SECRET-KEY': API_SECRET,
};

// ─── Formatting Helpers ───────────────────────────────────────
const fmt = (n, d = 2) => parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtUSD = (n) => '$' + fmt(n, 2);
const fmtPct = (n) => (n >= 0 ? chalk.green('+' + fmt(n, 2) + '%') : chalk.red(fmt(n, 2) + '%'));
const divider = (char = '─', len = 60) => console.log(chalk.gray(char.repeat(len)));

// ─── Indicator Calculations ───────────────────────────────────

/** Simple Moving Average */
function sma(closes, period) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

/** Exponential Moving Average */
function ema(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let emaVal = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
        emaVal = closes[i] * k + emaVal * (1 - k);
    }
    return emaVal;
}

/** RSI — Relative Strength Index (14-period default) */
function rsi(closes, period = 14) {
    if (closes.length < period + 1) return null;
    const deltas = closes.slice(-(period + 1)).map((c, i, arr) => (i === 0 ? 0 : c - arr[i - 1])).slice(1);
    const gains = deltas.map((d) => (d > 0 ? d : 0));
    const losses = deltas.map((d) => (d < 0 ? Math.abs(d) : 0));
    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

/** MACD — uses 12/26 EMA and 9-period signal line */
function macd(closes) {
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    if (ema12 === null || ema26 === null) return null;

    const macdLine = ema12 - ema26;

    // Build MACD line series for signal line calculation
    const macdSeries = [];
    for (let i = 26; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        const e12 = ema(slice, 12);
        const e26 = ema(slice, 26);
        if (e12 !== null && e26 !== null) macdSeries.push(e12 - e26);
    }

    const signalLine = ema(macdSeries, 9);
    const histogram = signalLine !== null ? macdLine - signalLine : null;

    return { macdLine, signalLine, histogram };
}

/** Bollinger Bands (20-period, 2 std dev) */
function bollingerBands(closes, period = 20, stdDevMultiplier = 2) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return {
        upper: middle + stdDevMultiplier * stdDev,
        middle,
        lower: middle - stdDevMultiplier * stdDev,
        bandwidth: ((middle + stdDevMultiplier * stdDev) - (middle - stdDevMultiplier * stdDev)) / middle * 100,
    };
}

// ─── Signal Engine ────────────────────────────────────────────

/**
 * Generates a BUY / SELL / HOLD signal from indicator confluence.
 * Each indicator casts a vote: +1 = bullish, -1 = bearish, 0 = neutral.
 * Final signal is determined by weighted score.
 */
function generateSignal(price, sma20, sma50, ema12, ema26, rsiVal, macdData, bbands) {
    const votes = [];
    const reasons = [];

    // SMA Cross
    if (sma20 && sma50) {
        if (sma20 > sma50) {
            votes.push(1);
            reasons.push(chalk.green('SMA20 > SMA50 (bullish crossover)'));
        } else {
            votes.push(-1);
            reasons.push(chalk.red('SMA20 < SMA50 (bearish crossover)'));
        }
    }

    // Price vs SMA20
    if (sma20) {
        if (price > sma20) {
            votes.push(1);
            reasons.push(chalk.green(`Price above SMA20 (${fmtUSD(sma20)})`));
        } else {
            votes.push(-1);
            reasons.push(chalk.red(`Price below SMA20 (${fmtUSD(sma20)})`));
        }
    }

    // EMA Cross
    if (ema12 && ema26) {
        if (ema12 > ema26) {
            votes.push(1);
            reasons.push(chalk.green('EMA12 > EMA26 (bullish)'));
        } else {
            votes.push(-1);
            reasons.push(chalk.red('EMA12 < EMA26 (bearish)'));
        }
    }

    // RSI
    if (rsiVal !== null) {
        if (rsiVal < 30) {
            votes.push(2); // Oversold — stronger buy signal
            reasons.push(chalk.green(`RSI ${fmt(rsiVal)} — Oversold (strong buy signal)`));
        } else if (rsiVal > 70) {
            votes.push(-2); // Overbought — stronger sell signal
            reasons.push(chalk.red(`RSI ${fmt(rsiVal)} — Overbought (strong sell signal)`));
        } else if (rsiVal >= 45 && rsiVal <= 55) {
            votes.push(0);
            reasons.push(chalk.yellow(`RSI ${fmt(rsiVal)} — Neutral`));
        } else if (rsiVal > 55) {
            votes.push(1);
            reasons.push(chalk.green(`RSI ${fmt(rsiVal)} — Bullish momentum`));
        } else {
            votes.push(-1);
            reasons.push(chalk.red(`RSI ${fmt(rsiVal)} — Bearish momentum`));
        }
    }

    // MACD
    if (macdData) {
        if (macdData.histogram > 0) {
            votes.push(1);
            reasons.push(chalk.green(`MACD histogram positive (${fmt(macdData.histogram, 4)})`));
        } else {
            votes.push(-1);
            reasons.push(chalk.red(`MACD histogram negative (${fmt(macdData.histogram, 4)})`));
        }
        if (macdData.macdLine > macdData.signalLine) {
            votes.push(1);
            reasons.push(chalk.green('MACD line above signal line'));
        } else {
            votes.push(-1);
            reasons.push(chalk.red('MACD line below signal line'));
        }
    }

    // Bollinger Bands
    if (bbands) {
        if (price <= bbands.lower) {
            votes.push(2);
            reasons.push(chalk.green(`Price at/below lower BB (${fmtUSD(bbands.lower)}) — oversold`));
        } else if (price >= bbands.upper) {
            votes.push(-2);
            reasons.push(chalk.red(`Price at/above upper BB (${fmtUSD(bbands.upper)}) — overbought`));
        } else {
            votes.push(0);
            reasons.push(chalk.yellow(`Price inside BB (${fmtUSD(bbands.lower)} — ${fmtUSD(bbands.upper)})`));
        }
    }

    // Tally
    const score = votes.reduce((a, b) => a + b, 0);
    let signal, signalColor;
    if (score >= 3) {
        signal = '🟢 BUY';
        signalColor = chalk.bold.bgGreen.black;
    } else if (score <= -3) {
        signal = '🔴 SELL';
        signalColor = chalk.bold.bgRed.white;
    } else {
        signal = '🟡 HOLD';
        signalColor = chalk.bold.bgYellow.black;
    }

    return { signal, signalColor, score, maxScore: votes.length, reasons };
}

// ─── Fetch Bars ───────────────────────────────────────────────
async function fetchBars(symbol) {
    const { data } = await axios.get(`${DATA_URL}/v1beta3/crypto/us/bars`, {
        headers: authHeaders,
        params: {
            symbols: symbol,
            timeframe: TIMEFRAME,
            limit: LIMIT,
        },
    });
    return data.bars?.[symbol] || [];
}

// ─── Analyze One Symbol ───────────────────────────────────────
async function analyzeSymbol(symbol) {
    console.log(chalk.bold.cyan(`\n  Fetching ${symbol} — ${TIMEFRAME} bars (last ${LIMIT})...\n`));

    const bars = await fetchBars(symbol);
    if (bars.length < 30) {
        console.log(chalk.red(`  Not enough data for ${symbol} (only ${bars.length} bars). Skipping.\n`));
        return;
    }

    const closes = bars.map((b) => b.c);
    const highs = bars.map((b) => b.h);
    const lows = bars.map((b) => b.l);
    const opens = bars.map((b) => b.o);
    const vols = bars.map((b) => b.v);

    const latestBar = bars[bars.length - 1];
    const price = latestBar.c;
    const priorClose = bars[bars.length - 2]?.c || price;
    const changePct = ((price - priorClose) / priorClose) * 100;

    // Compute indicators
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const ema12Val = ema(closes, 12);
    const ema26Val = ema(closes, 26);
    const rsiVal = rsi(closes, 14);
    const macdData = macd(closes);
    const bbands = bollingerBands(closes, 20, 2);

    // Bar summary stats
    const highestHigh = Math.max(...highs.slice(-20));
    const lowestLow = Math.min(...lows.slice(-20));
    const avgVol = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;

    // Generate signal
    const { signal, signalColor, score, maxScore, reasons } =
        generateSignal(price, sma20, sma50, ema12Val, ema26Val, rsiVal, macdData, bbands);

    // ── Print Report ─────────────────────────────────────────────
    divider('═');
    console.log(chalk.bold.white(`  ${symbol}  |  ${TIMEFRAME} Chart  |  ${new Date(latestBar.t).toUTCString()}`));
    divider('═');

    // Price block
    console.log(chalk.bold(`\n  📈 PRICE ACTION`));
    console.log(`     Current Price:  ${chalk.bold.white(fmtUSD(price))}  ${fmtPct(changePct)}`);
    console.log(`     Bar Open:       ${fmtUSD(opens[opens.length - 1])}`);
    console.log(`     Bar High:       ${fmtUSD(highs[highs.length - 1])}`);
    console.log(`     Bar Low:        ${fmtUSD(lows[lows.length - 1])}`);
    console.log(`     20-Bar High:    ${fmtUSD(highestHigh)}`);
    console.log(`     20-Bar Low:     ${fmtUSD(lowestLow)}`);
    console.log(`     Volume (bar):   ${fmt(vols[vols.length - 1], 6)}`);
    console.log(`     Avg Volume 20:  ${fmt(avgVol, 6)}`);

    // Indicators block
    console.log(chalk.bold(`\n  📊 INDICATORS`));
    console.log(`     SMA 20:         ${sma20 ? fmtUSD(sma20) : 'N/A'}`);
    console.log(`     SMA 50:         ${sma50 ? fmtUSD(sma50) : 'N/A (need more bars)'}`);
    console.log(`     EMA 12:         ${ema12Val ? fmtUSD(ema12Val) : 'N/A'}`);
    console.log(`     EMA 26:         ${ema26Val ? fmtUSD(ema26Val) : 'N/A'}`);
    console.log(`     RSI (14):       ${rsiVal !== null ? chalk.bold(fmt(rsiVal)) + (rsiVal < 30 ? chalk.green(' OVERSOLD') : rsiVal > 70 ? chalk.red(' OVERBOUGHT') : '') : 'N/A'}`);

    if (macdData) {
        console.log(`     MACD Line:      ${fmt(macdData.macdLine, 4)}`);
        console.log(`     Signal Line:    ${fmt(macdData.signalLine, 4)}`);
        console.log(`     Histogram:      ${macdData.histogram > 0 ? chalk.green(fmt(macdData.histogram, 4)) : chalk.red(fmt(macdData.histogram, 4))}`);
    }

    if (bbands) {
        console.log(`     BB Upper:       ${fmtUSD(bbands.upper)}`);
        console.log(`     BB Middle:      ${fmtUSD(bbands.middle)}`);
        console.log(`     BB Lower:       ${fmtUSD(bbands.lower)}`);
        console.log(`     BB Bandwidth:   ${fmt(bbands.bandwidth, 2)}%`);
    }

    // Signal verdict
    console.log(chalk.bold(`\n  🧠 SIGNAL ANALYSIS`));
    console.log(`     Confluence Score:  ${chalk.bold(score)} / ~${maxScore}`);
    reasons.forEach((r) => console.log(`     → ${r}`));
    console.log(`\n     VERDICT: ${signalColor(`  ${signal}  `)}\n`);
    divider('═');
}

// ─── Main ─────────────────────────────────────────────────────
async function run() {
    console.log(chalk.bold.bgMagenta.white('\n  ALPACA CRYPTO BOT — CHART SIGNAL ANALYZER  \n'));
    console.log(chalk.gray(`  Symbols:   ${SYMBOLS.join(', ')}`));
    console.log(chalk.gray(`  Timeframe: ${TIMEFRAME}`));
    console.log(chalk.gray(`  Bars:      last ${LIMIT} candles`));
    console.log(chalk.gray(`  Mode:      PAPER TRADING\n`));

    for (const symbol of SYMBOLS) {
        try {
            await analyzeSymbol(symbol.trim());
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            console.error(chalk.red(`\n  Error analyzing ${symbol}: ${msg}\n`));
        }
    }

    console.log(chalk.bold.gray('\n  Analysis complete. Re-run at your desired interval to monitor live signals.\n'));
}

run();
