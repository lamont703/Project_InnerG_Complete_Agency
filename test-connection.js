/**
 * ============================================================
 *  ALPACA CRYPTO TRADING BOT — CONNECTION TEST
 *  Tests connectivity to:
 *    1. Paper Broker API  (account info, buying power)
 *    2. Market Data API   (latest BTC/USD snapshot)
 *    3. WebSocket stream  (brief connect + disconnect)
 * ============================================================
 */

import 'dotenv/config';
import axios from 'axios';
import chalk from 'chalk';
import WebSocket from 'ws';

// ─── Config from .env ────────────────────────────────────────
const API_KEY = process.env.ALPACA_API_KEY;
const API_SECRET = process.env.ALPACA_API_SECRET;
const BROKER_URL = process.env.ALPACA_BASE_URL;
const DATA_URL = process.env.ALPACA_DATA_BASE_URL;
const STREAM_URL = process.env.ALPACA_CRYPTO_STREAM_URL;

// ─── Shared Headers ──────────────────────────────────────────
const authHeaders = {
    'APCA-API-KEY-ID': API_KEY,
    'APCA-API-SECRET-KEY': API_SECRET,
    'Content-Type': 'application/json',
};

// ─── Helpers ─────────────────────────────────────────────────
const pass = (msg) => console.log(chalk.green('  ✔  ') + msg);
const fail = (msg) => console.log(chalk.red('  ✘  ') + msg);
const info = (msg) => console.log(chalk.cyan('  ℹ  ') + msg);
const label = (msg) => console.log(chalk.bold.yellow(`\n${msg}`));
const divider = () => console.log(chalk.gray('─'.repeat(55)));

function formatUSD(value) {
    return '$' + parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Test 1: Broker (Account) ─────────────────────────────────
async function testBrokerConnection() {
    label('TEST 1 — Broker API (Paper Account)');
    divider();

    if (!API_KEY || !API_SECRET) {
        fail('ALPACA_API_KEY or ALPACA_API_SECRET is missing from .env');
        return false;
    }

    try {
        const { data: account } = await axios.get(`${BROKER_URL}/v2/account`, {
            headers: authHeaders,
        });

        pass(`Connected to ${chalk.bold(BROKER_URL)}`);
        pass(`Account Status:    ${chalk.bold(account.status)}`);
        pass(`Account ID:        ${chalk.bold(account.id)}`);
        pass(`Portfolio Value:   ${chalk.bold(formatUSD(account.portfolio_value))}`);
        pass(`Buying Power:      ${chalk.bold(formatUSD(account.buying_power))}`);
        pass(`Cash:              ${chalk.bold(formatUSD(account.cash))}`);
        pass(`Currency:          ${chalk.bold(account.currency)}`);
        pass(`Paper Trading:     ${chalk.bold(account.paper_trading ? 'YES ✔' : 'NO — LIVE ACCOUNT!')}`);

        if (!account.paper_trading) {
            fail(chalk.bgRed.white(' WARNING: This is a LIVE trading account. Double-check your keys! '));
        }

        return true;
    } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;
        fail(`Broker connection failed [HTTP ${status}]: ${message}`);

        if (status === 401 || status === 403) {
            info('Your API Key or Secret may be incorrect. Check your .env file.');
        }
        return false;
    }
}

// ─── Test 2: Market Data API ──────────────────────────────────
async function testMarketDataConnection() {
    label('TEST 2 — Market Data API (BTC/USD Snapshot)');
    divider();

    try {
        const { data } = await axios.get(`${DATA_URL}/v1beta3/crypto/us/snapshots`, {
            headers: authHeaders,
            params: { symbols: 'BTC/USD' },
        });

        const snap = data.snapshots?.['BTC/USD'];
        const latestBar = snap?.latestBar;
        const latestTrade = snap?.latestTrade;
        const latestQuote = snap?.latestQuote;

        pass(`Connected to ${chalk.bold(DATA_URL)}`);

        if (latestTrade) {
            pass(`BTC/USD Latest Trade Price:  ${chalk.bold.magenta(formatUSD(latestTrade.p))}`);
            pass(`Trade Size:                  ${chalk.bold(latestTrade.s)} BTC`);
        }

        if (latestBar) {
            pass(`Last Bar Open:   ${chalk.bold(formatUSD(latestBar.o))}`);
            pass(`Last Bar High:   ${chalk.bold(formatUSD(latestBar.h))}`);
            pass(`Last Bar Low:    ${chalk.bold(formatUSD(latestBar.l))}`);
            pass(`Last Bar Close:  ${chalk.bold(formatUSD(latestBar.c))}`);
            pass(`Last Bar Volume: ${chalk.bold(parseFloat(latestBar.v).toFixed(6))} BTC`);
        }

        if (latestQuote) {
            pass(`Bid: ${chalk.bold(formatUSD(latestQuote.bp))}  |  Ask: ${chalk.bold(formatUSD(latestQuote.ap))}`);
        }

        return true;
    } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;
        fail(`Market Data connection failed [HTTP ${status}]: ${message}`);
        return false;
    }
}

// ─── Test 3: WebSocket Stream ─────────────────────────────────
async function testWebSocketConnection() {
    label('TEST 3 — WebSocket Stream (Real-Time)');
    divider();

    return new Promise((resolve) => {
        let authenticated = false;
        let timer;

        const ws = new WebSocket(STREAM_URL);

        // Timeout safety net — close after 8 seconds regardless
        timer = setTimeout(() => {
            if (!authenticated) {
                fail('WebSocket authentication timed out.');
            }
            ws.close();
            resolve(authenticated);
        }, 8000);

        ws.on('open', () => {
            pass(`WebSocket opened: ${chalk.bold(STREAM_URL)}`);
            // Send auth message
            ws.send(JSON.stringify({
                action: 'auth',
                key: API_KEY,
                secret: API_SECRET,
            }));
        });

        ws.on('message', (raw) => {
            const messages = JSON.parse(raw.toString());
            for (const msg of messages) {
                if (msg.T === 'success' && msg.msg === 'connected') {
                    info('Stream handshake received, authenticating...');
                }
                if (msg.T === 'success' && msg.msg === 'authenticated') {
                    authenticated = true;
                    pass(chalk.bold('WebSocket authenticated successfully!'));
                    // Subscribe to BTC/USD trades as a quick validation
                    ws.send(JSON.stringify({
                        action: 'subscribe',
                        trades: ['BTC/USD'],
                    }));
                }
                if (msg.T === 'subscription') {
                    pass(`Subscribed to trades: ${chalk.bold(JSON.stringify(msg.trades))}`);
                    info('Waiting briefly for a live trade tick...');
                }
                if (msg.T === 't') {
                    pass(`Live trade received — Price: ${chalk.bold.magenta(formatUSD(msg.p))}  Size: ${chalk.bold(msg.s)} BTC`);
                    clearTimeout(timer);
                    ws.close();
                    resolve(true);
                }
            }
        });

        ws.on('error', (err) => {
            fail(`WebSocket error: ${err.message}`);
            clearTimeout(timer);
            resolve(false);
        });

        ws.on('close', () => {
            info('WebSocket connection closed cleanly.');
        });
    });
}

// ─── Main Runner ──────────────────────────────────────────────
async function runTests() {
    console.log(chalk.bold.bgBlue.white('\n  ALPACA CRYPTO BOT — CONNECTION TEST SUITE  \n'));

    const brokerOk = await testBrokerConnection();
    const dataOk = await testMarketDataConnection();
    const streamOk = await testWebSocketConnection();

    // ── Summary ─────────────────────────────────────────────────
    label('SUMMARY');
    divider();
    console.log(`  Broker API:      ${brokerOk ? chalk.green('PASS ✔') : chalk.red('FAIL ✘')}`);
    console.log(`  Market Data API: ${dataOk ? chalk.green('PASS ✔') : chalk.red('FAIL ✘')}`);
    console.log(`  WebSocket:       ${streamOk ? chalk.green('PASS ✔') : chalk.red('FAIL ✘')}`);
    divider();

    const allPassed = brokerOk && dataOk && streamOk;
    if (allPassed) {
        console.log(chalk.bold.green('\n  All tests passed. Your bot is ready to connect! 🚀\n'));
    } else {
        console.log(chalk.bold.red('\n  Some tests failed. Review the errors above before proceeding.\n'));
        process.exit(1);
    }
}

runTests();
