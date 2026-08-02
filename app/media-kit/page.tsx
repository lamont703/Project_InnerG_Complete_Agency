import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";

export const revalidate = 3600;

const CANONICAL = "https://agency.innergcomplete.com/media-kit";

export const metadata: Metadata = {
  title: "Advertising Media Kit — Sponsorships & Ad Placements",
  description:
    "Advertise on ShearQuery / Inner G Complete — the barber & cosmetology intelligence platform. ~223K monthly search impressions, nearly 9,000 listed entities across TX & CA, and four ad products: geographic sponsorships, on-profile ads, and search-results placements.",
  keywords: [
    "barber advertising",
    "salon advertising",
    "beauty industry sponsorship",
    "barbershop directory advertising",
    "cosmetology school advertising",
    "barber supply advertising",
  ],
  openGraph: {
    title: "Advertising Media Kit — Inner G Complete / ShearQuery",
    description:
      "Reach a concentrated barber & cosmetology audience — geographic sponsorships, on-profile ads, and search-results placements.",
    url: CANONICAL,
    type: "website",
  },
  alternates: { canonical: CANONICAL },
};

const CSS = `
  .mk { --ink:#0a0f1e; --ink-2:#141b30; --paper:#f5f6fb; --card:#fff; --line:#e3e6f0; --accent:#4f46e5; --accent-soft:#eef0ff; --accent-ink:#3730a3; --pos:#059669; --slate:#475569; --slate-soft:#94a3b8; }
  .mk { background: var(--paper); color: var(--ink); line-height: 1.55; }
  .mk .wrap { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
  .mk section { padding: 64px 0; }
  .mk h1, .mk h2, .mk h3 { margin: 0; text-wrap: balance; }
  .mk .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .mk .num { font-variant-numeric: tabular-nums; }
  .mk .hero { background: radial-gradient(120% 120% at 80% 0%, #1c2544 0%, var(--ink) 55%); color: #fff; padding: 120px 0 72px; }
  .mk .hero .eyebrow { color: #a5b4fc; }
  .mk .hero h1 { font-size: clamp(38px, 7vw, 76px); font-weight: 900; font-style: italic; letter-spacing: -0.04em; text-transform: uppercase; line-height: 0.92; margin: 18px 0 0; }
  .mk .hero .lede { font-size: clamp(16px, 2.2vw, 20px); color: #cbd5e1; max-width: 620px; margin: 22px 0 0; }
  .mk .badge { display: inline-flex; align-items: center; gap: 8px; margin-top: 28px; padding: 8px 15px; border: 1px solid rgba(165,180,252,0.35); border-radius: 999px; font-size: 13px; font-weight: 700; color: #c7d2fe; background: rgba(79,70,229,0.12); }
  .mk .stats { background: var(--ink-2); color: #fff; padding: 40px 0; }
  .mk .statgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .mk .stat .n { font-size: clamp(30px, 4.5vw, 46px); font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
  .mk .stat .n.pos { color: #34d399; }
  .mk .stat .l { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin-top: 8px; }
  .mk .kicker { font-size: clamp(24px, 3.4vw, 34px); font-weight: 900; letter-spacing: -0.03em; }
  .mk .sub { color: var(--slate); max-width: 640px; margin: 12px 0 0; }
  .mk .chips { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
  .mk .chip { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; flex: 1 1 200px; }
  .mk .chip .big { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; }
  .mk .chip .cap { font-size: 13px; color: var(--slate); margin-top: 2px; }
  .mk .cats { margin-top: 28px; display: grid; gap: 10px; }
  .mk .cat { display: grid; grid-template-columns: 190px 1fr 62px; align-items: center; gap: 14px; }
  .mk .cat .cname { font-size: 14px; font-weight: 700; }
  .mk .cat .track { height: 12px; background: var(--accent-soft); border-radius: 999px; overflow: hidden; }
  .mk .cat .fill { height: 100%; background: linear-gradient(90deg, #6366f1, #4f46e5); border-radius: 999px; }
  .mk .cat .cval { font-size: 14px; font-weight: 800; text-align: right; }
  .mk .inv { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 32px; }
  .mk .card { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 26px; }
  .mk .card.wide { grid-column: 1 / -1; }
  .mk .card .tag { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-ink); background: var(--accent-soft); padding: 5px 10px; border-radius: 8px; }
  .mk .card h3 { font-size: 21px; font-weight: 900; letter-spacing: -0.02em; margin-top: 14px; }
  .mk .card p { color: var(--slate); font-size: 14.5px; margin: 10px 0 0; }
  .mk .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .mk .pill { font-size: 12px; font-weight: 700; color: var(--slate); background: #f1f5f9; border: 1px solid var(--line); border-radius: 999px; padding: 5px 11px; }
  .mk .tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
  .mk .tier { border: 1px solid var(--line); border-radius: 14px; padding: 16px; background: #fbfcfe; }
  .mk .tier .tn { font-weight: 900; font-size: 15px; }
  .mk .tier .td { font-size: 12.5px; color: var(--slate); margin-top: 5px; }
  .mk .ratewrap { overflow-x: auto; margin-top: 24px; border: 1px solid var(--line); border-radius: 18px; background: var(--card); }
  .mk table { width: 100%; border-collapse: collapse; min-width: 560px; }
  .mk th, .mk td { text-align: left; padding: 16px 20px; border-bottom: 1px solid var(--line); font-size: 14.5px; }
  .mk th { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--slate-soft); background: #fafbff; }
  .mk td.plc { font-weight: 800; }
  .mk .price { font-weight: 900; color: var(--accent-ink); font-size: 16px; white-space: nowrap; letter-spacing: -0.01em; }
  .mk .price .per { color: var(--slate); font-weight: 700; font-size: 12px; margin-left: 1px; }
  .mk tr:last-child td { border-bottom: 0; }
  .mk .why { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 30px; }
  .mk .why .w { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 22px; }
  .mk .why .w .wt { font-weight: 900; font-size: 16px; }
  .mk .why .w .wd { color: var(--slate); font-size: 14px; margin-top: 8px; }
  .mk .cta { background: var(--ink); color: #fff; border-radius: 24px; padding: 48px 40px; text-align: center; margin: 24px 0; }
  .mk .cta h2 { font-size: clamp(26px, 4vw, 40px); font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.03em; line-height: 0.95; }
  .mk .cta p { color: #cbd5e1; max-width: 500px; margin: 16px auto 0; }
  .mk .btn { display: inline-block; margin-top: 26px; background: var(--accent); color: #fff; font-weight: 800; font-size: 14px; letter-spacing: 0.03em; text-transform: uppercase; padding: 15px 30px; border-radius: 12px; text-decoration: none; }
  .mk .contact { margin-top: 18px; font-size: 14px; color: #94a3b8; }
  .mk .contact b { color: #fff; }
  .mk .foot { text-align: center; color: var(--slate-soft); font-size: 12.5px; padding: 30px 0 60px; }
  @media (max-width: 760px) {
    .mk .statgrid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .mk .inv, .mk .why, .mk .tiers { grid-template-columns: 1fr; }
    .mk .cat { grid-template-columns: 120px 1fr 52px; gap: 10px; }
    .mk .cat .cname { font-size: 12.5px; }
  }
`;

const MAILTO =
  "mailto:sponsorships@innergcomplete.com?subject=ShearQuery%20Advertising%20Inquiry";

export default function MediaKitPage() {
  const rows: { placement: string; scope: string; advertiser: string; price: string }[] = [
    { placement: "City Sponsorship", scope: "One metro hub + profiles", advertiser: "Local operators, regional brands", price: "39" },
    { placement: "State Sponsorship", scope: "Statewide hub + all cities", advertiser: "Distributors, multi-location chains", price: "79" },
    { placement: "National Sponsorship", scope: "Homepage + full directory", advertiser: "Manufacturers, national brands", price: "399" },
    { placement: "On-Profile Ad", scope: "Per profile / per bundle", advertiser: "Competing shops, suppliers, schools", price: "20" },
    { placement: "Search Results Ad", scope: "Per category + city", advertiser: "Any high-intent advertiser", price: "10" },
  ];
  const cats: { name: string; w: number; v: string }[] = [
    { name: "Hair Salons", w: 100, v: "2,672" },
    { name: "Barbershops", w: 95, v: "2,540" },
    { name: "Barbers", w: 53, v: "1,429" },
    { name: "Cosmetology Schools", w: 35, v: "941" },
    { name: "Beauty Supply Stores", w: 25, v: "663" },
    { name: "Barber Supply Stores", w: 9, v: "247" },
    { name: "Barber Schools", w: 9, v: "244" },
    { name: "Cosmetologists", w: 5, v: "122" },
  ];

  return (
    <div className="mk">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Navbar />

      <header className="hero">
        <div className="wrap">
          <div className="eyebrow">Advertising &amp; Sponsorship Media Kit · 2026</div>
          <h1>Reach the people<br />behind every chair.</h1>
          <p className="lede">
            Inner G Complete (ShearQuery) is the barber &amp; cosmetology intelligence platform — a searchable
            directory of nearly 9,000 shops, salons, schools, licensed pros, and suppliers, with market data that
            isn&rsquo;t on Google.
          </p>
          <div className="badge">◆ Intelligence not available on Google</div>
        </div>
      </header>

      <div className="stats">
        <div className="wrap">
          <div className="statgrid">
            <div className="stat"><div className="n pos num">223K</div><div className="l">Monthly search impressions</div></div>
            <div className="stat"><div className="n num">8,862</div><div className="l">Listed entities</div></div>
            <div className="stat"><div className="n num">19,800</div><div className="l">Interactions / 30 days</div></div>
            <div className="stat"><div className="n num">2</div><div className="l">States live (TX · CA)</div></div>
          </div>
        </div>
      </div>

      <section>
        <div className="wrap">
          <div className="eyebrow">Who you reach</div>
          <h2 className="kicker">A concentrated, high-intent industry audience</h2>
          <p className="sub">
            Not a general-interest audience — every visitor is here for one industry. Shop and salon owners deciding
            where to spend, students choosing schools, licensed professionals, and buyers sourcing product. The
            platform surfaces in Google roughly <b>223,000 times a month</b> for barber &amp; beauty searches.
          </p>
          <div className="chips">
            <div className="chip"><div className="big">Owners</div><div className="cap">Barbershop &amp; salon operators making booth, supply &amp; hiring decisions</div></div>
            <div className="chip"><div className="big">Students</div><div className="cap">Barber &amp; cosmetology students choosing schools and prepping for state boards</div></div>
            <div className="chip"><div className="big">Licensed pros</div><div className="cap">Barbers &amp; cosmetologists researching chairs, brands &amp; opportunities</div></div>
            <div className="chip"><div className="big">Buyers</div><div className="cap">Shoppers sourcing from barber &amp; beauty supply stores</div></div>
          </div>
          <div className="cats">
            {cats.map((c) => (
              <div className="cat" key={c.name}>
                <div className="cname">{c.name}</div>
                <div className="track"><div className="fill" style={{ width: `${c.w}%` }} /></div>
                <div className="cval num">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "#eef1f8" }}>
        <div className="wrap">
          <div className="eyebrow">The inventory</div>
          <h2 className="kicker">Four ways to advertise</h2>
          <p className="sub">
            From broad geographic sponsorships down to a single competitor&rsquo;s profile page — placements that match
            how advertisers actually think about this market.
          </p>
          <div className="inv">
            <div className="card wide">
              <span className="tag">1 · Geographic Sponsorships</span>
              <h3>Own a city, a state, or the nation</h3>
              <p>
                Sponsor the hub pages people land on when they search a place — your brand featured across an entire
                geography&rsquo;s directory and market-intelligence pages.
              </p>
              <div className="tiers">
                <div className="tier"><div className="tn">City</div><div className="td">One metro&rsquo;s hub &amp; profiles — e.g. Houston, Dallas, Los Angeles. Best for local operators &amp; regional brands.</div></div>
                <div className="tier"><div className="tn">State</div><div className="td">The Texas or California statewide hub and every city beneath it. Best for regional distributors &amp; chains.</div></div>
                <div className="tier"><div className="tn">National</div><div className="td">Homepage &amp; the full A–Z directory across all markets. Best for manufacturers &amp; national brands.</div></div>
              </div>
            </div>
            <div className="card">
              <span className="tag">2 · On-Profile Advertising</span>
              <h3>Sponsored slot on entity pages</h3>
              <p>
                A clearly-labeled &ldquo;Sponsored&rdquo; placement inside individual shop, salon, and school profiles —
                including your competitors&rsquo; pages. High intent: the visitor is already looking at a business
                exactly like yours.
              </p>
              <div className="meta">
                <span className="pill">Shop &amp; salon profiles</span>
                <span className="pill">School profiles</span>
                <span className="pill">&ldquo;Sponsored&rdquo; labeled</span>
              </div>
            </div>
            <div className="card">
              <span className="tag">3 · Search Results Advertising</span>
              <h3>Top of the search engine</h3>
              <p>
                A featured/recommended placement in the ShearQuery search results — the moment a user is actively
                comparing options in a category or city. Prime position at the point of decision.
              </p>
              <div className="meta">
                <span className="pill">Category targeting</span>
                <span className="pill">City targeting</span>
                <span className="pill">Point-of-decision</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="eyebrow">Rate card</div>
          <h2 className="kicker">Packages &amp; placements</h2>
          <p className="sub">
            Starting monthly rates below, with quarterly and annual discounts available. Final pricing scales with
            geography, category, and campaign length — reach out and we&rsquo;ll tailor a package.
          </p>
          <div className="ratewrap">
            <table>
              <thead>
                <tr><th>Placement</th><th>Scope</th><th>Ideal advertiser</th><th>Pricing</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.placement}>
                    <td className="plc">{r.placement}</td>
                    <td>{r.scope}</td>
                    <td>{r.advertiser}</td>
                    <td><span className="price">From ${r.price}<span className="per">/mo</span></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ background: "#eef1f8" }}>
        <div className="wrap">
          <div className="eyebrow">Why here</div>
          <h2 className="kicker">What makes this audience worth paying for</h2>
          <div className="why">
            <div className="w"><div className="wt">Single-industry intent</div><div className="wd">No wasted impressions on a general audience — everyone here is in barbering &amp; cosmetology, deciding or buying right now.</div></div>
            <div className="w"><div className="wt">Data that isn&rsquo;t on Google</div><div className="wd">Real state-board pass rates, market ecosystems, and rankings pull visitors and keep them — context your ad sits inside.</div></div>
            <div className="w"><div className="wt">Placement, not a banner farm</div><div className="wd">Limited, clearly-labeled slots — your brand isn&rsquo;t buried among dozens of ads competing for the same glance.</div></div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="cta">
            <h2>Let&rsquo;s put your<br />brand in front of them.</h2>
            <p>Tell us the geography and category you want to own, and we&rsquo;ll match you to the right placement and package.</p>
            <a className="btn" href={MAILTO}>Start a conversation</a>
            <div className="contact"><b>sponsorships@innergcomplete.com</b> &nbsp;·&nbsp; agency.innergcomplete.com</div>
          </div>
        </div>
      </section>

      <div className="foot">
        Figures reflect the live platform as of July 2026 · entity counts and 30-day interaction volume from internal
        analytics · search impressions from Google Search Console (trailing 28-day average) · pass-rate data from TX
        TDLR &amp; CA BBC.
      </div>
    </div>
  );
}
