"""
Bake the FLAME 2023 mean head into buffers the browser can load.

    ~/.cache/shearquery-flame/bin/python scripts/flame/bake_head.py \
        --out public/flame

Writes `flame-head.bin` and `flame-head.json`. Reads:

    reference/FLAME2023Open/flame2023_Open.pkl
    reference/mediapipe_landmark_embedding/mediapipe_landmark_embedding.npz

Neither is in git — `reference/` is gitignored, and it should stay that way.

WHY THIS IS OFFLINE. The model is a 53 MB pickle that needs numpy AND scipy
(it holds scipy sparse matrices), and computing `u` needs the chin, the forehead
and the head axis. None of that belongs behind a web request. It runs once and
what ships is four flat arrays.

USE THE DEDICATED VENV, NOT THE REPO'S. `~/.cache/shearquery-flame` has numpy and
scipy. The repo's own `venv/` is TRACKED IN GIT, so installing into it drops
hundreds of files into `git status`.

LICENCE. FLAME 2023 Open is CC-BY-4.0 — adaptation and commercial use are fine
WITH ATTRIBUTION to Max-Planck-Gesellschaft, and the manifest carries that string
so it travels with the asset. The earlier FLAME releases and their Blender
add-on are academic-only and must not be used here.
"""

import argparse
import json
import os
import pickle
import sys

import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL = os.path.join(REPO, "reference/FLAME2023Open/flame2023_Open.pkl")
EMBED = os.path.join(
    REPO, "reference/mediapipe_landmark_embedding/mediapipe_landmark_embedding.npz"
)

# Matches our own export: the head comes out about 15.7 units tall, which is
# what the viewer's camera framing already expects.
SCALE = 49.2

ATTRIBUTION = "Head geometry derived from FLAME 2023 Open, (c) Max-Planck-Gesellschaft, CC-BY-4.0"


def load_model():
    with open(MODEL, "rb") as fh:
        return pickle.load(fh, encoding="latin1")


def register(v):
    """
    Put the mesh in fade-geometry's u-space: chin 0, forehead 1.

    The MediaPipe embedding cannot supply these. It maps 105 landmarks and they
    are all INNER face — 10 (forehead), 152 (menton), 234/454 (face-oval sides)
    and 127/356 (temples) are all absent, which is every landmark fade-geometry
    keys off. So chin and forehead are found geometrically and then CHECKED
    against the landmarks the embedding does carry. See validate().
    """
    mid = v[np.abs(v[:, 0]) < 0.004]
    # Below the chin the midline falls back into the throat; the z cut separates
    # the jaw from the neck, which is what the profile actually does.
    chin_y = mid[mid[:, 2] > 0.02][:, 1].min()
    fore_y = mid[mid[:, 2] > 0.0][:, 1].max()
    face_h = fore_y - chin_y

    u = (v[:, 1] - chin_y) / face_h

    """
    The head axis is the MIDPOINT of the slice, not its mean.

    Taking the mean puts the axis at +0.019 — well forward of the head's centre —
    because FLAME's vertices are heavily concentrated on the face. The mean of a
    slice measures where the DETAIL is, not where the geometry is, and a mesh
    built for facial expression has most of its vertices around the eyes and
    mouth. The midpoint of the range does not care how the points are spread.

    It matters because theta is measured about this axis. Pushed forward, the
    face subtends a wider angle than it should and the hairline lands too far
    round the head.
    """
    band = v[np.abs(u - 0.6) < 0.06]
    axis_z = float((band[:, 2].min() + band[:, 2].max()) / 2)
    return u, axis_z, float(chin_y), float(face_h)


def validate(v, u):
    """
    Fail loudly if the registration has drifted.

    Geometric landmark-finding is exactly the kind of thing that keeps working
    until the day it quietly does not, and a wrong u-space does not crash — it
    paints the fade in the wrong place and looks like a styling decision.
    """
    z = np.load(EMBED, allow_pickle=True)
    fi, bc, li = z["lmk_face_idx"], z["lmk_b_coords"], z["landmark_indices"]
    faces = np.asarray(load_model()["f"], np.int64)
    pts = (v[faces[fi]] * bc[:, :, None]).sum(1)
    L = {int(k): p for k, p in zip(li, pts)}

    # u is linear in y, so a two-point interpolation recovers it exactly.
    def uof(y):
        return float(np.interp(y, [v[:, 1].min(), v[:, 1].max()], [u.min(), u.max()]))

    checks = [
        ("nose base", uof(L[2][1]), 0.33, 0.06),
        ("eye corners", uof((L[33][1] + L[263][1]) / 2), 0.575, 0.07),
        ("lower lip", uof(L[17][1]), 0.22, 0.06),
    ]
    bad = []
    for name, got, expect, tol in checks:
        ok = abs(got - expect) <= tol
        print(f"  {name:12s} u={got:.3f}  expected ~{expect:.2f}  {'ok' if ok else 'OUT OF RANGE'}")
        if not ok:
            bad.append(name)
    return bad


def vertex_normals(v, f):
    n = np.zeros_like(v)
    tri = v[f]
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for k in range(3):
        np.add.at(n, f[:, k], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln == 0] = 1.0
    return n / ln


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="directory to write into")
    args = ap.parse_args()

    m = load_model()
    v = np.asarray(m["v_template"], np.float64)
    f = np.asarray(m["f"], np.int64)

    u, axis_z, chin_y, face_h = register(v)
    print(f"registered: chin y={chin_y:+.4f} faceHeight={face_h:.4f} axis z={axis_z:+.4f}")
    print(f"u spans {u.min():.3f}..{u.max():.3f}")

    print("validating against the MediaPipe landmarks the embedding does carry:")
    bad = validate(v, u)
    if bad:
        print(f"FAIL registration drifted on: {', '.join(bad)}", file=sys.stderr)
        return 1

    # theta: 0 straight ahead (+Z), measured about the head axis. FLAME's axes
    # already match ours — Y up, +Z forward — so no remap is needed.
    theta = np.arctan2(v[:, 0], v[:, 2] - axis_z)
    n = vertex_normals(v, f)
    pos = v * SCALE

    os.makedirs(args.out, exist_ok=True)
    bin_path = os.path.join(args.out, "flame-head.bin")
    with open(bin_path, "wb") as fh:
        fh.write(pos.astype("<f4").tobytes())
        fh.write(n.astype("<f4").tobytes())
        fh.write(u.astype("<f4").tobytes())
        fh.write(theta.astype("<f4").tobytes())
        fh.write(f.astype("<u4").tobytes())

    manifest = {
        "vertexCount": int(v.shape[0]),
        "triangleCount": int(f.shape[0]),
        "scale": SCALE,
        # Measured off this mesh — see lib/hairstyle/flame.ts for why they differ
        # from our own NOMINAL_LEVELS by about 0.2.
        "levels": {
            "perimeter": 0.416,
            "earCanal": 0.536,
            "earTop": 0.645,
            "temple": 0.75,
            "parietal": 0.861,
            "vertex": 1.078,
        },
        "attribution": ATTRIBUTION,
    }
    json_path = os.path.join(args.out, "flame-head.json")
    with open(json_path, "w") as fh:
        json.dump(manifest, fh, indent=1)

    print(f"wrote {bin_path} ({os.path.getsize(bin_path)} bytes)")
    print(f"wrote {json_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
