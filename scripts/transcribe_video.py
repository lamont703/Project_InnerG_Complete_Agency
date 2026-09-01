#!/usr/bin/env python3
"""
Word-level timestamps for a video, so an edit can be aimed at what is SAID.

    ~/.venvs/shearquery-whisper/bin/python scripts/transcribe_video.py in.mp4

WHY THIS EXISTS SEPARATELY FROM transcribe_episode.py. That one produces segment
timestamps for podcast chapters, where a few seconds either way is fine. This
produces WORD timestamps, because a b-roll cutaway placed a second off the word
it illustrates reads as random — which is exactly what happened on the first
booth-rent edit, where the timings were estimated from the script rather than
measured from the audio.

WHY faster-whisper AND NOT openai-whisper. This machine is Intel macOS 12.
openai-whisper needs PyTorch, which no longer ships x86 macOS wheels, so the
obvious install is the one that fails. faster-whisper runs on CTranslate2 with
no torch at all, and its word_timestamps come from the same alignment method.

THE VENV LIVES OUTSIDE THE REPO, at ~/.venvs/shearquery-whisper. A virtualenv
inside the project broke a Turbopack build once already: it walked venv/bin/
python — a symlink pointing out of the filesystem root — while resolving
ffmpeg's computed require, and blamed a route that had nothing to do with it.
"""
import json
import os
import subprocess
import sys
import tempfile

MODEL = "small.en"


def ffmpeg() -> str:
    """The modern binary if it is installed; the 2018 one otherwise."""
    here = os.path.dirname(os.path.abspath(__file__))
    for rel in ("../node_modules/ffmpeg-static/ffmpeg",
                "../node_modules/@ffmpeg-installer/darwin-x64/ffmpeg"):
        p = os.path.normpath(os.path.join(here, rel))
        if os.path.exists(p):
            return p
    return "ffmpeg"


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print("Usage: python scripts/transcribe_video.py <video> [--model small.en]")
        return 1
    src = args[0]
    if not os.path.exists(src):
        print(f"No such file: {src}")
        return 1
    model_name = MODEL
    for a in sys.argv[1:]:
        if a.startswith("--model="):
            model_name = a.split("=", 1)[1]

    # 16kHz mono is what the model wants; handing it anything else just makes
    # the library resample it again.
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "a.wav")
        subprocess.run([ffmpeg(), "-y", "-hide_banner", "-loglevel", "error",
                        "-i", src, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)

        from faster_whisper import WhisperModel
        print(f"model   {model_name} (first run downloads it)")
        model = WhisperModel(model_name, device="cpu", compute_type="int8")

        segments, info = model.transcribe(wav, word_timestamps=True, vad_filter=False)

        out_segments = []
        words = []
        for s in segments:
            out_segments.append({"start": round(s.start, 3), "end": round(s.end, 3),
                                 "text": s.text.strip()})
            for w in (s.words or []):
                words.append({"word": w.word.strip(), "start": round(w.start, 3),
                              "end": round(w.end, 3)})
            print(f"  [{s.start:6.2f}] {s.text.strip()}")

    out = os.path.splitext(src)[0] + ".words.json"
    with open(out, "w") as f:
        json.dump({"source": os.path.basename(src), "model": model_name,
                   "duration": round(info.duration, 3),
                   "segments": out_segments, "words": words}, f, indent=2)
    print(f"\n{len(words)} words, {len(out_segments)} segments -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
