"use client";

import React from "react";
import * as THREE from "three";
import { buildHeadMesh, referenceFrame } from "@/lib/hairstyle/head-mesh";
import { meshToObj, exportReadme } from "@/lib/hairstyle/export-obj";
import { STYLE_PRESETS } from "@/lib/hairstyle/request";
import type { FadeSpec } from "@/lib/fade-geometry";
import { RotateCcw, Loader2, Download, ChevronDown } from "lucide-react";

/**
 * The fade, in three dimensions, from any angle including the back.
 *
 * WHY THIS EXISTS WHEN THERE IS ALREADY A 2D OVERLAY. The 2D one is driven by a
 * face mesh, and lib/ar/fade-ar-view.tsx states the limit plainly: tracking
 * "survives to roughly ±70° of yaw and dies past that — there is no overlay
 * behind the head." The back of the head is where a fade lives. A mesh has no
 * such limit, because nothing is being tracked.
 *
 * VERTEX COLOURS, NOT A TEXTURE. The length field is per-vertex — it comes
 * straight out of buildHeadMesh — so there is nothing to unwrap, no UV map to
 * maintain and no texture to load. Changing the style rebuilds the colour
 * buffer and that is the entire update.
 *
 * ORBIT CONTROLS BY HAND. three's OrbitControls lives in examples/jsm, which
 * pulls a second module graph into the bundle for a spin and a zoom. Two
 * pointer handlers and a spherical camera are less code than the import.
 */

const AUTO_SPIN_RADIANS_PER_SECOND = 0.35;

export function Fade3DView({ initialSpec }: { initialSpec?: FadeSpec | null }) {
  const holder = React.useRef<HTMLDivElement | null>(null);
  const [spec, setSpec] = React.useState<FadeSpec>(
    initialSpec ?? STYLE_PRESETS.find((p) => p.id === "mid-skin")!.spec,
  );
  const [spinning, setSpinning] = React.useState(true);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{ tris: number } | null>(null);
  const [showBlender, setShowBlender] = React.useState(false);

  // Held across renders so a style change swaps geometry without tearing down
  // the WebGL context.
  const meshRef = React.useRef<THREE.Mesh | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const yaw = React.useRef(Math.PI); // start facing the BACK of the head
  const pitch = React.useRef(0.1);
  const spinRef = React.useRef(true);
  /*
   * Framing, measured from the mesh rather than tuned by hand.
   *
   * The first version hardcoded a radius of 1.9 and looked at y = 0.05, which
   * fitted the head that existed at the time. When the profile was corrected
   * the head doubled in height and moved down, and a hardcoded camera would
   * have cropped it — a rendering bug caused by a geometry fix, which is a
   * miserable thing to debug. Reading the bounds costs one pass over vertices.
   */
  const framing = React.useRef({ centerY: 0, radius: 2 });

  React.useEffect(() => {
    spinRef.current = spinning;
  }, [spinning]);

  React.useEffect(() => {
    const el = holder.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // A machine without WebGL should say so rather than show an empty box.
      setError("This browser can't render 3D — try a different one.");
      return;
    }

    const width = el.clientWidth;
    const height = Math.round(width * 0.9);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);

    // Lit from two sides. A single light leaves half the head black, which
    // hides exactly the gradient this is built to show.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(1.5, 2, 2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-2, 0.5, -1.5);
    scene.add(fill);

    let raf = 0;
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (spinRef.current) yaw.current += AUTO_SPIN_RADIANS_PER_SECOND * dt;

      const { centerY, radius } = framing.current;
      const p = Math.max(-1.2, Math.min(1.2, pitch.current));
      camera.position.set(
        radius * Math.cos(p) * Math.sin(yaw.current),
        radius * Math.sin(p) + centerY,
        radius * Math.cos(p) * Math.cos(yaw.current),
      );
      camera.lookAt(0, centerY, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    setReady(true);

    // Drag to orbit. Dragging stops the spin — someone who grabbed the head
    // wants to look at something specific.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      setSpinning(false);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      yaw.current -= (e.clientX - lastX) * 0.01;
      pitch.current += (e.clientY - lastY) * 0.01;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging = false;
    };
    const c = renderer.domElement;
    c.style.touchAction = "none";
    c.style.cursor = "grab";
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);

    const onResize = () => {
      const w = el.clientWidth;
      const h = Math.round(w * 0.9);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
      meshRef.current?.geometry.dispose();
      (meshRef.current?.material as THREE.Material | undefined)?.dispose();
      renderer.dispose();
      // The canvas has to go too, or a hot reload stacks contexts until the
      // browser starts dropping the oldest ones.
      c.remove();
    };
  }, []);

  // Geometry follows the spec. Rebuilt rather than mutated: the vertex count
  // changes with the fade line, so reusing the buffers would mean tracking
  // capacity for no gain at this size.
  React.useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const m = buildHeadMesh(referenceFrame(), spec);
    setStats({ tris: m.triangleCount });

    // Frame it. Vertical fov is 35 degrees, so the distance that fits a given
    // height is height / (2 * tan(fov/2)); the 1.25 leaves a margin so the crown
    // is not touching the top edge.
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 1; i < m.positions.length; i += 3) {
      if (m.positions[i] < minY) minY = m.positions[i];
      if (m.positions[i] > maxY) maxY = m.positions[i];
    }
    const halfFov = (35 / 2) * (Math.PI / 180);
    framing.current = {
      centerY: (minY + maxY) / 2,
      radius: ((maxY - minY) * 1.25) / (2 * Math.tan(halfFov)),
    };

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
    geom.setAttribute("normal", new THREE.BufferAttribute(m.normals, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(m.colors, 3));
    geom.setIndex(new THREE.BufferAttribute(m.indices, 1));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
      /*
       * FRONT FACES ONLY, deliberately.
       *
       * This was DoubleSide, back when the head was an open tube and you could
       * see into it from below. Now that both ends are capped there is no
       * inside to see — and double-siding was actively harmful: it hid the fact
       * that every triangle in the mesh was wound inside-out, because a
       * backwards face still lit correctly.
       *
       * Culling backfaces means a winding regression shows up immediately as
       * holes in the head instead of quietly riding along into the OBJ export.
       */
      side: THREE.FrontSide,
    });

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
    }
    const mesh = new THREE.Mesh(geom, mat);
    meshRef.current = mesh;
    scene.add(mesh);
  }, [spec]);

  /*
   * Export the block as OBJ, in the browser.
   *
   * No server round trip: the mesh is already built here, the OBJ writer is
   * pure string building, and a route would only add a place for the two copies
   * to disagree about which spec was exported.
   *
   * The filename carries the fade. A folder of head.obj files is unidentifiable
   * a week later, and this is a thing people download repeatedly while trying
   * shapes out.
   */
  const downloadObj = React.useCallback(() => {
    const mesh = buildHeadMesh(referenceFrame(), spec);
    const preset = STYLE_PRESETS.find((p) => JSON.stringify(p.spec) === JSON.stringify(spec));
    const name = preset ? `shearquery-${preset.id}` : "shearquery-head";
    const blob = new Blob([meshToObj(mesh, { name })], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.obj`;
    a.click();
    // Revoked on the next tick, not this one. Without revoking, every export
    // leaks the whole mesh until the tab is closed; revoking synchronously
    // after click() races the download and some browsers drop the file.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setShowBlender(true);
  }, [spec]);

  return (
    <div>
      <div className="relative bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
        <div ref={holder} className="w-full" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="text-[13px] text-slate-600">{error}</p>
          </div>
        )}
        {ready && !error && (
          <button
            type="button"
            onClick={() => setSpinning((s) => !s)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white/90 border border-slate-200 rounded-md px-2.5 py-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            {spinning ? "Stop" : "Spin"}
          </button>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        Drag to turn it. Starts facing the back — the angle the 2D overlay can&apos;t show.
        {stats ? ` ${stats.tris.toLocaleString("en-US")} triangles.` : ""}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {STYLE_PRESETS.map((p) => {
          const on = JSON.stringify(p.spec) === JSON.stringify(spec);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSpec(p.spec)}
              className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="block font-bold text-[13px]">{p.label}</span>
              <span className="block text-[10px] opacity-70">{p.blurb}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        A generic head, not yours — the shape comes from anthropometric proportions, and the fade
        line sits exactly where the 2D overlay puts it because it&apos;s the same geometry. Fitting
        this to your own photos is the next step.
      </p>

      <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Open this in Blender</p>
            <p className="text-[11px] text-slate-500">
              Downloads the head as an .obj so you start from this shape instead of a cube.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadObj}
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 rounded-md px-3 py-2"
          >
            <Download className="w-3.5 h-3.5" />
            .obj
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowBlender((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600"
        >
          Import notes
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showBlender ? "rotate-180" : ""}`}
          />
        </button>

        {showBlender && (
          /*
           * The notes live on the page rather than in a second downloaded file,
           * because the two things they warn about are both silent failures and
           * a README next to a .obj is the least-read file in computing.
           */
          <pre className="px-3 py-3 text-[11px] leading-relaxed text-slate-700 bg-slate-50 border-t border-slate-200 whitespace-pre-wrap font-mono">
            {exportReadme(10)}
          </pre>
        )}
      </div>
    </div>
  );
}
