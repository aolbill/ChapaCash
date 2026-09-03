"use client";

import { AppShell } from "@/components/layout/AppShell";
import { BetSlip } from "@/components/play/BetSlip";
import { FlightStage, useLiveMultiplier } from "@/components/play/FlightStage";
import { HistoryStrip } from "@/components/play/HistoryStrip";
import { LiveBets } from "@/components/play/LiveBets";
import type { HistoryRound, RoundStatePayload, WalletKind } from "@/components/play/types";
import { api, formatKes } from "@/components/ui/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function PlayPage() {
  const [state, setState] = useState<RoundStatePayload | null>(null);
  const [stake0, setStake0] = useState("100");
  const [stake1, setStake1] = useState("50");
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRound[]>([]);
  const meIdRef = useRef<string | null>(null);
  meIdRef.current = meId;

  const refresh = useCallback(async () => {
    const data = await api<RoundStatePayload>("/api/game/state");
    setState(data);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void api<{ rounds: HistoryRound[] }>("/api/game/rounds")
      .then((d) => setHistory(d.rounds))
      .catch(() => undefined);
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
    void api<{ user: { id: string } }>("/api/auth/me")
      .then((d) => setMeId(d.user.id))
      .catch(() => undefined);
    void refresh().catch((e) => setError(String(e.message)));
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
        } & Partial<RoundStatePayload>;
        if (payload.type === "snapshot" || payload.type === "state") {
          const bets = payload.bets ?? [];
          setState((prev) => ({
            cashCredits: payload.cashCredits ?? prev?.cashCredits ?? "0",
            promoCredits: payload.promoCredits ?? prev?.promoCredits ?? "0",
            hasDeposited: payload.hasDeposited ?? prev?.hasDeposited ?? false,
            multiplierBp: payload.multiplierBp ?? prev?.multiplierBp ?? null,
            bets,
            myBets: meIdRef.current
              ? bets.filter((b) => b.userId === meIdRef.current)
              : (payload.myBets ?? prev?.myBets ?? []),
            round: payload.round ?? prev?.round ?? null,
          }));
        }
        if (payload.type === "event") {
          void refresh();
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => es?.close();
  }, [refresh]);

  const countdown = useMemo(() => {
    if (!state?.round || now == null) return null;
    if (state.round.status !== "BETTING_OPEN") return null;
    const ms = new Date(state.round.bettingClosesAt).getTime() - (now ?? 0);
    return Math.max(0, Math.ceil(ms / 1000));
  }, [state, now]);

  const resolvedKind: WalletKind =
    walletKind ?? (Number(state?.cashCredits ?? 0) > 0 ? "REAL" : "PROMO");

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
    <AppShell dense>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold tabular-nums text-brand-wine">{formatKes(state?.cashCredits)}</span>
          <span className="text-brand-muted">cash</span>
          <span className="text-brand-sand">·</span>
          <span className="font-semibold tabular-nums text-brand-wine">{formatKes(state?.promoCredits)}</span>
          <span className="text-brand-muted">free</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 rounded-lg bg-brand-sand/30 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setWalletKind("REAL")}
              className={`rounded-md px-3 py-1.5 ${resolvedKind === "REAL" ? "bg-brand-wine text-brand-paper" : "text-brand-wine"}`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setWalletKind("PROMO")}
              className={`rounded-md px-3 py-1.5 ${resolvedKind === "PROMO" ? "bg-white text-brand-wine shadow-sm" : "text-brand-wine"}`}
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
            connected={connected}
          />
          <LiveBets bets={state?.bets ?? []} meId={meId} crashed={crashed} />
        </div>
        <div className="grid gap-2 border-t border-white/5 bg-[#0e1018] p-2 sm:grid-cols-2">
          <BetSlip
            slotIndex={0}
            stake={stake0}
            setStake={setStake0}
            mine={state?.myBets.find((b) => b.slotIndex === 0)}
            status={state?.round?.status}
            roundId={state?.round?.id}
            displayBp={displayBp}
            busy={busy}
            walletKind={resolvedKind}
            available={resolvedKind === "REAL" ? Number(state?.cashCredits ?? 0) : Number(state?.promoCredits ?? 0)}
            onBet={place}
            onCash={cash}
          />
          <BetSlip
            slotIndex={1}
            stake={stake1}
            setStake={setStake1}
            mine={state?.myBets.find((b) => b.slotIndex === 1)}
            status={state?.round?.status}
            roundId={state?.round?.id}
            displayBp={displayBp}
            busy={busy}
            walletKind={resolvedKind}
            available={resolvedKind === "REAL" ? Number(state?.cashCredits ?? 0) : Number(state?.promoCredits ?? 0)}
            onBet={place}
            onCash={cash}
          />
        </div>
      </div>

      {error ? <p className="alert-error mt-3">{error}</p> : null}

      <p className="mt-3 text-[11px] text-brand-muted">
        Round {state?.round?.roundNumber ?? "—"} · commitment {state?.round?.serverSeedHash.slice(0, 16) ?? "—"}… ·{" "}
        <a className="link-quiet" href="/fairness">
          Verify fairness
        </a>
      </p>
    </AppShell>
  );
}
