#!/usr/bin/env node
/**
 * HYPERFRAMES — HTML in, deterministic MP4 out. Run it through this wrapper.
 *
 *   node scripts/hyperframes.js doctor
 *   node scripts/hyperframes.js init reference/hyperframes/my-video --example=blank --resolution=portrait --non-interactive
 *   node scripts/hyperframes.js render        # from inside a project dir
 *
 * WHAT IT IS, AND WHAT IT IS NOT. HyperFrames (Apache 2.0, by HeyGen — the same
 * vendor as our avatars) renders a web page to video with Puppeteer + FFmpeg.
 * It is NOT a generative video model: it will not invent footage the way Kling
 * or Seedance do. It animates markup we wrote. That makes it the right tool for
 * a Data Reel — one number from our own data, animated — and the wrong tool for
 * b-roll, which stays with Higgsfield. See lib/video-type.js for the formats.
 *
 * WHY A WRAPPER RATHER THAN `npx hyperframes`. Three environment variables have
 * to be right or the CLI fails, and two of them fail in ways that look like
 * something else. Setting them here means nobody has to remember them, and the
 * reasons stay next to the values.
 *
 *   1. HYPERFRAMES_FFMPEG_PATH / HYPERFRAMES_FFPROBE_PATH
 *      There is no ffmpeg on this machine's PATH — every render script in this
 *      repo already reaches into node_modules/ffmpeg-static for that reason.
 *      HyperFrames needs ffPROBE too, which ffmpeg-static does not ship, hence
 *      the separate ffprobe-static dependency.
 *
 *      NOTE THE PREFIX. The variables are HYPERFRAMES_FFMPEG_PATH, not
 *      FFMPEG_PATH. The unprefixed names are ignored silently: `doctor` keeps
 *      reporting "FFmpeg is required" and tells you to `brew install ffmpeg`,
 *      which is a fix for a problem you do not have.
 *
 *   2. HYPERFRAMES_BROWSER_PATH — THIS IS THE macOS 12 ONE.
 *      HyperFrames downloads its own chrome-headless-shell (152 at time of
 *      writing) which requires macOS 13+. On this machine (Darwin 21.6.0 =
 *      macOS 12) it dies at launch with:
 *
 *        dyld: Symbol not found: _kVTCompressionPropertyKey_ReferenceBufferCount
 *        Expected in: .../VideoToolbox.framework
 *
 *      That reads like a broken install; it is a hard OS floor. The fix is to
 *      point it at an OLDER shell, and one is already on disk — Puppeteer's
 *      cached v149 — so nothing needs downloading. Same family of problem as
 *      the Blender numpy break noted in the Blender pipeline: a modern binary
 *      that assumes a newer macOS than this machine runs.
 *
 *      If that cache is ever cleared, re-create it with:
 *        npx @puppeteer/browsers install chrome-headless-shell@149
 *
 * A CONSEQUENCE OF THE OLD SHELL, so it is not mistaken for a bug: renders take
 * the `screenshot` capture path rather than the faster BeginFrame path, because
 * ffmpeg-static is built without libpostproc and the shell is old. A 10-second
 * 1080x1920 composition still rendered in 17.7s, which is fine for our lengths.
 */

const { spawnSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

function resolveBinary(mod, pick) {
  try {
    const found = pick(require(mod));
    return found && existsSync(found) ? found : undefined;
  } catch {
    return undefined;
  }
}

const ffmpeg = resolveBinary("ffmpeg-static", (m) => m);
const ffprobe = resolveBinary("ffprobe-static", (m) => m.path);

/**
 * Older chrome-headless-shell builds, newest first. The first one that exists
 * wins. Listed rather than hardcoded so a future Puppeteer bump does not
 * silently break this — but note the ceiling: anything past 151 will not launch
 * on macOS 12 no matter how new it is.
 */
const BROWSER_CANDIDATES = [
  "chrome-headless-shell/mac-149.0.7827.22/chrome-headless-shell-mac-x64/chrome-headless-shell",
  "chrome-headless-shell/mac-150.0.7422.0/chrome-headless-shell-mac-x64/chrome-headless-shell",
];

function findBrowser() {
  if (process.env.HYPERFRAMES_BROWSER_PATH) return process.env.HYPERFRAMES_BROWSER_PATH;
  const cache = path.join(process.env.HOME || "", ".cache", "puppeteer");
  for (const rel of BROWSER_CANDIDATES) {
    const full = path.join(cache, rel);
    if (existsSync(full)) return full;
  }
  return undefined;
}

const browser = findBrowser();

const missing = [];
if (!ffmpeg) missing.push("ffmpeg-static (npm i -D ffmpeg-static)");
if (!ffprobe) missing.push("ffprobe-static (npm i -D ffprobe-static)");
if (missing.length) {
  console.error(`hyperframes: missing ${missing.join(", ")}`);
  process.exit(1);
}
if (!browser) {
  console.error(
    "hyperframes: no compatible chrome-headless-shell found.\n" +
      "  This machine is macOS 12, so the bundled shell (152+) cannot launch.\n" +
      "  Install an older one:  npx @puppeteer/browsers install chrome-headless-shell@149"
  );
  process.exit(1);
}

const env = {
  ...process.env,
  HYPERFRAMES_FFMPEG_PATH: ffmpeg,
  HYPERFRAMES_FFPROBE_PATH: ffprobe,
  HYPERFRAMES_BROWSER_PATH: browser,
  // Alias the CLI also honours; set both so a version bump that drops one
  // does not turn into another dyld crash hunt.
  PRODUCER_HEADLESS_SHELL_PATH: browser,
};

const result = spawnSync("npx", ["hyperframes", ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
