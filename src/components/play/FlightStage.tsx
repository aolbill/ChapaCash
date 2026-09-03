"use client";

import { formatBp } from "@/components/ui/api";
import { useEffect, useMemo, useRef, useState } from "react";

const GROWTH = 0.06;
const VB_W = 1000;
const VB_H = 520;

function advanceBp(bp: number, dtMs: number): number {
  if (dtMs <= 0) return bp;
  return Math.max(100, Math.floor(bp * Math.exp(GROWTH * (dtMs / 1000))));
}

function project(bp: number, ceilingBp: number): { x: number; y: number } {
  const span = Math.max(Math.log(ceilingBp / 100), 0.12);
  const t = Math.min(1, Math.log(Math.max(bp, 100) / 100) / span);
  return {
    x: 48 + t * 860,
    y: 478 - Math.pow(t, 0.82) * 400,
  };
}

function samplePath(toBp: number, ceilingBp: number): string {
  const pts: string[] = [];
  const start = 100;
  const steps = 56;
  for (let i = 0; i <= steps; i++) {
    const bp = start + ((toBp - start) * i) / steps;
    const p = project(bp, ceilingBp);
    pts.push(`${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function PlaneMark({ crashed }: { crashed: boolean }) {
  return (
    <svg
      viewBox="0 0 56 28"
      className={`h-8 w-16 drop-shadow-[0_0_8px_rgba(225,29,46,0.8)] sm:h-10 sm:w-20 ${
        crashed ? "opacity-0 translate-x-16 -translate-y-10 -rotate-12 transition-all duration-700" : ""
      }`}
      aria-hidden
    >
      <path
        fill="#e11d2e"
        d="M2 16 L16 13 L34 12 L50 6 L54 8 L42 15 L52 22 L46 23 L34 18 L16 19 L6 24 L3 22 L10 17 Z"
      />
      <path fill="#fff" d="M14 14.5 L32 13.5 L34 15 L18 16.2 Z" />
      <circle cx="38" cy="13.5" r="1.6" fill="#1b1d27" />
    </svg>
  );
}

export function useLiveMultiplier(status: string | undefined, serverBp: number) {
  const flying = status === "RUNNING";
  const [displayBp, setDisplayBp] = useState(serverBp);
  const lastRef = useRef({ bp: serverBp, at: Date.now() });

  useEffect(() => {
    lastRef.current = { bp: serverBp, at: Date.now() };
    if (!flying) setDisplayBp(serverBp);
  }, [serverBp, flying]);

  useEffect(() => {
    if (!flying) return;
    let raf = 0;
    const loop = () => {
      const dt = Date.now() - lastRef.current.at;
      setDisplayBp(advanceBp(lastRef.current.bp, dt));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [flying, status]);

  return flying ? displayBp : serverBp;
}

export function FlightStage({
  status,
  displayBp,
  countdown,
  connected,
}: {
  status: string | undefined;
  displayBp: number;
  countdown: number | null;
  connected: boolean;
}) {
  const crashed = status === "CRASHED" || status === "SETTLED";
  const flying = status === "RUNNING";
  const waiting = status === "BETTING_OPEN" || status === "SCHEDULED" || status === "BETTING_CLOSED";

  const ceiling = Math.max(displayBp, 220);
  const path = useMemo(() => samplePath(Math.max(100, displayBp), ceiling), [displayBp, ceiling]);
  const tip = project(Math.max(100, displayBp), ceiling);
  const showTrail = flying || crashed;
  const ring = countdown != null ? Math.max(0, Math.min(1, countdown / 8)) : 0;

  return (
    <div className="relative min-h-[280px] overflow-hidden bg-[#11131c] sm:min-h-[360px] lg:min-h-[420px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden>
        {showTrail ? (
          <>
            <path d={`${path} L ${tip.x} 520 L 48 520 Z`} fill="url(#trailFill)" opacity="0.35" />
            <path d={path} fill="none" stroke="#ff2d3a" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={path} fill="none" stroke="#ff8a90" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <path d="M48 478 L 120 478" stroke="#3a3d4d" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
        <defs>
          <linearGradient id="trailFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff2d3a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff2d3a" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {showTrail ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(tip.x / VB_W) * 100}%`, top: `${(tip.y / VB_H) * 100}%` }}
        >
          <PlaneMark crashed={crashed} />
        </div>
      ) : null}

      <div className="relative z-10 flex h-full min-h-[280px] flex-col items-center justify-center sm:min-h-[360px] lg:min-h-[420px]">
        {waiting ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative grid h-28 w-28 place-items-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#2a2d3a" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#e11d2e"
                  strokeWidth="6"
                  strokeDasharray={`${ring * 264} 264`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-mono text-3xl font-bold tabular-nums text-white">
                {countdown != null ? countdown : "—"}
              </span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
              {status === "BETTING_CLOSED" ? "Starting" : "Waiting for next round"}
            </p>
          </div>
        ) : (
          <>
            {crashed ? (
              <p className="mb-1 text-sm font-extrabold uppercase tracking-[0.28em] text-[#ff4d57]">Flew away</p>
            ) : null}
            <p
              className={`font-mono text-6xl font-bold tabular-nums tracking-tight sm:text-7xl lg:text-8xl ${
                crashed ? "text-[#ff4d57]" : "text-white"
              }`}
            >
              {formatBp(displayBp)}
            </p>
          </>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-[11px] font-medium text-white/40">
        <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-white/30"}`} />
        {connected ? "Network" : "Reconnecting"}
      </div>
    </div>
  );
}
