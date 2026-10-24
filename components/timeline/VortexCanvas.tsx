"use client";

import { useEffect, useRef } from "react";
import { VORTEX_CAMERA_TRAVEL, VORTEX_MAX_Z, type VortexNode } from "@/components/timeline/vortex-model";

export type VortexPoint = { x: number; y: number; visible: boolean };

type VortexCanvasProps = {
  nodes: VortexNode[];
  hoveredId: string | null;
  pinned: boolean;
  scrollProgress: number;
  onHover: (id: string | null) => void;
  onPin: (id: string | null) => void;
  onScrollDelta: (delta: number) => void;
  onHoveredPoint: (point: VortexPoint | null) => void;
};

type NodeCoord = { x: number; y: number; r: number; relZ: number; visible: boolean };

export function VortexCanvas({
  nodes,
  hoveredId,
  pinned,
  scrollProgress,
  onHover,
  onPin,
  onScrollDelta,
  onHoveredPoint,
}: VortexCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const coordsRef = useRef<Record<string, NodeCoord>>({});
  const nodesRef = useRef(nodes);
  const hoveredRef = useRef(hoveredId);
  const pinnedRef = useRef(pinned);
  const scrollRef = useRef(scrollProgress);
  const hoverCb = useRef(onHover);
  const pinCb = useRef(onPin);
  const pointCb = useRef(onHoveredPoint);
  const scrollCb = useRef(onScrollDelta);
  const lastPoint = useRef<VortexPoint | null>(null);

  nodesRef.current = nodes;
  hoveredRef.current = hoveredId;
  pinnedRef.current = pinned;
  scrollRef.current = scrollProgress;
  hoverCb.current = onHover;
  pinCb.current = onPin;
  pointCb.current = onHoveredPoint;
  scrollCb.current = onScrollDelta;

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    if (!canvas || !field) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#140F0D";
      ctx.fillRect(0, 0, width, height);

      const list = nodesRef.current;
      const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const focal = 1200;
      const cameraZ = scrollRef.current * VORTEX_CAMERA_TRAVEL;
      const totalTurns = 4.8;
      const sampleCount = 700;
      const minRadius = 26;
      const maxRadius = Math.min(width, height) * 0.46;
      const activeId = hoveredRef.current;

      let prevX: number | null = null;
      let prevY: number | null = null;
      let prevVisible = false;

      for (let i = 0; i <= sampleCount; i += 1) {
        const u = i / sampleCount;
        const placed = place(u, totalTurns, minRadius, maxRadius, centerX, centerY, focal, cameraZ);
        if (!placed) {
          prevX = null;
          prevY = null;
          prevVisible = false;
          continue;
        }

        if (placed.alpha > 0.01 && prevX !== null && prevY !== null && prevVisible) {
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(placed.x, placed.y);
          ctx.strokeStyle = `rgba(197, 160, 89, ${placed.alpha})`;
          ctx.lineWidth = 1.5 * Math.min(2, Math.max(0.6, placed.scale));
          ctx.lineCap = "round";
          ctx.stroke();
        }

        prevX = placed.x;
        prevY = placed.y;
        prevVisible = placed.alpha > 0.01;
      }

      const coords: Record<string, NodeCoord> = {};
      const labelSlots: { x: number; y: number }[] = [];

      for (const node of list) {
        const placed = place(node.spiralParam, totalTurns, minRadius, maxRadius, centerX, centerY, focal, cameraZ);
        if (!placed) {
          coords[node.id] = { x: 0, y: 0, r: 0, relZ: 9999, visible: false };
          continue;
        }

        let visible = placed.alpha > 0.05;
        if (placed.x < -50 || placed.x > width + 50 || placed.y < -50 || placed.y > height + 50) visible = false;

        const hovered = activeId === node.id && visible;
        const hitRadius = node.isCore || node.isTerminal ? 24 : hovered ? 20 : 14;
        coords[node.id] = { x: placed.x, y: placed.y, r: hitRadius, relZ: placed.relZ, visible };
        if (!visible) continue;

        ctx.save();
        ctx.globalAlpha = placed.alpha;
        const emphasized = hovered || node.isTerminal || node.isOngoing;
        const dotBase = node.isTerminal ? 4 : 3.2;
        const radius = (hovered ? (node.isTerminal ? 6 : 5.5) : dotBase) * Math.min(2, Math.max(0.7, placed.scale));

        if (emphasized) {
          const glow = hovered ? 20 : 12;
          const halo = ctx.createRadialGradient(placed.x, placed.y, 2, placed.x, placed.y, glow);
          halo.addColorStop(0, "rgba(222, 179, 83, 0.45)");
          halo.addColorStop(0.5, "rgba(197, 160, 89, 0.18)");
          halo.addColorStop(1, "rgba(197, 160, 89, 0)");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(placed.x, placed.y, glow, 0, Math.PI * 2);
          ctx.fill();
          if (hovered) {
            ctx.beginPath();
            ctx.arc(placed.x, placed.y, 11, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(222, 179, 83, 0.85)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(placed.x, placed.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = emphasized ? "#DEB353" : "#C5A059";
        ctx.fill();
        if (node.isTerminal) {
          ctx.beginPath();
          ctx.arc(placed.x, placed.y, radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = "#FFF8E7";
          ctx.fill();
        }

        const showLabel = hovered || node.isCore || node.isTerminal || placed.scale > 0.72;
        if (showLabel) {
          const angle = Math.atan2(placed.y - centerY, placed.x - centerX);
          const dist = (hovered ? 16 : 12) * Math.min(1.8, Math.max(0.8, placed.scale));
          const lx = placed.x + Math.cos(angle) * dist;
          const ly = placed.y + Math.sin(angle) * dist;
          const crowded = !hovered && labelSlots.some((slot) => Math.hypot(slot.x - lx, slot.y - ly) < 28);
          if (!crowded) {
            labelSlots.push({ x: lx, y: ly });
            ctx.font = `${hovered || node.isTerminal ? 600 : 400} ${hovered || node.isTerminal ? 12 : 11}px ${fontFamily}`;
            ctx.fillStyle = hovered ? "#FFFFFF" : node.isTerminal || node.isOngoing ? "#DEB353" : "rgba(197, 160, 89, 0.9)";
            ctx.textBaseline = "middle";
            ctx.textAlign = Math.cos(angle) < -0.2 ? "right" : "left";
            ctx.fillText(node.label, lx, ly);
          }
        }
        ctx.restore();
      }

      coordsRef.current = coords;
      const active = activeId ? coords[activeId] : undefined;
      const rect = canvas.getBoundingClientRect();
      const next = active && active.visible ? { x: active.x + rect.left, y: active.y + rect.top, visible: true } : null;
      const prev = lastPoint.current;
      const moved = !prev || !next
        ? Boolean(prev) !== Boolean(next)
        : Math.hypot(prev.x - next.x, prev.y - next.y) > 0.75 || prev.visible !== next.visible;
      if (moved) {
        lastPoint.current = next;
        pointCb.current(next);
      }

      frame = requestAnimationFrame(render);
    };

    const hitTest = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      let matched: VortexNode | null = null;
      let nearest = Infinity;
      for (const node of nodesRef.current) {
        const coord = coordsRef.current[node.id];
        if (!coord?.visible) continue;
        const dist = Math.hypot(mx - coord.x, my - coord.y);
        if (dist < coord.r + 8 && coord.relZ < nearest) {
          matched = node;
          nearest = coord.relZ;
        }
      }
      return matched;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      scrollCb.current(event.deltaY * 0.00085);
    };

    const onPointerMove = (event: PointerEvent) => {
      const matched = hitTest(event.clientX, event.clientY);
      canvas.style.cursor = matched ? "pointer" : "default";
      if (matched) {
        if (matched.id !== hoveredRef.current) hoverCb.current(matched.id);
        return;
      }
      if (!pinnedRef.current && hoveredRef.current) hoverCb.current(null);
    };

    const onPointerUp = (event: PointerEvent) => {
      const matched = hitTest(event.clientX, event.clientY);
      if (matched) {
        pinCb.current(matched.id);
        hoverCb.current(matched.id);
        return;
      }
      if (!pinnedRef.current) return;
      pinCb.current(null);
      hoverCb.current(null);
    };

    const onPointerLeave = () => {
      canvas.style.cursor = "default";
      if (!pinnedRef.current) hoverCb.current(null);
    };

    let touchY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchY === null) return;
      const y = event.touches[0]?.clientY;
      if (y === undefined) return;
      event.preventDefault();
      scrollCb.current(-(y - touchY) * 0.0012);
      touchY = y;
    };
    const onTouchEnd = () => {
      touchY = null;
    };

    field.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    field.addEventListener("touchstart", onTouchStart, { passive: true });
    field.addEventListener("touchmove", onTouchMove, { passive: false });
    field.addEventListener("touchend", onTouchEnd);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      field.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      field.removeEventListener("touchstart", onTouchStart);
      field.removeEventListener("touchmove", onTouchMove);
      field.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div ref={fieldRef} className="vortexField">
      <canvas ref={canvasRef} className="vortexCanvas" aria-hidden="true" />
    </div>
  );
}

function place(
  u: number,
  totalTurns: number,
  minRadius: number,
  maxRadius: number,
  centerX: number,
  centerY: number,
  focal: number,
  cameraZ: number,
) {
  const theta = u * totalTurns * Math.PI * 2 + Math.PI * 0.15;
  const worldRadius = minRadius + Math.pow(u, 0.9) * (maxRadius - minRadius);
  const worldZ = (1 - u) * VORTEX_MAX_Z;
  const relZ = worldZ - cameraZ;
  if (relZ < -350) return null;

  const scale = focal / Math.max(120, focal + relZ);
  const x = centerX + Math.cos(theta) * worldRadius * scale;
  const y = centerY + Math.sin(theta) * worldRadius * scale;
  let alpha = 1;
  if (relZ < 0) alpha = Math.max(0, 1 + relZ / 350);
  else alpha = 0.95 - Math.min(1, relZ / 1200) * 0.7;
  return { x, y, scale, alpha, relZ };
}
