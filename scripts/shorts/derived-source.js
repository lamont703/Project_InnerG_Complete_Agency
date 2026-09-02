#!/usr/bin/env node
/**
 * The threshold-gated cards emitted by derived-cards.js, as a source
 * queue_entity_cards.js can render from.
 *
 * THIS MODULE DELIBERATELY COMPUTES NOTHING. The gate — has this figure moved
 * enough to be worth saying again — lives in derived-cards.js and is the only
 * thing separating this pipeline from a bot that reposts the same number with
 * a new date. Recomputing here would run the metric without the gate, which
 * is precisely the failure the gate exists to prevent.
 *
 * So the contract is: `derived-cards.js --refresh` decides, this reads its
 * decision. An empty file means nothing has moved, and that is a correct
 * answer, not an error.
 */
const { derivedCards, buildCard } = require("./card-sources");

async function build() {
  const emitted = derivedCards();
  if (!emitted.length) return [];
  return Promise.all(emitted.map((d) => buildCard(d.key)));
}

module.exports = { build };

if (require.main === module) {
  build().then((cards) => {
    if (!cards.length) {
      console.log("\n  0 derived cards emitted. Run: node scripts/shorts/derived-cards.js --refresh\n");
      return;
    }
    console.log(`\n  ${cards.length} derived cards\n`);
    for (const c of cards) console.log(`  ${c.key.padEnd(32)} ${String(c.stat).padEnd(10)} ${c.label}`);
    console.log();
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
