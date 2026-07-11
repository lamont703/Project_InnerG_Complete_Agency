"use client";

import { useState, useTransition } from "react";
import { Copy, Check, CheckCircle2, XCircle, Send, Loader2, AlertTriangle } from "lucide-react";
import { markPinStatus, postPinToGhl, type PinterestPin } from "@/app/pinterest-queue/actions";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-words">{value}</div>
    </div>
  );
}

export function PinCard({ pin }: { pin: PinterestPin }) {
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const handleStatus = (status: "posted" | "skipped") => {
    startTransition(async () => {
      const result = await markPinStatus(pin.id, status);
      if (result.success) setHidden(true);
    });
  };

  const handlePostToGhl = () => {
    if (!window.confirm(`Post "${pin.title}" to the "${pin.board_name}" board on Pinterest now? This is a real, live post.`)) return;
    setPostError(null);
    startTransition(async () => {
      const result = await postPinToGhl(pin.id);
      if (result.success) {
        setHidden(true);
      } else {
        setPostError(result.error || "Unknown error");
      }
    });
  };

  if (hidden) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col sm:flex-row">
      <div className="sm:w-64 shrink-0 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pin.image_url} alt={pin.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-5 flex-grow">
        <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 mb-3">
          {pin.board_name}
        </span>
        <CopyField label="Title" value={pin.title} />
        <CopyField label="Description" value={pin.description} />
        <CopyField label="Link" value={pin.link} />
        {postError && (
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{postError}</span>
          </div>
        )}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={handlePostToGhl}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post to Pinterest Now
          </button>
          <button
            onClick={() => handleStatus("posted")}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
            title="Already posted this manually via GHL's UI — just clear it from the queue"
          >
            <CheckCircle2 className="w-4 h-4" /> Already Posted
          </button>
          <button
            onClick={() => handleStatus("skipped")}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Skip
          </button>
        </div>
      </div>
    </div>
  );
}
