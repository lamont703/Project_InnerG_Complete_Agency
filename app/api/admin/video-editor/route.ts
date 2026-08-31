import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { keepRanges, selectFilter, totalDuration, type Range } from "@/lib/video-editor/ranges";

/**
 * Cut sections out of a video and stitch what is left back together.
 *
 * SERVER-SIDE WITH THE ffmpeg ALREADY IN THIS REPO. @ffmpeg-installer ships a
 * binary and scripts/render_short_video.js has been using it for the Shorts
 * pipeline, so this adds no dependency and inherits a toolchain that is known
 * to work here.
 *
 * ONE PASS, FRAME ACCURATE, and the reasoning is in lib/video-editor/ranges.ts:
 * cutting each surviving piece with -ss/-to and concatenating is faster with
 * stream copy but lands every edit on the nearest keyframe. An editor that puts
 * the cut approximately where you clicked is the one thing an editor must not
 * be.
 *
 * SIZE IS THE REAL LIMIT, and it is worth being plain about rather than
 * discovering: run locally there is none. On Vercel the request body caps at
 * 100MB and the function at 300s, so a long 4K file will fail in production and
 * succeed on a laptop. This is an internal tool for one person, so local is the
 * expected home.
 */
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const run = promisify(execFile);

/**
 * The ffmpeg binary, found on disk rather than imported.
 *
 * Not a workaround for anything — importing @ffmpeg-installer would work. This
 * is simply narrower: no module reference for a bundler to analyse, and
 * FFMPEG_PATH wins when set, so a host with its own ffmpeg needs no rebuild.
 * next.config's outputFileTracingIncludes is what ships the bundled binary.
 *
 * (An earlier version of this comment blamed the package for breaking the
 * production build. It did not. The build died on a committed symlink under
 * venv/, and this route was merely the first one to touch the filesystem and
 * make Turbopack walk the project directory. See .gitignore.)
 */
function ffmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const plat = process.platform === "win32" ? "win32" : process.platform;
  const arch = process.arch;
  const candidate = join(
    process.cwd(),
    "node_modules",
    "@ffmpeg-installer",
    `${plat}-${arch}`,
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  );
  if (existsSync(candidate)) return candidate;
  // Last resort: whatever is on PATH.
  return "ffmpeg";
}

/**
 * Is there an ffmpeg we can actually run?
 *
 * The binary is NOT shipped to Vercel — bundling it made this function 308MB
 * against a 250MB limit. So on the hosted site there is nothing to run, and the
 * honest thing is to say that rather than let ffmpeg fail with ENOENT and
 * surface as "ffmpeg failed: spawn ffmpeg ENOENT", which reads like a bug.
 */
function ffmpegAvailable(): boolean {
  const p = ffmpegPath();
  return p !== "ffmpeg" || Boolean(process.env.FFMPEG_PATH);
}

/** ffmpeg prints duration to stderr; there is no ffprobe in this repo. */
async function probeDuration(file: string): Promise<number | null> {
  try {
    await run(ffmpegPath(), ["-i", file], { maxBuffer: 1 << 24 });
    return null;
  } catch (e: any) {
    const m = String(e?.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "not_authorised" }, { status: 403 });
  }

  if (!ffmpegAvailable()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Video rendering only runs locally. The ffmpeg binary is not deployed — it would put this function over Vercel's 250MB limit. Run the dev server and use the tool from there.",
      },
      { status: 503 },
    );
  }

  let dir: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("video");
    const cutsRaw = String(form.get("cuts") || "[]");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "No video received." }, { status: 400 });
    }

    let cuts: Range[];
    try {
      cuts = JSON.parse(cutsRaw);
      if (!Array.isArray(cuts)) throw new Error("not an array");
    } catch {
      return NextResponse.json({ ok: false, error: "Could not read the cut list." }, { status: 400 });
    }

    dir = await mkdtemp(join(tmpdir(), "sq-video-"));
    const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".mp4").toLowerCase();
    const input = join(dir, `in${ext}`);
    const output = join(dir, "out.mp4");
    await writeFile(input, Buffer.from(await file.arrayBuffer()));

    const duration = await probeDuration(input);
    if (!duration) {
      return NextResponse.json(
        { ok: false, error: "Couldn't read that file as a video." },
        { status: 400 },
      );
    }

    const keep = keepRanges(cuts, duration);
    if (!keep.length) {
      // Rendering this would produce an empty file and look like a crash.
      return NextResponse.json(
        { ok: false, error: "Those cuts remove the whole video — nothing would be left." },
        { status: 400 },
      );
    }

    const filter = selectFilter(keep)!;
    await run(
      ffmpegPath(),
      [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", input,
        "-vf", filter.video,
        "-af", filter.audio,
        // Re-encode is unavoidable when cutting off keyframes. veryfast keeps a
        // long clip inside the function's time budget.
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        // Lets the result start playing before it has fully downloaded.
        "-movflags", "+faststart",
        output,
      ],
      { maxBuffer: 1 << 26 },
    );

    const out = await readFile(output);
    const kept = totalDuration(keep);
    return new NextResponse(new Uint8Array(out), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.[^.]+$/, "")}-edited.mp4"`,
        "X-Original-Duration": duration.toFixed(2),
        "X-Result-Duration": kept.toFixed(2),
        "X-Segments-Kept": String(keep.length),
      },
    });
  } catch (e: any) {
    const msg = String(e?.stderr || e?.message || e).slice(0, 400);
    console.error("[video-editor] failed", msg);
    return NextResponse.json({ ok: false, error: `ffmpeg failed: ${msg}` }, { status: 500 });
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
