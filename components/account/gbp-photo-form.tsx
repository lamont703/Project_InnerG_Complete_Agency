"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, Check, Info, Loader2, Upload } from "lucide-react";
import { validateUpload, MAX_UPLOAD_BYTES, type PhotoCoverage, type CoverageItem } from "@/lib/gbp-photos";

/**
 * Photo coverage and upload.
 *
 * Organised by what's missing rather than by a count, because the count is the
 * misleading number — the listing this was built against has ninety photos and
 * still no picture of the inside of the shop.
 *
 * Every category carries guidance on what to actually photograph. The upload is
 * the easy half; knowing what to point the camera at is where owners stall.
 *
 * Images are resized in the browser before sending. Vercel rejects request
 * bodies over about 4.5MB, and a photo straight off a phone is routinely
 * larger — that limit has already caused one production failure in this
 * codebase.
 */
const MAX_EDGE = 1600;

async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 900_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // White behind a transparent PNG, or it flattens to black in JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function GbpPhotoForm() {
  const [coverage, setCoverage] = useState<PhotoCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    try {
      const res = await fetch("/api/account/gbp-photos", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) setError(json.error || "Could not load your photos.");
      else setCoverage(json.coverage);
    } catch { setError("Could not load your photos."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const upload = async (category: string, file: File) => {
    setError(null); setDone(null);
    const prepared = await compress(file);
    const check = validateUpload({ type: prepared.type, size: prepared.size });
    if (!check.ok) { setError(check.issues[0]?.message || "That file can't be used."); return; }

    setBusy(category);
    try {
      const body = new FormData();
      body.append("file", prepared);
      body.append("category", category);
      const res = await fetch("/api/account/gbp-photos", { method: "POST", body });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Upload failed."); return; }
      setCoverage(json.coverage);
      setDone("Photo added. Google can take a little while to show it.");
    } catch { setError("Upload failed."); }
    finally { setBusy(null); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Looking at your photos…</p>;
  if (error && !coverage) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );
  if (!coverage) return null;

  const row = (item: CoverageItem) => (
    <article key={item.category} className={`mt-3 rounded-2xl border bg-white p-4 ${item.missing ? "border-amber-300" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Camera className="h-3.5 w-3.5 text-slate-400" />
            {item.label}
            {item.missing ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-800">none yet</span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">{item.count} of {item.target}</span>
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.guidance}</p>
        </div>
        <div className="shrink-0">
          <input
            ref={(el) => { inputs.current[item.category] = el; }}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(item.category, f); e.target.value = ""; }}
          />
          <button
            onClick={() => inputs.current[item.category]?.click()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === item.category ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Add photo
          </button>
        </div>
      </div>
    </article>
  );

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-900">
          {coverage.total} photo{coverage.total === 1 ? "" : "s"} on your listing
        </p>
        {coverage.uncategorised > 0 && (
          <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {coverage.uncategorised} of them aren&apos;t filed under a category, so Google doesn&apos;t
            know whether they show the room, the work or the team. A count on its own doesn&apos;t
            tell a customer anything.
          </p>
        )}
      </div>

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {done && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> {done}
        </p>
      )}

      {coverage.gaps.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Missing entirely</h2>
          {coverage.gaps.map(row)}
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
          {coverage.gaps.length > 0 ? "Everything else" : "Your categories"}
        </h2>
        {coverage.items.filter((i) => !i.missing).map(row)}
      </section>

      <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Only upload photos you have the right to use. Photos of clients need their agreement —
        they&apos;ll be public on your listing.
      </p>
      <p className="mt-4">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
