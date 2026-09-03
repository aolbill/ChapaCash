"use client";

import { api, formatBp, formatKes } from "@/components/ui/api";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WalletKind = "REAL" | "PROMO";

type BetRow = {
  id: string;
  publicName: string;
  userId: string;
  slotIndex: number;
  stakeCredits: string;
  walletKind?: WalletKind;
  status: string;
  cashedOutAtBp: number | null;
  payoutCredits: string | null;
};

type State = {
  cashCredits: string;
  promoCredits: string;
  hasDeposited: boolean;
  lifetimeDepositedKes?: string;
  multiplierBp: number | null;
  myBets: BetRow[];
  bets: BetRow[];
  round: {
    id: string;
    roundNumber: number;
    status: string;
    bettingOpensAt: string;
    bettingClosesAt: string;
    crashMultiplierBp: number | null;
    lastSequence: number;
    serverSeedHash: string;
  } | null;
};

function statusLabel(s: string | undefined) {
  switch (s) {
    case "BETTING_OPEN":
      return "Place your stake";
    case "BETTING_CLOSED":
      return "Locked in";
    case "RUNNING":
      return "In flight";
    case "CRASHED":
      return "Crashed";
    case "SETTLED":
      return "Settling";
    case "SCHEDULED":
      return "Next round";
    default:
      return s ?? "—";
  }
}

const PRESETS = ["50", "100", "200", "500"];

function Slot({
  slotIndex,
  state,
  stake,
  setStake,
  onBet,
  onCash,
  busy,
  walletKind,
}: {
  slotIndex: number;
  state: State | null;
  stake: string;
  setStake: (v: string) => void;
  onBet: (slot: number) => void;
  onCash: (betId: string) => void;
  busy: boolean;
  walletKind: WalletKind;
}) {
  const mine = state?.myBets.find((b) => b.slotIndex === slotIndex);
  const canBet = state?.round?.status === "BETTING_OPEN" && !mine;
  const canCash = state?.round?.status === "RUNNING" && mine?.status === "PLACED";
  const available =
    walletKind === "REAL" ? Number(state?.cashCredits ?? 0) : Number(state?.promoCredits ?? 0);
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-brand-wine">Bet {slotIndex + 1}</h3>
        <span className="chip">{walletKind === "REAL" ? "Cash" : "Free"}</span>
      </div>
      <label className="label mt-4">
        Stake
        <input
          className="field text-lg font-semibold tabular-nums"
          value={stake}
          onChange={(e) => setStake(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          disabled={Boolean(mine)}
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={Boolean(mine)}
            onClick={() => setStake(p)}
            className={`min-h-10 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              stake === p ? "bg-brand-wine text-brand-paper" : "bg-brand-sand/30 text-brand-wine"
            }`}
          >
            {formatKes(p)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-brand-muted">Available {formatKes(available)}</p>
      {mine ? (
        <p className="mt-2 text-sm text-brand-wineDark">
          {formatKes(mine.stakeCredits)} · {mine.status}
          {mine.cashedOutAtBp != null ? ` @ ${formatBp(mine.cashedOutAtBp)}` : ""}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button disabled={!canBet || busy} onClick={() => onBet(slotIndex)} className="btn-primary min-h-12 flex-1">
          Place bet
        </button>
        <button
          disabled={!canCash || busy || !mine}
          onClick={() => mine && onCash(mine.id)}
          className="btn-ghost min-h-12 flex-1 font-semibold"
        >
          Cash out
        </button>
      </div>
    </section>
  );
}

export default function PlayPage() {
  const [state, setState] = useState<State | null>(null);
  const [stake0, setStake0] = useState("100");
  const [stake1, setStake1] = useState("50");
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [meId, setMeId] = useState<string | null>(null);
  const meIdRef = useRef<string | null>(null);
  meIdRef.current = meId;

  const refresh = useCallback(async () => {
    const data = await api<State>("/api/game/state");
    setState(data);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

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
        } & Partial<State>;
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
    if (!state?.round) return null;
    if (state.round.status !== "BETTING_OPEN") return null;
    const ms = new Date(state.round.bettingClosesAt).getTime() - now;
    return Math.max(0, Math.ceil(ms / 1000));
  }, [state, now]);

  const resolvedKind: WalletKind =
    walletKind ?? (Number(state?.cashCredits ?? 0) > 0 ? "REAL" : "PROMO");

  async function place(slotIndex: number) {
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
  }

  async function cash(betId: string) {
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
  }

  const crashed = state?.round?.status === "CRASHED" || state?.round?.status === "SETTLED";
  const displayBp = crashed ? state?.round?.crashMultiplierBp : (state?.multiplierBp ?? 100);

  const boardTone = crashed
    ? "text-brand-danger"
    : state?.round?.status === "RUNNING"
      ? "text-brand-wine"
      : "text-brand-wineDark";

  return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] lg:gap-6">
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="kicker">Round {state?.round?.roundNumber ?? "—"}</p>
              <h1 className="page-title">{statusLabel(state?.round?.status)}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-brand-success" : "bg-brand-sand"}`} />
              <span className={connected ? "text-brand-success" : "text-brand-muted"}>
                {connected ? "Live" : "Reconnecting"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="card px-3 py-3 sm:px-4 sm:py-4">
              <p className="kicker">Cash</p>
              <p className="mt-2 truncate text-lg font-semibold tabular-nums sm:text-xl">{formatKes(state?.cashCredits)}</p>
            </div>
            <div className="card px-3 py-3 sm:px-4 sm:py-4">
              <p className="kicker">Free credits</p>
              <p className="mt-2 truncate text-lg font-semibold tabular-nums sm:text-xl">{formatKes(state?.promoCredits)}</p>
            </div>
            <div className="card col-span-2 px-3 py-3 sm:col-span-1 sm:px-4 sm:py-4">
              <p className="kicker">Stake with</p>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-brand-sand/30 p-1">
                <button
                  type="button"
                  onClick={() => setWalletKind("REAL")}
                  className={`min-h-10 rounded-lg py-1.5 text-xs font-semibold ${
                    resolvedKind === "REAL" ? "bg-brand-wine text-brand-paper" : "text-brand-wine"
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setWalletKind("PROMO")}
                  className={`min-h-10 rounded-lg py-1.5 text-xs font-semibold ${
                    resolvedKind === "PROMO" ? "bg-white text-brand-wine shadow-sm" : "text-brand-wine"
                  }`}
                >
                  Free
                </button>
              </div>
            </div>
          </div>

          {resolvedKind === "PROMO" ? (
            <p className="rounded-xl bg-brand-sand/25 px-4 py-3 text-sm text-brand-wineDark">
              Free play: higher chance the round lasts past a public crash. Winnings stay as free credits.
            </p>
          ) : (
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-brand-muted ring-1 ring-brand-sand/50">
              Cash bets use your M-PESA deposits (1 KES = 1 unit). Deposit first if this shows KES 0.
            </p>
          )}

          <div className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-3xl border border-brand-sand/60 bg-brand-cream px-3 shadow-card sm:min-h-72">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(130,29,48,0.16),transparent_55%)]" />
            <p className={`relative font-mono font-semibold tabular-nums text-[clamp(2.5rem,14vw,4.5rem)] ${boardTone}`}>
              {formatBp(displayBp)}
            </p>
            <p className="relative mt-3 px-2 text-center text-sm font-medium text-brand-muted sm:mt-4">
              {countdown != null ? `Betting closes in ${countdown}s` : statusLabel(state?.round?.status)}
            </p>
          </div>
          {error ? <p className="alert-error">{error}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Slot
              slotIndex={0}
              state={state}
              stake={stake0}
              setStake={setStake0}
              onBet={place}
              onCash={cash}
              busy={busy}
              walletKind={resolvedKind}
            />
            <Slot
              slotIndex={1}
              state={state}
              stake={stake1}
              setStake={setStake1}
              onBet={place}
              onCash={cash}
              busy={busy}
              walletKind={resolvedKind}
            />
          </div>
        </div>
        <aside className="space-y-4">
          <DepositPanel
            onCredited={(cash) =>
              setState((prev) => (prev ? { ...prev, cashCredits: cash, hasDeposited: true } : prev))
            }
          />
          <section className="card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-brand-wine">This round</h2>
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm sm:max-h-80">
              {(state?.bets ?? []).map((b) => (
                <li key={b.id} className="flex justify-between gap-2 border-b border-brand-sand/40 py-2 last:border-0">
                  <span className="truncate">
                    {b.publicName}
                    {b.walletKind === "PROMO" ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase text-brand-warning">free</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-brand-muted">
                    {formatKes(b.stakeCredits)}
                    {b.cashedOutAtBp != null ? ` → ${formatBp(b.cashedOutAtBp)}` : ` ${b.status}`}
                  </span>
                </li>
              ))}
              {(state?.bets ?? []).length === 0 ? (
                <li className="py-6 text-center text-brand-muted">No public bets yet.</li>
              ) : null}
            </ul>
          </section>
          <p className="break-all text-xs leading-relaxed text-brand-muted">
            Commitment {state?.round?.serverSeedHash.slice(0, 16) ?? "—"}… ·{" "}
            <a className="link-quiet" href="/fairness">
              Verify fairness
            </a>
          </p>
        </aside>
      </div>
  );
}
