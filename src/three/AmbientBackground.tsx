import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ambient } from "./ambientBus";
import { createRuntime, damp, disposeTree, makeDotTexture, supportsWebGL } from "./runtime";

/**
 * Near-invisible depth field behind the whole app: one Points draw call (dust) and
 * one LineSegments draw call (horizon grid). Drifts with the pointer, eases to a new
 * angle on section change, and brightens briefly when live events arrive.
 */
export default function AmbientBackground() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !supportsWebGL()) return;

    const scene = new THREE.Scene();
    const BG = new THREE.Color("#07090d");
    scene.fog = new THREE.Fog(BG, 18, 70);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    camera.position.set(0, 2.2, 14);

    // Brand light as the scene background: a small 2D gradient image painted on resize only.
    // The canvas is already a full-screen GPU layer, so this light costs nothing while scrolling
    // (CSS gradient/fixed layers for the same look cost ~20fps on scroll — measured).
    const light = document.createElement("canvas");
    const lightTex = new THREE.CanvasTexture(light);
    lightTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = lightTex;
    const paintLight = (w: number, h: number) => {
      light.width = 640;
      light.height = Math.max(1, Math.round((640 * h) / w));
      const ctx = light.getContext("2d");
      if (!ctx) return;
      const W = light.width;
      const H = light.height;
      const R = Math.max(W, H);
      ctx.fillStyle = "#07090d";
      ctx.fillRect(0, 0, W, H);
      const glow = (x: number, y: number, r: number, rgb: string, a: number) => {
        const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * R);
        g.addColorStop(0, `rgba(${rgb}, ${a})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      };
      glow(0.9, -0.08, 0.62, "2, 80, 153", 0.6);
      glow(0.8, 0.08, 0.38, "1, 185, 245", 0.14);
      glow(0.04, 0.62, 0.48, "98, 76, 210", 0.24);
      glow(0.6, 1.08, 0.55, "2, 80, 153", 0.32);
      lightTex.needsUpdate = true;
    };

    const world = new THREE.Group();
    scene.add(world);

    // Dust field
    const COUNT = 1100;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const cool = new THREE.Color("#6f86b8");
    const accent = new THREE.Color("#9db8ff");
    const warm = new THREE.Color("#c8a77a");
    const tmp = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const r = 6 + Math.pow(Math.random(), 0.7) * 48;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14 * (0.3 + r / 60);
      pos[i * 3 + 2] = Math.sin(a) * r - 10;
      const roll = Math.random();
      tmp.copy(roll < 0.08 ? warm : roll < 0.35 ? accent : cool).multiplyScalar(0.55 + Math.random() * 0.45);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.16,
      map: makeDotTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    world.add(new THREE.Points(dustGeo, dustMat));

    // Horizon grid
    const gridPts: number[] = [];
    const SPAN = 60;
    const STEP = 3;
    for (let i = -SPAN; i <= SPAN; i += STEP) gridPts.push(i, 0, -SPAN, i, 0, SPAN, -SPAN, 0, i, SPAN, 0, i);
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: "#2a3550", transparent: true, opacity: 0.32, depthWrite: false });
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    grid.position.y = -5;
    world.add(grid);

    // Interaction state
    const pointer = { x: 0, y: 0 };
    const target = { rotY: 0, camY: 2.2 };
    let pulse = 0;
    let snap = false;

    const runtime = createRuntime({
      host: el,
      maxPixelRatio: 1.25,
      // A slow drifting backdrop reads the same at 30fps; halving redraws frees the GPU for the page.
      maxFps: 30,
      pauseOnScroll: true,
      resize(w, h) {
        paintLight(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      },
      frame(dt, t, reduced) {
        if (reduced || snap) {
          world.rotation.y = target.rotY;
          camera.position.y = target.camY;
          snap = false;
        } else {
          world.rotation.y = damp(world.rotation.y, target.rotY + t * 0.004, 1.6, dt);
          camera.position.x = damp(camera.position.x, pointer.x * 1.2, 2, dt);
          camera.position.y = damp(camera.position.y, target.camY + pointer.y * 0.6, 2, dt);
          grid.position.z = (t * 0.25) % STEP;
        }
        pulse = damp(pulse, 0, 2.2, dt);
        dustMat.opacity = 0.55 + pulse * 0.35;
        dustMat.size = 0.16 + pulse * 0.05;
        camera.lookAt(0, 0, -10);
        runtime.renderer.render(scene, camera);
        return true;
      },
    });

    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * -2;
      runtime.invalidate();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const off = ambient.on({
      pulse(s) {
        pulse = Math.min(1, pulse + s);
        runtime.invalidate();
      },
      section(i) {
        target.rotY = i * 0.42;
        target.camY = 2.2 + (i % 3) * 0.5;
        runtime.invalidate();
      },
    });

    return () => {
      off();
      window.removeEventListener("pointermove", onPointer);
      disposeTree(scene);
      lightTex.dispose();
      runtime.dispose();
    };
  }, []);

  return <div ref={host} aria-hidden className="ambient-canvas pointer-events-none fixed inset-0 -z-10" />;
}
