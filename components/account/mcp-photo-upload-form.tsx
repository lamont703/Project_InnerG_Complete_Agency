"use client";

import { useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import { PHOTO_CATEGORIES, validateUpload, MAX_UPLOAD_BYTES } from "@/lib/gbp-photos";

/**
 * The upload form behind /upload/<token>.
 *
 * Shrinks the photo in the browser before sending, same as the website's photo
 * page and the in-chat box: Vercel rejects bodies over about 4.5MB, and a photo
 * straight off a phone is routinely larger.
 */

const MAX_EDGE = 1600;

async function shrink(file: File): Promise<File> {
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

export function McpPhotoUploadForm({ token, initialCategory }: { token: string; initialCategory: string | null }) {
  const [category, setCategory] = useState(initialCategory || "INTERIOR");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const spec = PHOTO_CATEGORIES.find((c) => c.category === category);

  const pick = (f: File | null) => {
    setError(null);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const send = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const ready = await shrink(file);
      const check = validateUpload({ type: ready.type, size: ready.size });
      if (!check.ok) throw new Error(check.issues.find((i) => i.level === "error")?.message);
      const body = new FormData();
      body.append("file", ready);
      body.append("category", category);
      const res = await fetch(`/api/mcp-upload/${encodeURIComponent(token)}`, { method: "POST", body });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "The upload failed.");
      setDone(spec?.label || "your listing");
    } catch (e: any) {
      setError(e.message || "The upload failed.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="flex items-center gap-2 font-black"><Check className="h-4 w-4" /> Uploaded as a draft for &quot;{done}&quot;.</p>
        <p className="mt-2">
          Go back to Claude and say <strong>&quot;I uploaded the photo&quot;</strong>. It will show you the draft, and it goes on
          Google only when you say yes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Where it goes</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
        >
          {PHOTO_CATEGORIES.map((c) => (
            <option key={c.category} value={c.category}>{c.label}</option>
          ))}
        </select>
        {spec && <span className="mt-1.5 block text-xs text-slate-500">{spec.guidance}</span>}
      </label>

      <label className="flex min-h-[140px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo" className="max-h-64 rounded-lg" />
        ) : (
          "Tap to choose a photo"
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />
      </label>

      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      <button
        onClick={send}
        disabled={!file || busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload
      </button>
    </div>
  );
}
