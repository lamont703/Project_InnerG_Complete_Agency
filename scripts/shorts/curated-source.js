#!/usr/bin/env node
/**
 * The hand-written cards in card-sources.js, as a source queue_entity_cards.js
 * can render from.
 *
 * WHY THIS WRAPPER EXISTS AT ALL. card-sources.js has always held these cards,
 * but the only scripts that consumed it — queue_shorts.js, run_scheduled.js,
 * remind.js — are the ORPHANED first version that writes to `shorts_queue`.
 * So three complete, sourced cards sat unreachable from the live pipeline
 * while the entity and licence pools ran dry. Nothing was broken; the two
 * halves had simply never been connected.
 *
 * CURATED KEYS ONLY. listKeys() also returns `derived:` and `candidate:` keys,
 * and neither belongs here: derived cards are threshold-gated and have their
 * own source module, and a candidate is by definition NOT approved yet.
 * Object.keys(SOURCES) is the curated set and nothing else.
 *
 * NO GATE OF ITS OWN, because these figures do not move on their own — they
 * are written by hand against a roster that is republished yearly. The queue's
 * item_key dedupe is what stops a repost, which is the same protection the
 * entity and licence sources rely on.
 */
const { SOURCES, buildCard } = require("./card-sources");

async function build() {
  return Promise.all(Object.keys(SOURCES).map((k) => buildCard(k)));
}

module.exports = { build };

if (require.main === module) {
  build().then((cards) => {
    console.log(`\n  ${cards.length} curated cards\n`);
    for (const c of cards) console.log(`  ${c.key.padEnd(24)} ${String(c.stat).padEnd(10)} ${c.label}`);
    console.log();
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
