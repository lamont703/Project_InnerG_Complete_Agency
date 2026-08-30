import { ImageResponse } from "next/og";
import { buildReport } from "@/lib/credit-report/model";
import { MOCK_TRADELINES } from "@/lib/credit-report/mock";

/**
 * The card people see when this page is pasted into a text, Slack or a post.
 *
 * GENERATED, NOT A PNG IN /public, for the same reason the on-page sample is a
 * component: it is drawn from the real buildReport(), so a share card can never
 * advertise a score the product would not produce. A hand-made image would drift
 * the first time the model changed and nobody would notice for months.
 *
 * The week squares are the whole idea in one glance — a row of green with a
 * couple of amber in it is what "payment history" means here, and it reads at
 * thumbnail size where a paragraph does not.
 */
export const runtime = "nodejs";
export const alt = "ShearQuery Credit Report — booth rent payment history";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLOR: Record<string, string> = {
  on_time: "#10b981",
  caught_up: "#38bdf8",
  late: "#fbbf24",
  missed: "#f43f5e",
  excused: "#e2e8f0",
  no_record: "#f1f5f9",
};

export default async function Image() {
  const report = buildReport(MOCK_TRADELINES);
  // One flat run of weeks, newest last. Enough to fill a band, not so many that
  // each square stops being visible at the size this gets rendered.
  const weeks = report.tradelines.flatMap((t) => t.weeks).slice(-78);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: "#0f172a", padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#64748b", textTransform: "uppercase" }}>
            ShearQuery Credit Report
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: "#f8fafc", marginTop: 16, lineHeight: 1.1 }}>
            Booth rent that finally
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: "#34d399", lineHeight: 1.1 }}>
            counts for something
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#94a3b8", marginTop: 22, maxWidth: 820 }}>
            Shops and salons confirm who paid, one tap a fortnight. The worker owns the record and
            carries it to their next chair.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", width: 760, gap: 6 }}>
            {weeks.map((w, i) => (
              <div
                key={i}
                style={{
                  display: "flex", width: 22, height: 22, borderRadius: 4,
                  background: COLOR[w.status] ?? COLOR.no_record,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 110, fontWeight: 800, color: "#34d399", lineHeight: 1 }}>
              {report.score}
            </div>
            <div style={{ display: "flex", fontSize: 22, color: "#64748b" }}>out of 100 · free</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
