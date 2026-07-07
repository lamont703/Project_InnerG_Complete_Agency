"use client";

import { useState } from "react";
import { CalendarDays, Loader2, Sparkles, CheckCircle2, ExternalLink } from "lucide-react";
import { publishEvent, type EventFormData } from "./actions";
import type { RecentEventRow } from "./data";

const CATEGORIES = ["Trade Show", "Competition", "Education/CEU", "Networking", "Charity", "Other"];

const EMPTY_FORM: EventFormData = {
  title: "", description: null, eventDate: "", endDate: null, startTime: null,
  endTime: null, venueName: null, address: null, city: null, category: null,
  organizerName: null, ticketUrl: null, sourceUrl: "", imageUrl: null, priceInfo: null,
};

function labelCls() {
  return "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block";
}
function inputCls() {
  // text-slate-900 is required here, not decorative — the site's :root
  // CSS variables default to a dark theme (near-white --foreground) and
  // no .light class is ever applied anywhere in the layout tree, so an
  // input with no explicit text color inherits near-white text on this
  // page's white background: invisible while typing.
  return "w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";
}

export function EventSubmission({ recentEvents }: { recentEvents: RecentEventRow[] }) {
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormData | null>(null);
  const [supplementedFields, setSupplementedFields] = useState<string[]>([]);
  const [extractionTier, setExtractionTier] = useState<string | number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const runExtraction = async () => {
    if (!url.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setPublishedId(null);
    setPublishedSlug(null);
    setPublishError(null);
    try {
      const res = await fetch("/api/events/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setExtractError(json.error || "Extraction failed.");
        setForm({ ...EMPTY_FORM, sourceUrl: url.trim() });
      } else {
        setForm({ ...EMPTY_FORM, ...json.event, sourceUrl: url.trim() });
        setSupplementedFields(json.supplementedFields || []);
        setExtractionTier(json.extractionTier ?? null);
      }
    } catch (err: any) {
      setExtractError(err.message || "Extraction failed.");
      setForm({ ...EMPTY_FORM, sourceUrl: url.trim() });
    } finally {
      setExtracting(false);
    }
  };

  const startManual = () => {
    setForm({ ...EMPTY_FORM, sourceUrl: url.trim() || "" });
    setExtractError(null);
    setSupplementedFields([]);
    setExtractionTier(null);
  };

  const updateField = (key: keyof EventFormData, value: string) => {
    if (!form) return;
    setForm({ ...form, [key]: value === "" ? null : value });
  };

  const doPublish = async () => {
    if (!form) return;
    setPublishing(true);
    setPublishError(null);
    const result = await publishEvent(form);
    setPublishing(false);
    if (result.success && result.id) {
      setPublishedId(result.id);
      setPublishedSlug(result.slug || null);
      setForm(null);
      setUrl("");
    } else {
      setPublishError(result.error || "Publish failed.");
    }
  };

  const isSupplemented = (key: string) => supplementedFields.includes(key);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5 text-indigo-600" />
          <h1 className="text-2xl font-black text-slate-900">Event Submission</h1>
        </div>
        <p className="text-slate-500 mb-8 max-w-2xl">
          Paste an event page URL (Eventbrite or any other site) to auto-extract details, review and correct anything wrong, then publish.
        </p>

        {/* URL input */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <label className={labelCls()}>Event page URL</label>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.eventbrite.com/e/..."
              className={inputCls() + " flex-1 min-w-[240px]"}
              disabled={extracting}
            />
            <button
              onClick={runExtraction}
              disabled={extracting || !url.trim()}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {extracting ? "Extracting…" : "Extract details"}
            </button>
            <button
              onClick={startManual}
              disabled={extracting}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
            >
              Fill in manually
            </button>
          </div>
          {extractError && <p className="text-xs text-rose-600 mt-2">{extractError}</p>}
          {extractionTier && (
            <p className="text-xs text-slate-400 mt-2">
              Extraction path: tier {extractionTier}{supplementedFields.length > 0 ? ` — ${supplementedFields.length} field(s) filled by AI from page text, double-check those` : ""}
            </p>
          )}
        </div>

        {publishedId && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700">
              Event published.{" "}
              <a href={`/events/${publishedSlug || publishedId}`} target="_blank" rel="noopener noreferrer" className="font-bold underline inline-flex items-center gap-1">
                View profile page <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        )}

        {/* Review / edit form */}
        {form && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Review before publishing</p>

            <div>
              <label className={labelCls()}>Title {isSupplemented("title") && <span className="text-indigo-500 normal-case font-normal">(AI-filled)</span>}</label>
              <input className={inputCls()} value={form.title || ""} onChange={(e) => updateField("title", e.target.value)} />
            </div>

            <div>
              <label className={labelCls()}>Description {isSupplemented("description") && <span className="text-indigo-500 normal-case font-normal">(AI-filled)</span>}</label>
              <textarea className={inputCls()} rows={2} value={form.description || ""} onChange={(e) => updateField("description", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelCls()}>Event date {isSupplemented("eventDate") && <span className="text-indigo-500 normal-case font-normal">(AI)</span>}</label>
                <input type="date" className={inputCls()} value={form.eventDate || ""} onChange={(e) => updateField("eventDate", e.target.value)} />
              </div>
              <div>
                <label className={labelCls()}>End date (multi-day)</label>
                <input type="date" className={inputCls()} value={form.endDate || ""} onChange={(e) => updateField("endDate", e.target.value)} />
              </div>
              <div>
                <label className={labelCls()}>Start time</label>
                <input type="time" className={inputCls()} value={form.startTime || ""} onChange={(e) => updateField("startTime", e.target.value)} />
              </div>
              <div>
                <label className={labelCls()}>End time</label>
                <input type="time" className={inputCls()} value={form.endTime || ""} onChange={(e) => updateField("endTime", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls()}>Venue name {isSupplemented("venueName") && <span className="text-indigo-500 normal-case font-normal">(AI)</span>}</label>
                <input className={inputCls()} value={form.venueName || ""} onChange={(e) => updateField("venueName", e.target.value)} />
              </div>
              <div>
                <label className={labelCls()}>City {isSupplemented("city") && <span className="text-indigo-500 normal-case font-normal">(AI)</span>}</label>
                <input className={inputCls()} value={form.city || ""} onChange={(e) => updateField("city", e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls()}>Address {isSupplemented("address") && <span className="text-indigo-500 normal-case font-normal">(AI-filled)</span>}</label>
              <input className={inputCls()} value={form.address || ""} onChange={(e) => updateField("address", e.target.value)} placeholder="Used to geocode the event on publish" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls()}>Category {isSupplemented("category") && <span className="text-indigo-500 normal-case font-normal">(AI)</span>}</label>
                <select className={inputCls()} value={form.category || ""} onChange={(e) => updateField("category", e.target.value)}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls()}>Price info</label>
                <input className={inputCls()} value={form.priceInfo || ""} onChange={(e) => updateField("priceInfo", e.target.value)} placeholder="e.g. $25-$150, Free" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls()}>Organizer name</label>
                <input className={inputCls()} value={form.organizerName || ""} onChange={(e) => updateField("organizerName", e.target.value)} />
              </div>
              <div>
                <label className={labelCls()}>Ticket URL</label>
                <input className={inputCls()} value={form.ticketUrl || ""} onChange={(e) => updateField("ticketUrl", e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls()}>Image URL</label>
              <input className={inputCls()} value={form.imageUrl || ""} onChange={(e) => updateField("imageUrl", e.target.value)} />
            </div>

            {publishError && <p className="text-xs text-rose-600">{publishError}</p>}

            <button
              onClick={doPublish}
              disabled={publishing || !form.title || !form.eventDate}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {publishing ? "Publishing…" : "Publish event"}
            </button>
          </div>
        )}

        {/* Recently submitted */}
        {recentEvents.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Recently submitted</p>
            <div className="space-y-2">
              {recentEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:text-indigo-600 truncate block">
                      {e.title}
                    </a>
                    <p className="text-xs text-slate-400">{e.eventDate}{e.city ? ` • ${e.city}` : ""}{e.category ? ` • ${e.category}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
