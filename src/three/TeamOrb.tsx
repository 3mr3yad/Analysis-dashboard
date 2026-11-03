import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ID, PresenceStatus } from "../domain/types";
import { createRuntime, damp, disposeTree, makeDotTexture, supportsWebGL } from "./runtime";

export interface OrbNode {
  id: ID;
  status: PresenceStatus;
}

interface Props {
  nodes: OrbNode[];
  onSelect(id: ID): void;
  onHover(id: ID | null, x: number, y: number): void;
  className?: string;
}

const STATUS_COLOR: Record<PresenceStatus, string> = {
  available: "#3ccf6e",
  busy: "#8fb3ff",
  away: "#fab219",
  offline: "#3b4252",
};

/**
 * "Team constellation": every employee is a node on a slowly turning sphere
 * (one InstancedMesh draw call), busy employees are tethered to the core
 * (one LineSegments draw call). Nodes are clickable and colours ease on change.
 */
export default function TeamOrb({ nodes, onSelect, onHover, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update(nodes: OrbNode[]): void } | null>(null);
  const handlers = useRef({ onSelect, onHover });

  useEffect(() => {
    handlers.current = { onSelect, onHover };
  });

  useEffect(() => {
    const el = host.current;
    if (!el || !supportsWebGL()) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 0, 7.2);
    const group = new THREE.Group();
    group.rotation.x = 0.35;
    scene.add(group);

    const RADIUS = 2.1;
    const MAX = 64;

    // Faint shell
    const SHELL = 420;
    const shellPos = new Float32Array(SHELL * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < SHELL; i++) {
      const y = 1 - (i / (SHELL - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      shellPos.set([Math.cos(golden * i) * rr * RADIUS, y * RADIUS, Math.sin(golden * i) * rr * RADIUS], i * 3);
    }
    const shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute("position", new THREE.BufferAttribute(shellPos, 3));
    const shellMat = new THREE.PointsMaterial({ size: 0.05, color: "#5a6c96", map: makeDotTexture(), transparent: true, opacity: 0.55, depthWrite: false });
    group.add(new THREE.Points(shellGeo, shellMat));

    // Core
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: "#9db8ff", wireframe: true, transparent: true, opacity: 0.6 }));
    group.add(core);

    // Employee nodes
    const nodeGeo = new THREE.IcosahedronGeometry(0.11, 1);
    const nodeMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const mesh = new THREE.InstancedMesh(nodeGeo, nodeMat, MAX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    group.add(mesh);

    // Halo sprites around nodes
    const haloGeo = new THREE.BufferGeometry();
    const haloPos = new Float32Array(MAX * 3);
    const haloCol = new Float32Array(MAX * 3);
    haloGeo.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
    haloGeo.setAttribute("color", new THREE.BufferAttribute(haloCol, 3));
    const haloMat = new THREE.PointsMaterial({ size: 0.75, map: makeDotTexture(), vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    const halos = new THREE.Points(haloGeo, haloMat);
    group.add(halos);

    // Tethers core → busy nodes
    const tetherGeo = new THREE.BufferGeometry();
    tetherGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX * 6), 3));
    const tetherMat = new THREE.LineBasicMaterial({ color: "#8fb3ff", transparent: true, opacity: 0.28 });
    const tethers = new THREE.LineSegments(tetherGeo, tetherMat);
    group.add(tethers);

    let current: OrbNode[] = [];
    const positions: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
    const targets: THREE.Color[] = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    let hovered = -1;

    function layout(n: number) {
      positions.length = 0;
      for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) / n) * 2;
        const rr = Math.sqrt(1 - y * y);
        const a = golden * i * 1.7;
        positions.push(new THREE.Vector3(Math.cos(a) * rr * RADIUS, y * RADIUS * 0.85, Math.sin(a) * rr * RADIUS));
      }
    }

    function update(next: OrbNode[]) {
      const resized = next.length !== current.length;
      current = next.slice(0, MAX);
      if (resized) layout(current.length);
      current.forEach((nd, i) => {
        const c = new THREE.Color(STATUS_COLOR[nd.status]);
        targets[i] = c;
        if (!colors[i] || resized) colors[i] = c.clone();
      });
      mesh.count = current.length;
      halos.geometry.setDrawRange(0, current.length);
      runtime.invalidate();
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(9, 9);
    let pointerIn = false;
    let drag: { x: number; rot: number } | null = null;
    let spin = 0;
    let manual = 0;

    const runtime = createRuntime({
      host: el,
      maxPixelRatio: 1.75,
      resize(w, h) {
        camera.aspect = w / h;
        camera.position.z = w / h < 1 ? 9 : 7.2;
        camera.updateProjectionMatrix();
      },
      frame(dt, t, reduced) {
        if (!reduced && !drag) spin += dt * 0.12;
        group.rotation.y = spin + manual;
        core.rotation.y = -t * 0.3;

        const tether = tetherGeo.attributes.position as THREE.BufferAttribute;
        let seg = 0;
        let settling = false;
        current.forEach((nd, i) => {
          const c = colors[i];
          const tg = targets[i];
          if (reduced) c.copy(tg);
          else {
            c.r = damp(c.r, tg.r, 4, dt);
            c.g = damp(c.g, tg.g, 4, dt);
            c.b = damp(c.b, tg.b, 4, dt);
            if (Math.abs(c.r - tg.r) + Math.abs(c.g - tg.g) + Math.abs(c.b - tg.b) > 0.01) settling = true;
          }
          const busyPulse = nd.status === "busy" && !reduced ? 1 + Math.sin(t * 2.4 + i) * 0.12 : 1;
          const s = (i === hovered ? 1.6 : 1) * busyPulse * (nd.status === "offline" ? 0.75 : 1);
          scl.setScalar(s);
          m4.compose(positions[i], q, scl);
          mesh.setMatrixAt(i, m4);
          mesh.setColorAt(i, c);
          haloPos.set([positions[i].x, positions[i].y, positions[i].z], i * 3);
          const glow = nd.status === "offline" ? 0 : i === hovered ? 1 : 0.55;
          haloCol.set([c.r * glow, c.g * glow, c.b * glow], i * 3);
          if (nd.status === "busy") {
            tether.setXYZ(seg++, 0, 0, 0);
            tether.setXYZ(seg++, positions[i].x, positions[i].y, positions[i].z);
          }
        });
        tetherGeo.setDrawRange(0, seg);
        tether.needsUpdate = true;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        halos.geometry.attributes.position.needsUpdate = true;
        halos.geometry.attributes.color.needsUpdate = true;

        if (pointerIn) {
          group.updateMatrixWorld();
          raycaster.setFromCamera(ndc, camera);
          const hit = raycaster.intersectObject(mesh)[0];
          const idx = hit?.instanceId ?? -1;
          if (idx !== hovered) {
            hovered = idx;
            el!.style.cursor = idx >= 0 ? "pointer" : drag ? "grabbing" : "grab";
            const rect = el!.getBoundingClientRect();
            handlers.current.onHover(idx >= 0 ? current[idx].id : null, ((ndc.x + 1) / 2) * rect.width, ((1 - ndc.y) / 2) * rect.height);
          }
        }

        runtime.renderer.render(scene, camera);
        return !reduced || settling || pointerIn;
      },
    });

    const toNdc = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    };
    const onMove = (e: PointerEvent) => {
      pointerIn = true;
      toNdc(e);
      if (drag) manual = drag.rot + ((e.clientX - drag.x) / el.clientWidth) * Math.PI;
      runtime.invalidate();
    };
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, rot: manual };
      el.setPointerCapture(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      const moved = drag && Math.abs(e.clientX - drag.x) > 4;
      drag = null;
      if (!moved && hovered >= 0) handlers.current.onSelect(current[hovered].id);
    };
    const onLeave = () => {
      pointerIn = false;
      hovered = -1;
      ndc.set(9, 9);
      handlers.current.onHover(null, 0, 0);
      runtime.invalidate();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.style.cursor = "grab";
    el.style.touchAction = "pan-y";

    api.current = { update };

    return () => {
      api.current = null;
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      disposeTree(scene);
      runtime.dispose();
    };
  }, []);

  useEffect(() => {
    api.current?.update(nodes);
  }, [nodes]);

  return <div ref={host} className={className} />;
}
