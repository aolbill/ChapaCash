"use client";

import { formatBp } from "@/components/ui/api";
import { SITE_NAME } from "@/domain/copy";
import { useEffect, useRef, useState, useMemo } from "react";

/** Must match server `GROWTH_PER_SECOND` default / env. */
const GROWTH = 0.06;
const VB_W = 1000;
const VB_H = 520;

/** Same curve as `multiplierBpAt` in domain/round — absolute elapsed, never tick-relative. */
function bpFromElapsedMs(elapsedMs: number): number {
  if (elapsedMs <= 0) return 100;
  return Math.max(100, Math.floor(100 * Math.exp(GROWTH * (elapsedMs / 1000))));
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
        crashed ? "translate-x-16 -translate-y-10 -rotate-12 opacity-0 transition-all duration-700" : ""
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

/**
 * Smooth live multiplier: derived from round start + wall clock, not from stitching
 * server ticks (which caused visible reverse jumps when a late tick arrived).
 */
export function useLiveMultiplier(
  status: string | undefined,
  serverBp: number,
  runningStartedAt?: string | null,
  /** Live `Date.now() - serverNowMs`; read each frame so offset updates do not restart the loop. */
  serverOffsetRef?: { current: number },
) {
  const flying = status === "RUNNING";
  const [displayBp, setDisplayBp] = useState(serverBp);
  const peakRef = useRef(100);
  const serverBpRef = useRef(serverBp);
  serverBpRef.current = serverBp;

  useEffect(() => {
    if (!flying) {
      peakRef.current = 100;
      setDisplayBp(serverBp);
    }
  }, [flying, serverBp, status]);

  useEffect(() => {
    if (!flying) return;
    const startedMs = runningStartedAt ? Date.parse(runningStartedAt) : NaN;
    let raf = 0;
    const loop = () => {
      let next: number;
      if (Number.isFinite(startedMs)) {
        const offset = serverOffsetRef?.current ?? 0;
        const serverNow = Date.now() - offset;
        next = bpFromElapsedMs(Math.max(0, serverNow - startedMs));
      } else {
        // No start time yet — climb from server samples only, never reverse.
        next = Math.max(peakRef.current, serverBpRef.current);
      }
      next = Math.max(peakRef.current, next);
      peakRef.current = next;
      setDisplayBp(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [flying, runningStartedAt, serverOffsetRef, status]);

  return flying ? displayBp : serverBp;
}

export function FlightStage({
  status,
  displayBp,
  countdown,
  bettingOpensAt,
  bettingClosesAt,
  connected,
  freePlay,
  activePlayers = 0,
}: {
  status: string | undefined;
  displayBp: number;
  countdown: number | null;
  bettingOpensAt?: string;
  bettingClosesAt?: string;
  connected: boolean;
  freePlay?: boolean;
  activePlayers?: number;
}) {
  const crashed = status === "CRASHED" || status === "SETTLED";
  const flying = status === "RUNNING";
  const waiting = status === "BETTING_OPEN" || status === "SCHEDULED" || status === "BETTING_CLOSED";

  const ceiling = Math.max(displayBp, 220);
  const path = useMemo(() => samplePath(Math.max(100, displayBp), ceiling), [displayBp, ceiling]);
  const tip = project(Math.max(100, displayBp), ceiling);
  const showTrail = flying || crashed;
  const windowSec = useMemo(() => {
    if (!bettingOpensAt || !bettingClosesAt) return 15;
    const ms = new Date(bettingClosesAt).getTime() - new Date(bettingOpensAt).getTime();
    return Math.max(1, ms / 1000);
  }, [bettingOpensAt, bettingClosesAt]);
  const ring = countdown != null ? Math.max(0, Math.min(1, countdown / windowSec)) : 0;

  return (
    <div className="relative min-h-[200px] overflow-hidden rounded-2xl bg-[#11131c] max-lg:h-[min(42vh,340px)] sm:min-h-[280px] lg:min-h-0 lg:flex-1">
      {freePlay ? (
        <p className="absolute inset-x-0 top-0 z-[6] bg-gradient-to-r from-[#a9812a] via-[#e6c05a] to-[#a9812a] py-1 text-center text-[11px] font-extrabold tracking-[2px] text-black">
          FREE PLAY
        </p>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      <p className="pointer-events-none absolute inset-0 z-[1] grid select-none place-items-center text-5xl font-black tracking-[0.28em] text-white/[0.06] sm:text-7xl">
        {SITE_NAME.toUpperCase()}
      </p>

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
          className="pointer-events-none absolute z-[4] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(tip.x / VB_W) * 100}%`, top: `${(tip.y / VB_H) * 100}%` }}
        >
          <PlaneMark crashed={crashed} />
        </div>
      ) : null}

      <div className="relative z-10 flex h-full min-h-[200px] flex-col items-center justify-center max-lg:min-h-[min(42vh,340px)] sm:min-h-[280px] lg:min-h-full">
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
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/55">
              {status === "BETTING_CLOSED"
                ? "Starting"
                : status === "BETTING_OPEN"
                  ? "Place your bets"
                  : "Waiting for next round"}
            </p>
          </div>
        ) : (
          <>
            {crashed ? (
              <p className="mb-1 text-sm font-extrabold uppercase tracking-[0.28em] text-[#ff4d57]">Flew away!</p>
            ) : null}
            <p
              className={`font-mono text-5xl font-bold tabular-nums tracking-tight sm:text-7xl lg:text-8xl ${
                crashed ? "text-[#ff4d57]" : "text-white"
              }`}
            >
              {formatBp(displayBp)}
            </p>
          </>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-[6] flex items-center gap-2 text-[11px] font-medium text-white/40">
        <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-white/30"}`} />
        {connected ? "Network" : "Reconnecting"}
      </div>
      <div className="absolute bottom-3 right-4 z-[6] flex items-center gap-1.5 rounded-full border border-[rgba(47,191,78,.35)] bg-[rgba(47,191,78,.12)] px-2.5 py-1 text-xs font-bold text-[#2fbf4e]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2fbf4e] shadow-[0_0_8px_#2fbf4e]" />
        {activePlayers.toLocaleString("en-KE")} playing
      </div>
    </div>
  );
}
