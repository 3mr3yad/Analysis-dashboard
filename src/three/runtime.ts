import * as THREE from "three";

let webglSupport: boolean | null = null;

export function supportsWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement("canvas");
    webglSupport = !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export const reducedMotionQuery = () => window.matchMedia("(prefers-reduced-motion: reduce)");

export interface SceneRuntime {
  renderer: THREE.WebGLRenderer;
  /** Request a single frame (used when animation is paused or motion is reduced). */
  invalidate(): void;
  dispose(): void;
}

interface Options {
  host: HTMLElement;
  /** Called on size change with CSS pixel size. */
  resize(width: number, height: number): void;
  /** Advance and draw. Return true to keep animating, false when settled. */
  frame(dt: number, elapsed: number, reducedMotion: boolean): boolean;
  maxPixelRatio?: number;
}

/**
 * Owns a renderer + rAF loop that only runs while the host is on screen, the tab is
 * visible and there is something to animate. Cleans up GPU resources on dispose.
 */
export function createRuntime({ host, resize, frame, maxPixelRatio = 1.5 }: Options): SceneRuntime {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  host.appendChild(renderer.domElement);

  const motion = reducedMotionQuery();
  let reduced = motion.matches;
  let onScreen = true;
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;

  const running = () => onScreen && document.visibilityState === "visible";

  const loop = (t: number) => {
    raf = 0;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    elapsed += dt;
    const more = frame(dt, elapsed, reduced);
    if (more && !reduced && running()) raf = requestAnimationFrame(loop);
  };

  const invalidate = () => {
    if (raf || !running()) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    resize(w, h);
    invalidate();
  });
  ro.observe(host);

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) invalidate();
  });
  io.observe(host);

  const onVisibility = () => document.visibilityState === "visible" && invalidate();
  document.addEventListener("visibilitychange", onVisibility);
  const onMotion = () => {
    reduced = motion.matches;
    invalidate();
  };
  motion.addEventListener("change", onMotion);

  invalidate();

  return {
    renderer,
    invalidate,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

/** Dispose every geometry/material/texture under an object. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
}

/** Soft round sprite for points, generated once (no external textures). */
export function makeDotTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
