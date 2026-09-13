# BitMax — sBTC Staking & Boost Vault
*(formerly "BoostBTC" — renamed; this doc supersedes the earlier dual-leg/leverage design)*

Status: pre-implementation spec, written for a coding agent to start from, targeting a Stacks Endowment grant application.

---

## 1. What changed from the original spec

The original BoostBTC design (dual-leg vault: split sBTC between Zest lending and StackingDAO staking, plus an optional leverage-loop contract) is **dropped**. It overlapped too closely with Zest's own "Stacks Vaults" stBTC looping product (announced July 28, 2026 — see section 4) and carried unresolved dependency risk (needing Zest to list a custom vault-share token as collateral).

BitMax is now a simpler, single-leg product:

1. User deposits sBTC → vault stakes it via StackingDAO → user earns stBTC (Bitcoin Staking yield).
2. User optionally locks STX in a separate contract → boosts their share of the vault's stBTC yield (vote-escrow style, redistributive, not inflationary).
3. The stBTC a user holds/earns is usable as collateral on Zest Protocol to borrow USDCx — this is **existing Zest functionality**, not a BitMax contract. BitMax's job is to make sure users hold real, freely-transferable stBTC (boosted or not) so they can go do this themselves; BitMax does not custody-lock it or wrap it in a new synthetic token, which avoids depending on Zest listing a new collateral asset.

This is a meaningfully smaller build than the original spec: no leverage contract, no Bitflow dependency (nothing to swap — there's only one leg), no Zest lend-leg integration. The only genuinely new contract is the STX boost mechanism.

---

## 2. Grant research — fit and positioning

### 2.1 Program structure (Stacks Endowment)
- Two active funding tracks: **Builder Grants** (up to $50K, for teams with proven traction/live product) and **Getting Started Grants** (up to $10K, for pre-PMF prototypes). A third track, Community DeGrants, funds non-technical/community work and doesn't apply here.
- Applications are evaluated on six dimensions (0–5 scale): strategic alignment, ecosystem impact, feasibility, budget reasonableness, risk profile, long-term commitment. Reviewers explicitly say "nearly all of it comes down to clarity" — concise problem/solution framing, verifiable milestones, and a budget tied line-by-line to deliverables.
- Explicitly **not funded**: purely speculative projects with no delivery path, projects that duplicate existing well-functioning ecosystem infrastructure without meaningful improvement, and proposals that are mostly marketing/token activity.
- Q3 2026 priorities named by the Foundation: shipping Bitcoin Staking (PoX-5), building liquid-staking infrastructure around stBTC across DeFi primitives, and expanding the builder pipeline toward Bitcoin-native AI agents, privacy/confidentiality protocols, and additional financial products.
- BitMax should be pitched as a **Getting Started Grant** application (no live product yet) with an explicit builder-grant follow-on once shipped, per the program's own framing.

### 2.2 Why BitMax fits this cycle specifically
- It's a direct instance of "liquid-staking infrastructure around stBTC" — the Foundation's own stated Q3 priority — since stBTC only reaches mainnet this quarter (StackingDAO targeted an August 2026 launch after completing audit). Building a boost layer on top of a freshly-launched primitive is exactly the kind of early-ecosystem composability the Endowment says it wants.
- It composes rather than duplicates: sBTC (peg-in), StackingDAO (staking), Zest (borrow) are each used for what they already do; the only new code is the STX-lock boost mechanism. This directly answers the "don't duplicate existing infrastructure" filter.
- STX-locked vote-escrow boosting has no prior implementation on Stacks. That's a genuine, narrow, well-scoped novelty — the kind of "additional financial product" the Q3 priorities call out — rather than a me-too lending market or DEX.

### 2.3 Competitive/overlap landscape (must address directly in the application)
- **Zest Protocol's "Stacks Vaults"** (announced July 28, 2026): its first vault is an automated stBTC looping vault — deposit stBTC, borrow sBTC against it, stake into more stBTC, repeat, targeting 6–8% APY vs. stBTC's ~2.6–3% base rate. This is the mechanism the *original* BoostBTC leverage-loop would have duplicated — which is exactly why that component was dropped. BitMax's current single-leg + boost design does **not** overlap: it never loops, never re-borrows against its own position, and the boost yield is a redistribution among BitMax depositors, not new leverage-driven yield. This distinction needs to be stated explicitly and up front in the grant application, since a reviewer who knows about Stacks Vaults will ask about it immediately.
- **BitYield** (an adjacent, already-funded project per the earlier project overview doc): routes sBTC into Zest lending and native Dual Stacking via a strategy-picker. BitYield has no boost/commitment mechanism and its staking leg is locked native Dual Stacking, not liquid stBTC. BitMax's differentiation is the vote-escrow boost layer specifically — that's the one piece of this design with no analog anywhere else in the Stacks ecosystem.
- **Xverse's pooled Genesis Bond access**: a wallet-level feature for individual bond access, not a yield-boosting product — not a direct competitor, but worth a one-line acknowledgment in the application to show awareness of the landscape.

### 2.4 Open risk to flag honestly in the application
- stBTC is not yet on mainnet at spec time (targeted August 2026 launch, was in audit as of Q2). All of BitMax's yield-leg functionality is blocked on this shipping as specified.
- Zest currently lists sBTC, STX, and stSTX as collateral on its Stacks market; stBTC-as-general-collateral is confirmed only inside Zest's own Stacks Vaults product so far, not necessarily as a standalone listed asset any third-party dashboard can build a "borrow" button against yet. BitMax's design deliberately sidesteps this by not requiring a new listing — see section 1, point 3 — but the *external* Zest borrow step still depends on Zest listing plain stBTC as collateral on its Stacks market, which is Zest's decision, not BitMax's. Confirm before promising a fully in-dashboard borrow flow.

---

## 3. Architecture overview

```
                     ┌─────────────────────────────────────────┐
                     │              Frontend (web app)          │
                     │  Next.js + Stacks.js + Leather/Xverse    │
                     └───────────────┬───────────────────────────┘
                                     │ contract calls / read-only calls
                                     ▼
        ┌────────────────────────────────────────────────────────────┐
        │                      Clarity contracts                      │
        │                                                              │
        │  bitmax-vault.clar ──────► StackingDAO (stake sBTC→stBTC)   │
        │        │                                                     │
        │        │ tracks boosted stBTC entitlement per depositor      │
        │        ▼                                                     │
        │  ve-stx-lock.clar (STX lock → decaying weight)               │
        │        │                                                     │
        │        ▼                                                     │
        │  bitmax-boost-distributor.clar (epoch accounting)            │
        └───────────────────────┬──────────────────────────────────────┘
                                 │ epoch trigger (permissionless)
                                 ▼
                     ┌───────────────────────────┐
                     │   Rust keeper/epoch service │
                     │  polls chain state, calls    │
                     │  epoch-close, exposes read   │
                     │  API for dashboard            │
                     └───────────────────────────┘

        User's own wallet ──(holds redeemed, boosted stBTC)──► Zest Protocol
                                                                (external, not
                                                                 a BitMax contract)
```

The key architectural decision from section 1: **BitMax never custodies stBTC past redemption, and never mints a synthetic collateral token.** Once a user redeems their boosted stBTC, it's a plain stBTC balance in their own wallet, usable anywhere stBTC is usable — including Zest — with zero additional integration work or listing dependency on BitMax's side.

---

## 4. Tech stack

- **Smart contracts:** Clarity (decidable, no reentrancy by design, native Bitcoin-state reads) + Clarinet for local devnet/testing.
- **Frontend:** Next.js/React, Stacks.js for wallet connect and contract calls, Stacks Connect for the Leather/Xverse handshake.
- **Keeper/epoch service:** Rust, polling chain state via the Hiro Stacks Blockchain API, submitting epoch-close transactions permissionlessly (same pattern as the StackSats keeper).
- **Wallets supported:** Leather, Xverse.

---

## 5. Protocol integrations

| Protocol | What we call it | Reference / status |
|---|---|---|
| **sBTC** | Entry asset (BTC peg-in) and exit asset (peg-out) | **Correction from earlier drafts:** `stacks-network/sbtc-docs` on GitHub is archived. Current docs live under `docs.stacks.co/more-guides/sbtc/`. Deposit is **not** a Clarity contract call — the depositor sends BTC to a one-time P2TR address (built via the `sbtc` npm package's `buildSbtcDepositAddress`) and then notifies the Emily coordination API (`notifySbtc`) so signers sweep and mint (~20 min). Withdrawal **is** a contract call: `.sbtc-withdrawal`'s `initiate-withdrawal-request` (mainnet deployer `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4`), locking `amount + max-fee` sBTC, resolving in ~6 Bitcoin confirmations. Implemented in `frontend/lib/sbtc.ts`, verified against the `sbtc` package's own `.d.ts` files (v0.3.2), not just doc prose. |
| **StackingDAO (stBTC)** | Staking leg — sBTC deposited here becomes stBTC | App: `app.stackingdao.com`. stBTC completed audit and targeted an August 2026 mainnet launch as the "canonical BTC LST" — **confirm mainnet contract address and mint/redeem interface directly from StackingDAO before building; do not assume it matches the stSTX contract pattern.** |
| **Own ve-lock contract** | STX boost mechanism | New contract, no external protocol dependency |
| **Zest Protocol** | Where a user takes their (boosted) stBTC to borrow USDCx | **Not a BitMax contract integration.** Zest already supports sBTC/STX/stSTX as collateral against USDCx/USDh at up to 70% LTV (sBTC) or 50% LTV (others), with an E-Mode up to 80% LTV for correlated-asset pairs. stBTC-as-general-collateral is not yet confirmed listed outside Zest's own Stacks Vaults — verify before advertising this as a one-click in-dashboard flow; worst case it's "redeem your stBTC, then go use Zest's own app," which requires no BitMax-side integration at all. |

---

## 6. Contracts to write

- **`bitmax-vault.clar`** — holds each depositor's sBTC-in-flight and stBTC-out balance; calls StackingDAO's stake/unstake functions; issues an internal accounting balance (not a transferable token) representing "stBTC earned, boost-adjusted."
- **`ve-stx-lock.clar`** — locks raw STX for a chosen duration; issues a non-transferable, time-decaying weight per depositor (Curve-style veToken pattern: `weight = amount_locked * (unlock_block - current_block) / max_lock_duration`).
- **`bitmax-boost-distributor.clar`** — at each epoch, reads total stBTC yield accrued in `bitmax-vault.clar` and each depositor's `ve-stx-lock` weight, computes and credits each depositor's boosted share (a zero-sum redistribution: boosted depositors get more than flat pro-rata, unboosted depositors get less).
- **Redeem path** (a function on `bitmax-vault.clar`, not a separate contract) — lets a depositor redeem their current boosted stBTC balance to a real, freely-transferable stBTC balance in their own wallet at any time, so they can independently supply it to Zest or anywhere else stBTC is accepted.

No leverage contract, no Bitflow-routing contract — both dropped along with the leverage-loop feature (section 1).

---

## 7. Data flow

1. User deposits BTC → sBTC peg-in (standard sBTC flow).
2. User deposits sBTC into `bitmax-vault.clar`, which stakes it via StackingDAO → stBTC accrues to the vault, tracked per-depositor.
3. *(Optional)* user locks STX in `ve-stx-lock.clar` for a chosen duration → receives a decaying weight.
4. Each epoch, `bitmax-boost-distributor.clar` totals real stBTC yield and redistributes it weighted by `ve-stx-lock` balance.
5. User redeems some or all of their boosted stBTC balance to a plain wallet balance at any time.
6. *(Off-platform)* user optionally supplies that stBTC to Zest Protocol to borrow USDCx — BitMax's dashboard can deep-link to Zest's app for this; no contract call on BitMax's side.
7. Withdrawal: unstake stBTC → sBTC via StackingDAO → sBTC peg-out to native BTC.

---

## 8. Suggested build order

1. `ve-stx-lock.clar` — no external dependencies, fully testable on devnet immediately.
2. sBTC peg-in/out (shared pattern with StackSats, if that project is also built — should be a shared module, not duplicated).
3. `bitmax-vault.clar` against StackingDAO's testnet/devnet contracts, once stBTC ships — this is the one integration genuinely blocked on an external mainnet launch.
4. `bitmax-boost-distributor.clar` — epoch accounting and weighted redistribution.
5. Frontend: deposit flow, STX-lock UI, boost multiplier display, dashboard, redeem flow, "borrow on Zest" deep link.
6. Rust keeper service for epoch triggers.

---

## 9. Known open dependencies (do not assume these are resolved)

- **stBTC mainnet contract address/interface not public at spec time** — StackingDAO targeted an August 2026 launch after audit completion; confirm directly before writing the staking integration.
- **Zest's general stBTC-collateral listing is not confirmed** — only confirmed usage so far is inside Zest's own Stacks Vaults looping product. BitMax's design avoids depending on this (users just hold and use plain stBTC), but the in-dashboard "borrow" deep-link should not be promised as fully wired until this is verified.
- **Grant application window** — the Q3 2026 Stacks Endowment cycle is what this spec targets; confirm the exact current deadline at stacksendowment.co before finalizing the application, as published dates shift between cycles.

---

## 10. Repo layout

```
bitmax/
├── contracts/                  # Clarinet project
│   ├── Clarinet.toml
│   ├── contracts/
│   │   ├── ve-stx-lock.clar
│   │   ├── bitmax-vault.clar
│   │   └── bitmax-boost-distributor.clar
│   ├── tests/                  # Clarinet SDK (Vitest) unit + integration tests
│   │   ├── ve-stx-lock.test.ts
│   │   ├── bitmax-vault.test.ts
│   │   └── bitmax-boost-distributor.test.ts
│   └── settings/                # Devnet/testnet/mainnet deployment configs
├── keeper/                      # Rust epoch-trigger service
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── chain.rs             # Hiro API polling
│       └── epoch.rs             # epoch-close trigger logic
├── web/                         # Next.js frontend
│   ├── app/
│   ├── components/
│   └── lib/
│       ├── stacks.ts            # Stacks.js client, contract call wrappers
│       └── contracts.ts         # contract addresses/ABIs per network
└── readme.md
```

Build contracts first in isolation (Clarinet needs no frontend or keeper to test against), then the keeper, then the frontend — each phase below is runnable and testable on its own before the next starts.

---

## 11. Environment setup

```bash
# Contracts
curl -L https://install.clarinet.sh | sh          # or: brew install clarinet
clarinet --version                                  # confirm install

# Frontend
node --version                                      # v20+
npx create-next-app@latest web --typescript --tailwind --app
cd web && npm install @stacks/connect @stacks/transactions @stacks/network

# Keeper
rustup default stable
cargo --version
```

Wallets for manual testing: install the Leather and Xverse browser extensions, switch both to devnet/testnet.

---

## 12. Step-by-step build guide

### Phase 1 — `ve-stx-lock.clar` (no external dependencies, start here)

```bash
cd contracts
clarinet new . --name bitmax 2>/dev/null || clarinet new bitmax && cd bitmax
clarinet contract new ve-stx-lock
```

Minimum functional surface for `ve-stx-lock.clar`:
- `lock-stx (amount uint) (unlock-height uint)` — transfers STX from caller into the contract, records `{amount, unlock-height, created-at}` in a map keyed by `tx-sender`.
- `get-weight (who principal)` — read-only: `amount * (unlock-height - current-height) / max-lock-duration`, floored at 0 once past `unlock-height`.
- `unlock-stx ()` — callable only after `unlock-height`; returns the STX to the caller and clears their map entry.
- Constants: `MAX-LOCK-DURATION` (e.g. ~2 years in blocks), `MIN-LOCK-DURATION` (e.g. ~2 weeks) to prevent trivial dust-weight locks.

Test with `clarinet test` (Vitest under the hood): lock, check weight at several block heights via `simnet.mineEmptyBlocks`, confirm decay to zero, confirm early-unlock reverts.

### Phase 2 — sBTC peg-in/out wiring (done — `frontend/lib/sbtc.ts`)

No new contract. Implemented against the real `sbtc` npm package and `@stacks/connect`, not the archived GitHub docs the original draft cited (see the corrected reference in section 5):

- `buildDepositAddress` → `sendDepositTransfer` → `notifyDeposit` (composed as `depositBtcToSbtc`): the three-step deposit flow — derive a one-time P2TR address, have the wallet send BTC to it via `@stacks/connect`'s `sendTransfer`, then notify Emily via `notifySbtc` so signers sweep and mint. No sBTC-side contract call for deposits at all.
- `initiateWithdrawal`: calls `.sbtc-withdrawal`'s `initiate-withdrawal-request` via `@stacks/connect`'s `stx_callContract`.
- **Not yet done, flagged in the code:** the withdrawal recipient must be pre-decoded into SIP-005 Bitcoin-address parts (version byte + hash bytes) before calling `initiateWithdrawal` — the `sbtc` package's own withdrawal helper module is an empty stub as of v0.3.2, so this decoding step (via `@scure/btc-signer`) still needs to be written before wiring this into the UI.
- **Not yet done:** the testnet `.sbtc-withdrawal` contract principal — only the mainnet principal is confirmed and filled in.

### Phase 3 — `bitmax-vault.clar` (done — mock-backed)

Blocked on StackingDAO's stBTC mainnet contract shipping (target: August 2026 — confirm current status before deploying against the real thing). Built and tested against three mock contracts instead, so the vault logic itself isn't blocked:

- `sip-010-trait.clar` — standard SIP-010 trait, implemented by both mocks so their interface shape matches the real sBTC/stBTC tokens.
- `mock-sbtc.clar` / `mock-stbtc.clar` — SIP-010 fungible tokens. `mock-sbtc` has an open `mint` (test-only — real sBTC has no such function, it's minted by the peg-in flow in Phase 2). `mock-stbtc`'s `mint`/`burn` are restricted to `mock-stacking-dao`, mirroring how a real LST's supply only ever moves through its own staking contract.
- `mock-stacking-dao.clar` — 1:1 `stake`/`unstake`, plus a test-only `accrue-yield` (mints extra stBTC with no matching stake, to seed yield for Phase 4's distributor tests). The 1:1 rate is a deliberate placeholder, not a guess at StackingDAO's real fee/exchange-rate mechanics — confirm those before pointing at the real contract.

`bitmax-vault.clar` itself:
- `deposit (amount uint)` — pulls sBTC from caller, stakes it via `mock-stacking-dao`, credits caller's internal balance 1:1 with the resulting stBTC (the exchange-rate read belongs at this call site once the real StackingDAO contract isn't 1:1).
- `redeem (amount uint)` — debits the caller's internal balance, transfers real stBTC (already held by the vault) to the caller's wallet. This is the point BitMax's custody ends — see section 1.
- `redeem-to-sbtc (amount uint)` — same, but unstakes back to sBTC first, for a user headed toward a full peg-out via `frontend/lib/sbtc.ts`'s `initiateWithdrawal`.
- `increase-balance` / `decrease-balance (who, amount)` — callable only by whatever principal `set-boost-distributor` (owner-only, one-shot) has been pointed at; this is the hook Phase 4's `bitmax-boost-distributor.clar` will call.
- `get-balance (who principal)` — read-only.

17/17 Vitest tests passing (`ve-stx-lock` + `bitmax-vault`), `clarinet check` clean. Swap the three mocks for StackingDAO's real contract principal once it's live on testnet — `bitmax-vault.clar`'s own logic shouldn't need to change, only the `contract-call?` targets.

### Phase 4 — `bitmax-boost-distributor.clar` (done)

Clarity has no native map/list enumeration, so depositors must self-`register` into a bounded participant list (`MAX-PARTICIPANTS u200` — an explicit MVP scale limit, not an oversight; a production version would need a different accounting pattern, e.g. Curve-style lazy per-user checkpoints, to scale past a few hundred depositors) before an epoch close will include them.

- `register ()` — adds the caller to the participant list, idempotently.
- `close-epoch ()` — permissionless, gated to once per `EPOCH-LENGTH` (~1 day) via a block-height check. Computes `real stBTC held by the vault` minus `sum of all registered participants' tracked balances` as the epoch's yield, then credits each participant a **boosted share**: `balance(i) * (1 + BOOST-FACTOR * weight-share(i))`, normalized against the same sum for everyone else — i.e. a bonus on top of flat pro-rata proportional to each participant's *fraction* of total `ve-stx-lock` weight, not raw locked units. (Weight is in STX units, balance is in sats — wildly different scales — so the formula works in normalized shares, never adding the two directly. See the contract's header comment for the exact reasoning.)
- Integer-division rounding means the sum credited each epoch can fall a few units short of the true total (never over) — the dust is simply left uncredited in the vault rather than redistributed, a deliberate simplicity tradeoff.
- `BOOST-FACTOR` (currently `u1`, meaning up to a 2x multiplier for someone holding 100% of all locked weight alone) is a tunable placeholder constant, not derived from any external precedent — expect to revisit once real usage data exists.

4 tests covering: idempotent registration, flat pro-rata when no one has locked STX, epoch-too-soon rejection, and a boosted-vs-unboosted depositor split. All 21 tests across the three contracts pass; `clarinet check` clean on all 7.

**A real gotcha worth flagging for anyone continuing this build:** the Clarinet JS SDK's Vitest integration snapshots and rolls back simnet state *per individual `it()` block*, not once per test file. Tests that assume state carries over from a previous `it` (e.g. "close an epoch, then in the next test try to close it again too soon") will silently start from a fresh chain and fail in confusing ways — every test that depends on prior mutations needs to set that state up itself, from scratch, inside itself.

### Phase 5 — Rust keeper

```bash
cd keeper
cargo new bitmax-keeper && cd bitmax-keeper
cargo add tokio --features full
cargo add reqwest --features json
cargo add serde --features derive
```

- `chain.rs`: poll the Hiro Stacks Blockchain API for current block height and `bitmax-boost-distributor` epoch state (read-only call).
- `epoch.rs`: when `current-height >= next-epoch-height`, submit a `close-epoch` transaction (any wallet can pay for this — permissionless, same pattern as the StackSats keeper-trigger).
- Run this against devnet first (`clarinet devnet start` gives you a local Stacks node + faucet), then testnet.

### Phase 6 — Frontend

Build against devnet/testnet contract addresses from `web/lib/contracts.ts`, switching a single `NETWORK` env var to move between devnet → testnet → mainnet later.

- Wallet connect: `@stacks/connect`'s `connect()` / `request()` flow for Leather and Xverse.
- Deposit flow: build the sBTC peg-in tx, then the `bitmax-vault.clar` `deposit` call, surfacing the real Bitcoin confirmation delay honestly (don't fake instant confirmation in the UI).
- STX-lock UI: amount + duration picker → calls `ve-stx-lock.clar` `lock-stx`.
- Dashboard: read-only calls to `get-balance` and `get-weight`, computed boost multiplier displayed alongside plain vs. boosted APY.
- Redeem flow: calls `bitmax-vault.clar` `redeem`, then shows a "use this on Zest" deep link to `app.zestprotocol.com` once the user holds real stBTC in their wallet — no BitMax-side contract call for the borrow step itself (section 5).

---

## 13. Testing strategy

- **Contracts:** Clarinet's Vitest SDK for unit tests per contract (state transitions, access control, boundary conditions on lock duration/epoch timing), then an integration test that runs the full deposit → lock → epoch-close → redeem sequence against simnet.
- **Keeper:** integration test against a local Clarinet devnet — spin up devnet, seed a couple of test vaults/locks, advance blocks, confirm the keeper fires `close-epoch` at the right height and not before.
- **Frontend:** manual wallet-connected testing against testnet is the realistic bar pre-launch (per the project principle of honestly showing real confirmation delays, this needs to be checked against a live-ish network, not just mocked reads).

---

## 14. Deployment path

1. **Devnet** (Clarinet-managed local node) — all of Phases 1–5 above happen here first; free, instant blocks, full control over time.
2. **Testnet** — once StackingDAO's stBTC contract has a testnet deployment, redeploy all three BitMax contracts there and re-run the full integration test suite against real (testnet) StackingDAO and sBTC contracts.
3. **Mainnet** — only after: stBTC is live on mainnet, the contracts have had any planned audit/review pass, and the grant milestone tied to a mainnet deploy is actually due. Don't deploy to mainnet before StackingDAO does — there's nothing to stake against yet.

---

## Sources

- [Everything You Need to Know About Applying for a Stacks Endowment Grant](https://www.stacks.co/blog/everything-you-need-to-know-about-applying-for-a-stacks-endowment-grant)
- [Grants | Stacks Foundation](https://stacks.foundation/grants)
- [Grants | Stacks Endowment](https://stacksendowment.co/grants)
- [Stacks Q2 2026 Ecosystem Report](https://www.stacks.co/blog/q2-2026)
- [Zest Protocol Announces Stacks Vaults (Chainwire)](https://chainwire.org/2026/07/28/zest-protocol-announces-stacks-vaults-bringing-automated-yield-strategies-to-bitcoin-native-finance/)
- [Stacking DAO Announces stBTC (Benzinga)](https://www.benzinga.com/content/60336033/stacking-dao-announces-stbtc-bring-liquid-staking-stacks-upcoming-bitcoin-staking-release)
- [Zest Protocol Docs — What is Zest Protocol?](https://docs.zestprotocol.com/start)
- [Zest Protocol — Leather blog post](https://leather.io/posts/zest)
