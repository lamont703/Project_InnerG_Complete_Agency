"""Finish an on-deck short: overlay cards + their sounds, captions, corner wordmark,
then the show intro and ending — the "complete vertical cut" of the channel README.

    python3 scripts/finish_short.py experiments/content-parts/finish/<slug>/finish.spec.json

THE SAME CHAIN AS THE REFERENCE SHORT, IN THE SAME ORDER, using the tools that built it:
  0. camera            scripts/camera_moves.py — the 3s push-in motion hook and the punch
                       in/out shots, applied to the picture before anything sits on top of it
  1. cards + sfx       here — each card's transparent .mov laid over at its `at`, and each
                       cue mixed in at at + t. Cards follow OVERLAYS.md; this only places them.
  2. captions          scripts/add_captions.js, at the reference short's settings
                       (64px, outline 5, marginV 335 — the band between the card and YouTube's title)
  3. corner wordmark   scripts/instagram/brand_video.js --corner=at --y=150
  4. intro + ending    scripts/insert_intro.js — after branding, so neither carries a caption
                       or a corner mark of its own (they already are the wordmark)

Every step runs on the cut's own clock, so the words file and every card `at` must come from
THIS cut. The intro goes in last precisely because it moves everything after it.

The input is never modified. Intermediates go to the spec's folder; the result to spec.out.
"""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = f"{ROOT}/node_modules/ffmpeg-static/ffmpeg"
FP = f"{ROOT}/node_modules/ffprobe-static/bin/darwin/x64/ffprobe"
SFX = f"{ROOT}/experiments/sfx"
os.chdir(ROOT)

spec_path = sys.argv[1]
S = json.load(open(spec_path))
D = os.path.dirname(spec_path)
def run(cmd): print("  $", " ".join(c if " " not in c else repr(c) for c in cmd[:3]), "..."); subprocess.run(cmd, check=True)
def dur(f): return float(subprocess.run([FP, "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f], capture_output=True, text=True).stdout)
def fps(f):
    r = subprocess.run([FP, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "default=nw=1:nk=1", f], capture_output=True, text=True).stdout.strip()
    a, b = r.split("/"); return round(int(a) / int(b))

base = S["base"]; F = fps(base); T = dur(base)
print(f"\n  {S['slug']}  {T:.2f}s @ {F}fps")

# ── 0. camera: the opening push-in and the punches (scripts/camera_moves.py) ──
# FIRST, so the cards, captions and wordmark sit still on top of the moving picture.
if S.get("camera"):
    step0 = f"{D}/0-camera.mp4"
    run(["python3", "scripts/camera_moves.py", f"--spec={spec_path}", f"--in={base}", f"--out={step0}"])
    base = step0
    print(f"  0 camera -> {step0}")

# ── 1. cards and their sounds ────────────────────────────────────────────────
OV = S.get("overlays", [])
for o in OV:
    assert o["at"] + dur(o["file"]) <= T + 0.05, f"{o['file']} runs past the end of the cut"
spans = sorted((o["at"], o["at"] + dur(o["file"])) for o in OV)
for (a0, a1), (b0, _) in zip(spans, spans[1:]):
    assert a1 <= b0, "two cards overlap — OVERLAYS.md allows one at a time"

step1 = f"{D}/1-cards.mp4"
inputs = ["-i", base]
for o in OV: inputs += ["-i", o["file"]]
cues = [(o["at"] + c["t"], c) for o in OV for c in o.get("cues", [])]
for _, c in cues: inputs += ["-i", f"{SFX}/{c['sfx']}"]
g = []; v = "[0:v]"
for i, o in enumerate(OV, start=1):
    g.append(f"[{i}:v]fps={F},setpts=PTS+{o['at']}/TB[c{i}]")
    g.append(f"{v}[c{i}]overlay=0:0:eof_action=pass:format=auto[v{i}]"); v = f"[v{i}]"
a_labels = ["[0:a]"]
for k, (t, c) in enumerate(cues):
    idx = 1 + len(OV) + k; ms = int(round(t * 1000))
    g.append(f"[{idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={c['gainDb']}dB,adelay={ms}|{ms}[s{k}]")
    a_labels.append(f"[s{k}]")
g.append(f"{''.join(a_labels)}amix=inputs={len(a_labels)}:duration=first:normalize=0[a]")
run([FF, "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(g),
     "-map", v, "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-b:a", "256k", "-t", f"{T:.3f}", step1])
print(f"  1 cards  {len(OV)} cards, {len(cues)} sound cues -> {step1}")

# ── 2. captions ──────────────────────────────────────────────────────────────
C = S["captions"]; step2 = f"{D}/2-captioned.mp4"
# REJOIN SPLIT TOKENS. Whisper returns "day" "-to" "-day" and "y" "'all"; the caption chunker
# joins tokens with a space, which burned "A DAY -TO -DAY" into ai-01. Glue any token that
# starts with "-" or an apostrophe onto the word before it.
_W = json.load(open(S["words"]))["words"]; _J = []
for w in _W:
    if _J and w["word"][:1] in ("-", "'", "’"):
        _J[-1] = {**_J[-1], "word": _J[-1]["word"] + w["word"], "end": w["end"]}
    else:
        _J.append(dict(w))
words2 = f"{D}/captions.joined.words.json"
json.dump({"words": _J}, open(words2, "w"), indent=1)
run(["node", "scripts/add_captions.js", step1, "--words", words2, "--out", step2,
     "--size", str(C["size"]), "--outline", str(C["outline"]), "--margin", str(C["marginV"]),
     "--max-words", str(C["maxWords"]), "--max-chars", str(C["maxChars"]), "--max-secs", str(C["maxSecs"]),
     *(["--sentences"] if C.get("sentences", True) else [])])
print(f"  2 captions -> {step2}")

# ── 3. corner wordmark ───────────────────────────────────────────────────────
B = S["branding"]; step3 = f"{D}/3-branded.mp4"
run(["node", "scripts/instagram/brand_video.js", f"--in={step2}", f"--out={step3}", f"--corner={B['corner']}", f"--y={B['y']}"])
print(f"  3 wordmark -> {step3}")

# ── 4. intro and ending ──────────────────────────────────────────────────────
I = S.get("intro"); O = S.get("outro")
# ROOM BEFORE THE ENDING. The ending crossfades in over the last 0.2s of the cut, and the
# drafts end almost on the final word (0.02-0.18s of room measured) — so the blend faded the
# last word out on the bench Shorts (2026-10-02). Hold the last frame and add quiet so the
# blend lands after he has finished speaking.
PAD = S.get("tailPad", 0.6)
if O and PAD > 0:
    step3p = f"{D}/3-branded-padded.mp4"
    run([FF, "-nostdin", "-v", "error", "-y", "-i", step3, "-vf", f"tpad=stop_mode=clone:stop_duration={PAD}",
         "-af", f"apad=pad_dur={PAD}", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "256k", step3p])
    step3 = step3p
    print(f"  3b tail pad +{PAD}s before the ending -> {step3}")
H = S.get("hookText")
step4 = f"{D}/4-intro.mp4" if H else S["out"]
if I:
    cmd = ["node", "scripts/insert_intro.js", f"--cut={step3}", f"--intro={I['file']}", f"--at={I['at']}",
           f"--fps={F}", f"--out={step4}"]
    if "tin" in I: cmd.append(f"--tin={I['tin']}")
    if O: cmd.append(f"--outro={O['file']}")
    run(cmd)
else:
    run([FF, "-nostdin", "-v", "error", "-y", "-i", step3, "-c", "copy", step4])
print(f"  4 intro/ending -> {step4}  ({dur(step4):.2f}s)")

# ── 5. hook text: the promise, over the opening AND the intro ────────────────
# LAST, on the finished timeline, because it has to stay up across the intro — which only
# exists after step 4. Its .mov is rendered to end exactly where the intro hands back.
if H:
    run([FF, "-nostdin", "-v", "error", "-y", "-i", step4, "-i", H["file"], "-filter_complex",
         f"[1:v]setpts=PTS+{H['at']}/TB[h];[0:v][h]overlay=0:0:eof_action=pass:format=auto[v]",
         "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-pix_fmt", "yuv420p", "-c:a", "copy", S["out"]])
    print(f"  5 hook text -> {S['out']}  ({dur(S['out']):.2f}s)")
print()
