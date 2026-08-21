#!/usr/bin/env python3
"""
Depth map per image, using Depth Anything V2 (small) as ONNX.

WHY DEPTH RATHER THAN A GENERATIVE MODEL. Nothing here invents pixels. The
model estimates how far each pixel is from the camera, and the renderer then
re-projects pixels that already exist. A generative video model asked to
animate a barbershop will happily turn the shop's sign into gibberish and a
client's face into someone else's; that is unacceptable on content naming a
real business, at any price. Re-projection cannot hallucinate because it has
nothing to hallucinate with.

RUNS LOCALLY, COSTS NOTHING PER IMAGE. Small ONNX model on CPU. Inference is a
one-off per photo and the map is cached beside it, so re-rendering a clip with
a different camera move is free.

EXPERIMENT ONLY - nothing in the app imports this.
"""
import sys, os, pathlib
import numpy as np
from PIL import Image
import onnxruntime as ort
from huggingface_hub import hf_hub_download

REPO = "onnx-community/depth-anything-v2-small"
FILE = "onnx/model.onnx"
HERE = pathlib.Path(__file__).parent
SIZE = 518  # the size Depth Anything V2 expects

def load_session():
    p = hf_hub_download(repo_id=REPO, filename=FILE)
    print(f"  model: {os.path.basename(p)} ({os.path.getsize(p)//(1024*1024)}MB)")
    return ort.InferenceSession(p, providers=["CPUExecutionProvider"])

def depth_for(sess, img_path, out_path):
    im = Image.open(img_path).convert("RGB")
    w0, h0 = im.size
    x = np.asarray(im.resize((SIZE, SIZE), Image.BICUBIC), dtype=np.float32) / 255.0
    # ImageNet normalisation, which is what the model was trained against.
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = np.transpose(x, (2, 0, 1))[None]

    name = sess.get_inputs()[0].name
    out = sess.run(None, {name: x})[0]
    d = np.squeeze(out)

    # Normalise to 0..1. Depth Anything returns INVERSE depth: bigger = nearer.
    d = (d - d.min()) / (d.max() - d.min() + 1e-8)
    dm = Image.fromarray((d * 255).astype(np.uint8)).resize((w0, h0), Image.BICUBIC)
    dm.save(out_path)
    return w0, h0

if __name__ == "__main__":
    sess = load_session()
    img_dir = HERE / "images"
    out_dir = HERE / "depth"
    out_dir.mkdir(exist_ok=True)
    for f in sorted(img_dir.glob("*.jpg")):
        o = out_dir / (f.stem + "-depth.png")
        w, h = depth_for(sess, f, o)
        print(f"  {f.name}  {w}x{h}  -> {o.name}")
