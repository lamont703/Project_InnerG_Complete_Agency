#!/usr/bin/env python3
"""
Transcribes a podcast episode with timestamps, for YouTube chapters, captions
and description copy.

WHY LOCAL AND NOT AN API. This runs on the machine with no key, no quota and no
per-minute cost, which matters because a 23-minute episode is a lot of audio
tokens and the Gemini project is already the thing rationing this project's AI
spend. It is also repeatable for every future episode at zero marginal cost.

MODEL CHOICE. small.en, not large. Chapters need timestamps accurate to a few
seconds and topic boundaries a human can recognise — not a courtroom
transcript. small.en gets both on CPU in minutes; large-v3 would take far
longer for accuracy this task cannot use. Override with --model if a future
episode needs verbatim quotes.

WHAT IT WILL NOT DO IS WRITE THE CHAPTERS. It emits timestamped segments; the
titles are a judgement about what the episode is actually about, and an
automated pass produces chapter names that are technically derived from the
audio and useless to a viewer deciding whether to click. Read the transcript,
then write them.

Outputs, all beside the audio:
  .json  segments with start/end, for programmatic use
  .srt   subtitles, uploadable to YouTube directly
  .txt   plain reading copy, for writing the description from

Usage:
  venv/bin/python3 scripts/transcribe_episode.py "path/to/episode.m4a"
  venv/bin/python3 scripts/transcribe_episode.py "episode.m4a" --model medium.en
"""

import json
import os
import sys
import time

def ts(seconds, comma=False):
    """SRT wants HH:MM:SS,mmm — everything else reads better as H:MM:SS."""
    ms = int(round((seconds - int(seconds)) * 1000))
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    if comma:
        return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"
    return f"{h:d}:{m:02d}:{sec:02d}" if h else f"{m:d}:{sec:02d}"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args or not os.path.exists(args[0]):
        print('usage: venv/bin/python3 scripts/transcribe_episode.py "episode.m4a"')
        sys.exit(1)
    audio = args[0]

    model_name = "small.en"
    if "--model" in sys.argv:
        model_name = sys.argv[sys.argv.index("--model") + 1]

    from faster_whisper import WhisperModel

    print(f"loading {model_name} (first run downloads the model)…", flush=True)
    # int8 on CPU: roughly 4x faster than float32 with no accuracy cost that
    # matters at this task's tolerance.
    model = WhisperModel(model_name, device="cpu", compute_type="int8")

    print(f"transcribing {os.path.basename(audio)} …", flush=True)
    started = time.time()
    # VAD IS OFF, and it is not an oversight.
    #
    # vad_filter=True is the better default in principle — it drops long
    # silences and stops whisper hallucinating text into dead air. But it
    # downloads a separate silero VAD model from HuggingFace on first use, and
    # that download HANGS here: a run sat for 21 minutes having consumed 0.02
    # seconds of CPU. Silently. The transcription itself runs at about half
    # real time, so the stall was invisible except by checking CPU time.
    #
    # Enable it with --vad once the model is cached, and expect a first run to
    # hang if it is not. Continuous speech, which a two-host podcast mostly is,
    # gives whisper little dead air to hallucinate into anyway.
    use_vad = "--vad" in sys.argv
    segments, info = model.transcribe(
        audio,
        beam_size=5,
        vad_filter=use_vad,
        **({"vad_parameters": {"min_silence_duration_ms": 700}} if use_vad else {}),
    )

    print(f"  detected language: {info.language} (p={info.language_probability:.2f})", flush=True)
    print(f"  duration: {ts(info.duration)}\n")

    rows = []
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        rows.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": text})
        # Progress as it goes — this takes minutes and silence looks like a hang.
        if len(rows) % 25 == 0:
            pct = min(99, int(seg.end / max(info.duration, 1) * 100))
            print(f"  {pct:3d}%  {ts(seg.start)}  {text[:64]}", flush=True)

    base = os.path.splitext(audio)[0]

    with open(base + ".json", "w") as f:
        json.dump({
            "audio": os.path.basename(audio),
            "model": model_name,
            "language": info.language,
            "durationSeconds": round(info.duration, 2),
            "segments": rows,
        }, f, indent=2)
        f.write("\n")

    with open(base + ".srt", "w") as f:
        for i, r in enumerate(rows, 1):
            f.write(f"{i}\n{ts(r['start'], True)} --> {ts(r['end'], True)}\n{r['text']}\n\n")

    with open(base + ".txt", "w") as f:
        for r in rows:
            f.write(f"[{ts(r['start'])}] {r['text']}\n")

    words = sum(len(r["text"].split()) for r in rows)
    print(f"\n{len(rows)} segments, ~{words} words, {(time.time() - started) / 60:.1f} min to transcribe")
    print(f"  {base}.json\n  {base}.srt\n  {base}.txt")


if __name__ == "__main__":
    main()
