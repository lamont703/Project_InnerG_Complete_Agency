import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { Film, Info } from "lucide-react";
import { VideoEditor } from "./editor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video Cutter | Inner G Complete",
  robots: { index: false, follow: false },
};

export default async function VideoEditorPage() {
  if (!(await isAdmin())) notFound();

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
            <Film className="h-6 w-6 text-slate-400" /> Video Cutter
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Mark the sections to remove, and the rest is stitched back together and downloaded.
            Scrub to a spot, hit &ldquo;cut starts here&rdquo;, scrub to the end of the bad bit, hit
            &ldquo;cut ends here&rdquo;. Repeat as many times as you like.
          </p>
        </header>

        {/*
          Said up front rather than discovered as a failure. Uploading through a
          serverless function is the constraint here, not ffmpeg: run against
          the local dev server and there is no practical size limit, but the
          hosted function caps the request body at 100MB and the run at 300
          seconds. A long 4K file will work on a laptop and fail in production,
          and that is a confusing way to find out.
        */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-bold">This runs locally only.</span> ffmpeg is not deployed with the
            site — bundling it puts the function over Vercel&apos;s 250MB limit — so rendering here
            will tell you to switch. Start the dev server and use it from there, where there is no
            upload cap and no time limit either.
          </p>
        </div>

        <VideoEditor />

        <p className="mt-8 text-xs leading-relaxed text-slate-500">
          Cuts are frame-accurate: the video is re-encoded once rather than trimmed on keyframes, so
          the edit lands exactly where you put it. Output is H.264 / AAC in an MP4, with faststart
          so it plays before it has finished downloading.
        </p>
      </main>
    </div>
  );
}
