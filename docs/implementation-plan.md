# Implementation plan

**Product name:** ChapaCash.

**Inspection:** The repository was empty (no existing Next.js, ORM, or UI). This plan is the baseline.

## Stack choices

| Concern | Choice | Why |
|---|---|---|
| Web | Next.js App Router + TypeScript | Spec default |
| Styling | Tailwind CSS | Spec default |
| DB | PostgreSQL + Prisma | Authoritative ledger, rounds, users |
| Ephemeral | Redis | Rate limits, engine lock, pub/sub |
| Realtime | **SSE** over same-origin cookies | Auth stays on HTTP cookies; Redis pub/sub fans out to every app instance |
| Engine | Separate `worker` process | One instance holds a Redis lock and advances the round clock |
| Money | `bigint` integer credits (1 credit = 1 unit) | No JS floats |
| Multiplier | Integer **basis points** (100 = 1.00x) | Integer payouts: `floor(stake * bp / 100)` |
| Tests | Vitest (unit/integration) + Playwright (e2e) | Spec default |

## Build order

1. Schema + domain types (money, fairness, round SM, ledger).
2. Auth/sessions/RBAC.
3. Ledger service + invariants.
4. Game worker + APIs (bet, cash-out, state).
5. SSE + reconnect snapshot.
6. Fairness commit-reveal + verify page.
7. Player UI, then admin UI.
8. Security headers, rate limits, health, docs, tests.

## Out of scope (intentionally disabled)

Real-money payments, KYC/AML, geolocation, self-exclusion enforcement, operator crash override, direct balance edits.
