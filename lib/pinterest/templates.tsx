// Pinterest pin graphics, rendered via next/og (Satori) inside
// app/api/pinterest/render/route.tsx. These are pure presentation —
// every function here takes already-fetched data and returns JSX; no
// Supabase calls happen in this file. Real data comes from
// scripts/generate_pinterest_pins.js, which fetches it once and passes
// the same object both here (for the image) and into the pin's
// title/description/link (for GHL) — so the two can never disagree.
//
// All templates target 1000x1500 (2:3), Pinterest's preferred aspect ratio.

const BG = "linear-gradient(160deg, #0b0e1a 0%, #1a1f35 100%)";
const ACCENT = "#6366f1";
const GREEN = "#22c55e";

function PinShell({
  eyebrow,
  headline,
  footerRight,
  children,
}: {
  eyebrow: string;
  headline: string;
  footerRight: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "1000px",
        height: "1500px",
        display: "flex",
        flexDirection: "column",
        background: BG,
        fontFamily: "sans-serif",
        padding: "70px 60px",
      }}
    >
      <div style={{ display: "flex", color: ACCENT, fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>{eyebrow}</div>
      <div style={{ display: "flex", color: "#ffffff", fontSize: 56, fontWeight: 900, lineHeight: 1.15, marginTop: 20 }}>
        {headline}
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 50, flexGrow: 1 }}>{children}</div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.15)",
          paddingTop: 30,
        }}
      >
        <div style={{ display: "flex", color: "#ffffff", fontSize: 26, fontWeight: 700 }}>Inner G Complete</div>
        <div style={{ display: "flex", color: "#9ca3af", fontSize: 22 }}>{footerRight}</div>
      </div>
    </div>
  );
}

function RankRow({ rank, primary, secondary, statValue, statColor = GREEN }: { rank: number; primary: string; secondary: string; statValue: string; statColor?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 20,
        padding: "28px 32px",
        border: "1px solid rgba(255,255,255,0.1)",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 64,
          height: 64,
          borderRadius: 999,
          background: ACCENT,
          color: "white",
          fontSize: 30,
          fontWeight: 800,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 28,
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <div style={{ display: "flex", color: "#ffffff", fontSize: 32, fontWeight: 700 }}>{primary}</div>
        <div style={{ display: "flex", color: "#9ca3af", fontSize: 24, marginTop: 4 }}>{secondary}</div>
      </div>
      <div style={{ display: "flex", color: statColor, fontSize: 40, fontWeight: 900 }}>{statValue}</div>
    </div>
  );
}

export type SchoolRankingRow = { school_name: string; city: string; pass_rate: number; test_takers: number; track: "Barber" | "Cosmetology" };

export function SchoolRankingTemplate({ rows, headline }: { rows: SchoolRankingRow[]; headline: string }) {
  return (
    <PinShell eyebrow="TEXAS LICENSING · 2026" headline={headline} footerRight="See full rankings →">
      {rows.map((r, i) => (
        <RankRow
          key={r.school_name}
          rank={i + 1}
          primary={r.school_name}
          secondary={`${r.city} · ${r.track} · ${r.test_takers} test takers`}
          statValue={`${Math.round(r.pass_rate * 100)}%`}
        />
      ))}
    </PinShell>
  );
}

export type BoothRentRow = { area: string; avgWeeklyRent: number; listingCount: number };

export function BoothRentTemplate({ rows, headline }: { rows: BoothRentRow[]; headline: string }) {
  return (
    <PinShell eyebrow="HOUSTON BOOTH RENT · 2026" headline={headline} footerRight="See live listings →">
      {rows.map((r, i) => (
        <RankRow
          key={r.area}
          rank={i + 1}
          primary={r.area}
          secondary={`${r.listingCount} listing${r.listingCount === 1 ? "" : "s"}`}
          statValue={`$${Math.round(r.avgWeeklyRent)}/wk`}
          statColor={ACCENT}
        />
      ))}
    </PinShell>
  );
}

export function MythBustTemplate({ eyebrow, headline, facts }: { eyebrow: string; headline: string; facts: string[] }) {
  return (
    <PinShell eyebrow={eyebrow} headline={headline} footerRight="Read the full guide →">
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 20 }}>
        {facts.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ display: "flex", color: GREEN, fontSize: 34, fontWeight: 900, marginRight: 20 }}>—</div>
            <div style={{ display: "flex", color: "#e5e7eb", fontSize: 30, fontWeight: 500, lineHeight: 1.4 }}>{f}</div>
          </div>
        ))}
      </div>
    </PinShell>
  );
}

export type EntityLeaderboardRow = { name: string; city: string; rating: number; reviewCount: number };

export function EntityLeaderboardTemplate({ rows, headline }: { rows: EntityLeaderboardRow[]; headline: string }) {
  return (
    <PinShell eyebrow="HOUSTON · REAL CUSTOMER RATINGS" headline={headline} footerRight="See all profiles →">
      {rows.map((r, i) => (
        <RankRow
          key={r.name}
          rank={i + 1}
          primary={r.name}
          secondary={`${r.city} · ${r.reviewCount} reviews`}
          statValue={`${r.rating.toFixed(1)}/5`}
        />
      ))}
    </PinShell>
  );
}

export type OpenChairsRow = { name: string; city: string; chairsAvailable: number };

export function OpenChairsTemplate({ rows, headline }: { rows: OpenChairsRow[]; headline: string }) {
  return (
    <PinShell eyebrow="HOUSTON · LIVE AVAILABILITY" headline={headline} footerRight="Contact these shops →">
      {rows.map((r, i) => (
        <RankRow
          key={r.name}
          rank={i + 1}
          primary={r.name}
          secondary={r.city}
          statValue={`${r.chairsAvailable} open`}
          statColor={ACCENT}
        />
      ))}
    </PinShell>
  );
}
