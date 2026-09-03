"use client";

import { getCachedSession, patchCachedBalances, useCachedSession } from "@/components/layout/session-cache";
import { BetSlip } from "@/components/play/BetSlip";
import { FlightStage, useLiveMultiplier } from "@/components/play/FlightStage";
import { HistoryStrip } from "@/components/play/HistoryStrip";
import { LiveBets } from "@/components/play/LiveBets";
import type { HistoryRound, RoundStatePayload, WalletKind } from "@/components/play/types";
import { api, formatKes } from "@/components/ui/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  if (typeof payload.cashCredits === "string" || typeof payload.promoCredits === "string") {
    patchCachedBalances({ cashCredits, promoCredits, hasDeposited });
  }
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

export default function PlayPage() {
  const me = useCachedSession();
  const [state, setState] = useState<RoundStatePayload | null>(null);
  const [stake0, setStake0] = useState("100");
  const [stake1, setStake1] = useState("50");
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryRound[]>([]);

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
    setState((prev) => mergePlayState(prev, data));
  }, [applyServerNow]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
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
          setState((prev) => mergePlayState(prev, payload));
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
  }, [refresh, applyServerNow]);

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
    [state?.round, stake0, stake1, resolvedKind, refresh],
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
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold tabular-nums text-brand-wine">{formatKes(cashCredits)}</span>
          <span className="text-brand-muted">cash</span>
          <span className="text-brand-sand">·</span>
          <span className="font-semibold tabular-nums text-brand-wine">{formatKes(promoCredits)}</span>
          <span className="text-brand-muted">free</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 rounded-lg bg-brand-sand/30 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setWalletKind("REAL")}
              className={`min-h-10 rounded-md px-3 py-1.5 ${resolvedKind === "REAL" ? "bg-brand-wine text-brand-paper" : "text-brand-wine"}`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setWalletKind("PROMO")}
              className={`min-h-10 rounded-md px-3 py-1.5 ${resolvedKind === "PROMO" ? "bg-white text-brand-wine shadow-sm" : "text-brand-wine"}`}
            >
              Free
            </button>
          </div>
          <a href="/wallet#deposit" className="btn-primary py-1.5 text-xs">
            Deposit
          </a>
        </div>
      </div>

      {resolvedKind === "PROMO" ? (
        <p className="mb-3 rounded-lg bg-brand-sand/25 px-3 py-2 text-xs text-brand-wineDark">
          Free play uses a gentler crash curve. Winnings stay as free credits.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-[#11131c] shadow-[0_20px_60px_rgba(0,0,0,0.28)] ring-1 ring-black/20">
        <HistoryStrip rounds={history} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <FlightStage
            status={state?.round?.status}
            displayBp={displayBp}
            countdown={countdown}
            bettingOpensAt={state?.round?.bettingOpensAt}
            bettingClosesAt={state?.round?.bettingClosesAt}
            connected={connected}
          />
          <LiveBets bets={state?.bets ?? []} meId={meId} crashed={crashed} />
        </div>
        <div className="grid gap-2 border-t border-white/5 bg-[#0e1018] p-2 sm:grid-cols-2">
          <BetSlip
            slotIndex={0}
            stake={stake0}
            setStake={setStake0}
            mine={myBets.find((b) => b.slotIndex === 0)}
            status={state?.round?.status}
            roundId={state?.round?.id}
            displayBp={displayBp}
            busy={busy}
            walletKind={resolvedKind}
            available={resolvedKind === "REAL" ? Number(cashCredits ?? 0) : Number(promoCredits ?? 0)}
            onBet={place}
            onCash={cash}
          />
          <BetSlip
            slotIndex={1}
            stake={stake1}
            setStake={setStake1}
            mine={myBets.find((b) => b.slotIndex === 1)}
            status={state?.round?.status}
            roundId={state?.round?.id}
            displayBp={displayBp}
            busy={busy}
            walletKind={resolvedKind}
            available={resolvedKind === "REAL" ? Number(cashCredits ?? 0) : Number(promoCredits ?? 0)}
            onBet={place}
            onCash={cash}
          />
        </div>
      </div>

      {error ? <p className="alert-error mt-3">{error}</p> : null}

      <p className="mt-3 break-all text-[11px] text-brand-muted">
        Round {state?.round?.roundNumber ?? "—"} · commitment {state?.round?.serverSeedHash.slice(0, 16) ?? "—"}… ·{" "}
        <a className="link-quiet" href="/fairness">
          Verify fairness
        </a>
      </p>
    </>
  );
}
