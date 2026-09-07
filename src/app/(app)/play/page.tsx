"use client";

import { getCachedSession, patchCachedBalances, useCachedSession } from "@/components/layout/session-cache";
import { AuthModal } from "@/components/play/AuthModal";
import { BetSlip } from "@/components/play/BetSlip";
import { FlightStage, useLiveMultiplier } from "@/components/play/FlightStage";
import { HistoryStrip } from "@/components/play/HistoryStrip";
import { LiveBets } from "@/components/play/LiveBets";
import { PlayHeader } from "@/components/play/PlayHeader";
import type { HistoryRound, RoundStatePayload, WalletKind } from "@/components/play/types";
import { api } from "@/components/ui/api";
import { Montserrat } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

function mergePlayState(
  prev: RoundStatePayload | null,
  payload: Partial<RoundStatePayload> & { cashCredits?: string; promoCredits?: string; hasDeposited?: boolean },
): RoundStatePayload {
  const cached = getCachedSession();
  const cashCredits =
    typeof payload.cashCredits === "string"
      ? payload.cashCredits
      : (prev?.cashCredits ?? cached?.cashCredits ?? "0");
  const promoCredits =
    typeof payload.promoCredits === "string"
      ? payload.promoCredits
      : (prev?.promoCredits ?? cached?.promoCredits ?? "0");
  const hasDeposited =
    typeof payload.hasDeposited === "boolean"
      ? payload.hasDeposited
      : (prev?.hasDeposited ?? cached?.hasDeposited ?? false);
  const round = payload.round !== undefined ? payload.round : (prev?.round ?? null);
  const roundChanged = round?.id !== prev?.round?.id;
  const bets = payload.bets ?? (roundChanged ? [] : prev?.bets) ?? [];
  const meId = cached?.id;
  return {
    cashCredits,
    promoCredits,
    hasDeposited,
    lifetimeDepositedKes: payload.lifetimeDepositedKes ?? prev?.lifetimeDepositedKes,
    serverNow: payload.serverNow ?? prev?.serverNow,
    multiplierBp: payload.multiplierBp ?? prev?.multiplierBp ?? null,
    bets,
    myBets: meId ? bets.filter((b) => b.userId === meId) : (payload.myBets ?? (roundChanged ? [] : prev?.myBets) ?? []),
    round,
  };
}

function applyPlayState(
  payload: Partial<RoundStatePayload> & { cashCredits?: string; promoCredits?: string; hasDeposited?: boolean },
  setState: Dispatch<SetStateAction<RoundStatePayload | null>>,
) {
  setState((prev) => mergePlayState(prev, payload));
  if (typeof payload.cashCredits !== "string" && typeof payload.promoCredits !== "string") return;
  queueMicrotask(() => {
    patchCachedBalances({
      cashCredits: payload.cashCredits,
      promoCredits: payload.promoCredits,
      hasDeposited: payload.hasDeposited,
    });
  });
}

export default function PlayPage() {
  const me = useCachedSession();
  const [state, setState] = useState<RoundStatePayload | null>(null);
  const [stake0, setStake0] = useState("10");
  const [stake1, setStake1] = useState("10");
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryRound[]>([]);

  const closeAuth = useCallback(() => setAuthMode(null), []);
  const openLogin = useCallback(() => setAuthMode("login"), []);
  const openRegister = useCallback(() => setAuthMode("register"), []);

  const refreshGen = useRef(0);
  const serverOffsetRef = useRef(0);

  const applyServerNow = useCallback((iso: string | undefined) => {
    if (!iso) return;
    const t = Date.parse(iso);
    if (Number.isFinite(t)) serverOffsetRef.current = Date.now() - t;
  }, []);

  const refresh = useCallback(async () => {
    const gen = ++refreshGen.current;
    const data = await api<RoundStatePayload>("/api/game/state");
    if (gen !== refreshGen.current) return;
    applyServerNow(data.serverNow);
    applyPlayState(data, setState);
  }, [applyServerNow]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("auth");
    if (q === "login" || q === "register") {
      window.history.replaceState({}, "", "/play");
      if (!getCachedSession()) setAuthMode(q);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void api<{ rounds: HistoryRound[] }>("/api/game/rounds")
        .then((d) => setHistory(d.rounds))
        .catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const crash = state?.round?.crashMultiplierBp;
    const id = state?.round?.id;
    if (!id || crash == null) return;
    if (state.round?.status !== "CRASHED" && state.round?.status !== "SETTLED" && state.round?.status !== "ARCHIVED") {
      return;
    }
    setHistory((prev) => {
      if (prev.some((r) => r.id === id)) return prev;
      return [{ id, roundNumber: state.round?.roundNumber ?? 0, crashMultiplierBp: crash }, ...prev].slice(0, 25);
    });
  }, [state?.round?.id, state?.round?.status, state?.round?.crashMultiplierBp, state?.round?.roundNumber]);

  useEffect(() => {
    let es: EventSource | null = null;
    let fallback: number | undefined;
    es = new EventSource("/api/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data) as {
          type: string;
          cashCredits?: string;
          promoCredits?: string;
          hasDeposited?: boolean;
          event?: { type?: string; payload?: { multiplierBp?: number } };
        } & Partial<RoundStatePayload>;
        if (payload.type === "snapshot" || payload.type === "state") {
          if (fallback) {
            window.clearTimeout(fallback);
            fallback = undefined;
          }
          applyServerNow(payload.serverNow);
          applyPlayState(payload, setState);
        }
        if (payload.type === "event") {
          const evType = payload.event?.type;
          if (evType === "TICK") {
            const bp = payload.event?.payload?.multiplierBp;
            if (typeof bp === "number") {
              setState((prev) => (prev ? { ...prev, multiplierBp: bp } : prev));
            }
            return;
          }
          void refresh();
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    fallback = window.setTimeout(() => {
      void refresh().catch((e) => setError(String(e.message)));
    }, 2500);
    return () => {
      if (fallback) window.clearTimeout(fallback);
      es?.close();
    };
  }, [refresh, me?.id, applyServerNow]);

  const countdown = useMemo(() => {
    if (!state?.round || now == null) return null;
    if (state.round.status !== "BETTING_OPEN" && state.round.status !== "SCHEDULED") return null;
    const ms = new Date(state.round.bettingClosesAt).getTime() - (now - serverOffsetRef.current);
    return Math.max(0, Math.ceil(ms / 1000));
  }, [state, now]);

  const cashCredits = state?.cashCredits ?? me?.cashCredits;
  const promoCredits = state?.promoCredits ?? me?.promoCredits;
  const meId = me?.id ?? null;
  const myBets = useMemo(() => {
    if (meId && state?.bets) return state.bets.filter((b) => b.userId === meId);
    return state?.myBets ?? [];
  }, [meId, state?.bets, state?.myBets]);

  const resolvedKind: WalletKind =
    walletKind ?? (Number(cashCredits ?? 0) > 0 ? "REAL" : "PROMO");

  const place = useCallback(
    async (slotIndex: number) => {
      if (!me) {
        openLogin();
        return;
      }
      if (!state?.round) return;
      setBusy(true);
      setError(null);
      try {
        await api("/api/game/bet", {
          method: "POST",
          body: JSON.stringify({
            roundId: state.round.id,
            slotIndex,
            stakeCredits: slotIndex === 0 ? stake0 : stake1,
            walletKind: resolvedKind,
            idempotencyKey: crypto.randomUUID(),
          }),
        });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bet failed");
      } finally {
        setBusy(false);
      }
    },
    [me, openLogin, state?.round, stake0, stake1, resolvedKind, refresh],
  );

  const cash = useCallback(
    async (betId: string) => {
      setBusy(true);
      setError(null);
      try {
        await api("/api/game/cashout", {
          method: "POST",
          body: JSON.stringify({ betId, idempotencyKey: crypto.randomUUID() }),
        });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Cash-out failed");
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const crashed = state?.round?.status === "CRASHED" || state?.round?.status === "SETTLED";
  const serverBp = crashed ? (state?.round?.crashMultiplierBp ?? 100) : (state?.multiplierBp ?? 100);
  const displayBp = useLiveMultiplier(state?.round?.status, serverBp);

  return (
    <div className={`${montserrat.className} flex h-dvh max-w-[1200px] flex-col overflow-hidden bg-[#0d0d0f] text-[#f2f3f7]`}>
      <PlayHeader
        loggedIn={Boolean(me)}
        role={me?.role}
        cashCredits={cashCredits}
        promoCredits={promoCredits}
        walletKind={resolvedKind}
        onWalletKind={(k) => setWalletKind(k)}
        onLogin={openLogin}
        onRegister={openRegister}
      />
      <div className="relative h-9 overflow-hidden border-b border-[#2a2c34] bg-gradient-to-r from-[#1a1206] via-[#241708] to-[#1a1206]">
        <div className="flex h-full w-max items-center whitespace-nowrap text-[13px] font-bold text-[#ffd88a] [animation:playPromo_22s_linear_infinite] hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <span key={copy} className="inline-flex items-center gap-2 px-10">
              <span className="rounded bg-[#e11d2a] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
                BONUS
              </span>
              Deposit via M-PESA and play · 18+ only · Gamble responsibly
              {me ? (
                <a href="/wallet#deposit" className="text-[#7fd4ff] no-underline">
                  Deposit
                </a>
              ) : (
                <button type="button" className="text-[#7fd4ff]" onClick={openRegister}>
                  Join now
                </button>
              )}
            </span>
          ))}
        </div>
      </div>
      <HistoryStrip rounds={history} />
      <div className="flex min-h-0 flex-1 max-[820px]:flex-col max-[820px]:overflow-y-auto">
        <div className="order-3 flex min-h-0 lg:order-1">
          <LiveBets bets={state?.bets ?? []} meId={meId} crashed={crashed} />
        </div>
        <div className="order-1 flex min-w-0 flex-1 flex-col p-2.5 max-[820px]:flex-none max-[820px]:p-2 lg:order-2">
          <FlightStage
            status={state?.round?.status}
            displayBp={displayBp}
            countdown={countdown}
            bettingOpensAt={state?.round?.bettingOpensAt}
            bettingClosesAt={state?.round?.bettingClosesAt}
            connected={connected}
            freePlay={resolvedKind === "PROMO"}
            playerCount={state?.bets?.length}
          />
          <div className="mt-2.5 flex gap-2.5 max-[820px]:flex-col max-[820px]:gap-2">
            <BetSlip
              slotIndex={0}
              stake={stake0}
              setStake={setStake0}
              mine={myBets.find((b) => b.slotIndex === 0)}
              status={state?.round?.status}
              displayBp={displayBp}
              busy={busy}
              walletKind={resolvedKind}
              onBet={place}
              onCash={cash}
            />
            <BetSlip
              slotIndex={1}
              stake={stake1}
              setStake={setStake1}
              mine={myBets.find((b) => b.slotIndex === 1)}
              status={state?.round?.status}
              displayBp={displayBp}
              busy={busy}
              walletKind={resolvedKind}
              onBet={place}
              onCash={cash}
            />
          </div>
          {error ? <p className="mt-2 text-center text-xs font-bold text-[#ff6b76]">{error}</p> : null}
        </div>
      </div>
      {authMode ? (
        <AuthModal
          mode={authMode}
          onMode={(next) => setAuthMode(next)}
          onClose={closeAuth}
          onAuthed={() => {
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
