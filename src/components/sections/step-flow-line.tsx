"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

type LineCoords = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
};

const TRACK = "rgba(255,255,255,0.12)";
const GREEN = "#b4e04a";
const GREEN_DIM = "rgba(180,224,74,0.45)";
const GREEN_FAINT = "rgba(180,224,74,0.28)";

function measureLine(
  container: HTMLElement,
  startEl: HTMLElement,
  endEl: HTMLElement
): LineCoords | null {
  const c = container.getBoundingClientRect();
  const a = startEl.getBoundingClientRect();
  const b = endEl.getBoundingClientRect();

  if (c.width === 0 || c.height === 0) return null;

  const x1 = a.left + a.width / 2 - c.left;
  const y1 = a.top + a.height / 2 - c.top;
  const x2 = b.left + b.width / 2 - c.left;
  const y2 = b.top + b.height / 2 - c.top;
  const length = Math.hypot(x2 - x1, y2 - y1);

  if (length < 1) return null;
  return { x1, y1, x2, y2, length };
}

interface StepFlowLineProps {
  containerRef: React.RefObject<HTMLElement | null>;
  startRef: React.RefObject<HTMLElement | null>;
  endRef: React.RefObject<HTMLElement | null>;
}

export function StepFlowLine({
  containerRef,
  startRef,
  endRef,
}: StepFlowLineProps) {
  const [coords, setCoords] = useState<LineCoords | null>(null);

  const update = useCallback(() => {
    const container = containerRef.current;
    const start = startRef.current;
    const end = endRef.current;
    if (!container || !start || !end) return;
    const next = measureLine(container, start, end);
    if (next) setCoords(next);
  }, [containerRef, startRef, endRef]);

  useLayoutEffect(() => {
    update();
    const raf = requestAnimationFrame(update);
    const t = window.setTimeout(update, 100);

    const container = containerRef.current;
    if (!container) {
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }

    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update, containerRef]);

  if (!coords) return null;

  const marchDash = 6;
  const marchGap = 10;
  const marchPeriod = marchDash + marchGap;

  const pulseLen = Math.max(32, Math.min(64, coords.length * 0.16));
  const pulsePeriod = pulseLen + coords.length;

  return (
    <svg
      width="100%"
      height="100%"
      className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
      aria-hidden
    >
      {/* Always-visible base track */}
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={TRACK}
        strokeWidth={1}
      />

      {/* Marching dashes 01 → 04 */}
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={GREEN_DIM}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={`${marchDash} ${marchGap}`}
        className="step-flow-march"
      />

      {/* Pulse 01 → 04 (staggered pair) */}
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={GREEN}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${pulseLen} ${coords.length}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to={-pulsePeriod}
          dur="3s"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={GREEN_DIM}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${pulseLen * 0.7} ${coords.length}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to={-pulsePeriod}
          dur="3s"
          begin="-1.5s"
          repeatCount="indefinite"
        />
      </line>

      {/* Marching dashes 04 → 01 */}
      <line
        x1={coords.x2}
        y1={coords.y2}
        x2={coords.x1}
        y2={coords.y1}
        stroke={GREEN_FAINT}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={`${marchDash} ${marchGap}`}
        className="step-flow-march-reverse"
      />

      {/* Pulse 04 → 01 (staggered pair) */}
      <line
        x1={coords.x2}
        y1={coords.y2}
        x2={coords.x1}
        y2={coords.y1}
        stroke={GREEN_FAINT}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${pulseLen * 0.65} ${coords.length}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to={-pulsePeriod}
          dur="3.5s"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1={coords.x2}
        y1={coords.y2}
        x2={coords.x1}
        y2={coords.y1}
        stroke={GREEN_FAINT}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${pulseLen * 0.5} ${coords.length}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to={-pulsePeriod}
          dur="3.5s"
          begin="-1.75s"
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
}
