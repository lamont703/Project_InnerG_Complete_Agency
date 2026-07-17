// Ezoic ad placement snippet, wrapped for consistent spacing wherever it's
// dropped in. Deliberately a plain <script> (not next/script's <Script>
// component) — Ezoic's showAds() call is position-sensitive (it inserts
// the ad at this exact point in the DOM), and next/script's abstraction
// doesn't guarantee that same in-place execution semantics the way a
// native inline script does. No id/key needed since there's nothing to
// dedupe against — the same call is meant to be repeated once per ad slot
// on a page, per Ezoic's own docs ("use the same snippet for each ad
// location... ads never stack").
export function EzoicAd({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full flex justify-center ${className}`}>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.ezstandalone = window.ezstandalone || {};
            ezstandalone.cmd = ezstandalone.cmd || [];
            ezstandalone.cmd.push(function () {
              ezstandalone.showAds({});
            });
          `,
        }}
      />
    </div>
  );
}
