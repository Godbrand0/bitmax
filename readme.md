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
- **Update: stBTC is now live on mainnet** (StackingDAO announced it live in early September 2026), and its real contracts are confirmed directly from StackingDAO's own deployed source (`github.com/StackingDAO/stackingdao-smart-contracts`, `mainnet/README.md`) — no longer an open dependency. See section 5's StackingDAO row for the exact addresses. The vault (`bitmax-vault.clar`) still runs against mocks in this repo, not yet swapped to the real contract — see Phase 3 below.
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
                     │  TypeScript keeper service   │
                     │  polls chain state, calls    │
                     │  epoch-close permissionlessly │
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
- **Keeper/epoch service:** TypeScript (`@stacks/transactions`), polling chain state and submitting epoch-close transactions permissionlessly — same language/library as the frontend, no second toolchain.
- **Wallets supported:** Leather, Xverse.

---

## 5. Protocol integrations

| Protocol | What we call it | Reference / status |
|---|---|---|
| **sBTC** | Entry asset (BTC peg-in) and exit asset (peg-out) | **Correction from earlier drafts:** `stacks-network/sbtc-docs` on GitHub is archived. Current docs live under `docs.stacks.co/more-guides/sbtc/`. Deposit is **not** a Clarity contract call — the depositor sends BTC to a one-time P2TR address (built via the `sbtc` npm package's `buildSbtcDepositAddress`) and then notifies the Emily coordination API (`notifySbtc`) so signers sweep and mint (~20 min). Withdrawal **is** a contract call: `.sbtc-withdrawal`'s `initiate-withdrawal-request` (mainnet deployer `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4`), locking `amount + max-fee` sBTC, resolving in ~6 Bitcoin confirmations. Implemented in `frontend/lib/sbtc.ts`, verified against the `sbtc` package's own `.d.ts` files (v0.3.2), not just doc prose. |
| **StackingDAO (stBTC)** | Staking leg — sBTC deposited here becomes stBTC | **Live on mainnet, contracts confirmed directly from `github.com/StackingDAO/stackingdao-smart-contracts`'s own `mainnet/README.md`** (Sept 2026), not guessed. Token: `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stbtc-token` (standard SIP-010, 8 decimals). Deposit/withdraw entrypoint: `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-stbtc-v1`. Exchange rate (sBTC per stBTC): `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.data-stbtc-v1` — the same contract Zest's own market reads from `call-stbtc-ratio()`. `frontend/lib/vault.ts`'s `getStbtcBalance` reads the token contract already; `bitmax-vault.clar` itself still targets the mock in this repo (see Phase 3) — swapping in `stacking-dao-core-stbtc-v1` is the next real step, not done yet. |
| **Own ve-lock contract** | STX boost mechanism | New contract, no external protocol dependency |
| **Zest Protocol** | Where a user borrows USDC against their (redeemed) stBTC | **Update: now a real, embedded integration, not a link-out.** Implemented in `frontend/lib/zest.ts` calling Zest's actual live mainnet contract, `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-8-market`, directly (`supply-collateral-add` then `borrow`) — verified against Zest's real deployed source (`github.com/Zest-Protocol/zest-v2-contracts`, fetched directly), not docs prose. Still no BitMax-side contract in this path — the user's wallet signs a call straight to Zest's contract. **Zest v2 is mainnet-only** (no known devnet/testnet deployment), so this only functions once BitMax itself runs on mainnet; the UI gates on this (`ZEST_AVAILABLE`) rather than let a user submit a doomed transaction. See section 6a below for the details and what's still simplified. |

---

## 6. Contracts to write

- **`bitmax-vault.clar`** — holds each depositor's sBTC-in-flight and stBTC-out balance; calls StackingDAO's stake/unstake functions; issues an internal accounting balance (not a transferable token) representing "stBTC earned, boost-adjusted." Tracks **`amount`** (full boosted entitlement) and **`principal`** (money actually deposited, untouched by boost credits) separately per depositor — the gap between them is exactly the "yield earned" the dashboard shows. Redemption draws principal down too (saturating at zero), so principal never exceeds the current balance.
- **`ve-stx-lock.clar`** — locks raw STX for a chosen duration; issues a non-transferable, time-decaying weight per depositor (Curve-style veToken pattern: `weight = amount_locked * (unlock_block - current_block) / max_lock_duration`).
- **`bitmax-boost-distributor.clar`** — at each epoch, reads total stBTC yield accrued in `bitmax-vault.clar` and each depositor's `ve-stx-lock` weight, computes and credits each depositor's boosted share (a zero-sum redistribution: boosted depositors get more than flat pro-rata, unboosted depositors get less).
- **Redeem path** (a function on `bitmax-vault.clar`, not a separate contract) — lets a depositor redeem their current boosted stBTC balance to a real, freely-transferable stBTC balance in their own wallet at any time, so they can independently supply it to Zest or anywhere else stBTC is accepted.

No leverage contract, no Bitflow-routing contract — both dropped along with the leverage-loop feature (section 1).

### 6a. Zest integration details (`frontend/lib/zest.ts`)

Confirmed directly from Zest's own deployed source (`github.com/Zest-Protocol/zest-v2-contracts`, `mainnet/contracts/market/v0-8-market.clar` and `.../registry/v0-assets.clar`), not docs summaries, which turned out to be incomplete for this:

- **Contract:** `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-8-market` (mainnet only).
- **Supplying collateral:** `supply-collateral-add(ft, amount, min-shares, price-feeds)` — `ft` is a SIP-010 trait reference to the *raw underlying* asset (real stBTC), not one of Zest's internal `z`-prefixed vault-share tokens.
- **Borrowing:** `borrow(ft, amount, receiver, price-feeds)` — same trait pattern, for the asset being borrowed (USDC, asset id `6`).
- **Asset contract principals are resolved live**, never hardcoded: `resolveAssetContract()` calls `v0-assets.lookup(id)` on Zest's own registry. A wrong guessed token address in a lending-protocol call is exactly the kind of mistake not worth risking.
- **`price-feeds: none`** is passed deliberately — verified in Zest's source that this is a valid path (`load-price-feeds` returns `(ok { feeds: (list) })` for `none`, not an error), relying on Zest's already-cached on-chain price rather than this app also integrating Pyth Lazer's off-chain price-update service. Good enough for an MVP; a production integration should also push fresh feeds for guaranteed liveness.
- **Mainnet-only:** Zest v2 has no known devnet/testnet deployment. The frontend gates the Borrow page on `NETWORK_NAME === "mainnet"` rather than let a user submit a transaction against a contract that doesn't exist on their current network.
- **"Collateral supplied" is a real on-chain read; "available to borrow" is a clearly-labeled estimate built on top of it.** `getSuppliedStbtc()` chains three legitimate reads: `v0-market-vault.resolve-safe(account)` (principal → internal account id, cleanly erroring rather than panicking for an account that's never touched the market), `v0-market-vault.get-collateral(id, 13)` (raw zstBTC share balance — collateral is stored under the *z*-prefixed vault-share asset id, `13`, not stBTC's own id `12`, since `supply-collateral-add` wraps stBTC into zstBTC shares before storing), and `v0-vault-stbtc.convert-to-assets(shares)` (shares → real underlying stBTC). None of that was guessed — traced through Zest's actual deployed source to find it. `get-collateral` panics (not a clean error) on a missing map entry, so that specific call is wrapped in try/catch and treated as zero.
  For "available to borrow," Zest's own source has no `get-max-borrow`-style helper — the real capacity check (`collateral-add`/`borrow` in `v0-8-market.clar`) is private and needs live Pyth Lazer price feeds plus an egroup-mask-keyed LTV lookup that isn't safely reproducible client-side. Rather than fake a precise number or skip the feature, `estimateBorrowableUsdc()` computes a rough figure from a public BTC/USD price (CoinGecko's free API) and a conservative fixed 50% LTV assumption, applied to the *real* supplied-collateral figure above (not whatever's currently typed into the Supply input). The Borrow page states explicitly that this is an estimate and that Zest's own contract enforces the real limit.
- **Not yet done:** live end-to-end testing against mainnet (needs a funded mainnet wallet with real stBTC); `min-shares` slippage tolerance (1%) is a placeholder, not tuned against Zest's actual observed exchange-rate variance.

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
6. TypeScript keeper service for epoch triggers.

---

## 9. Known open dependencies (do not assume these are resolved)

- ~~stBTC mainnet contract address/interface not public~~ — **resolved**: stBTC is live, real contracts confirmed (section 5). What's left is swapping `bitmax-vault.clar`'s mock-stacking-dao calls for the real `stacking-dao-core-stbtc-v1`, not confirming the address.
- ~~Zest's general stBTC-collateral listing is not confirmed~~ — **resolved**: confirmed directly from Zest's own deployed source that stBTC (asset id `12`) is a registered, general-purpose collateral asset on `v0-8-market`, not limited to Zest's own looping product — see section 6a.
- **Grant application window** — the Q3 2026 Stacks Endowment cycle is what this spec targets; confirm the exact current deadline at stacksendowment.co before finalizing the application, as published dates shift between cycles.

---

## 10. Repo layout

```
bitmax/
├── contracts/                        # Clarinet project
│   ├── Clarinet.toml
│   ├── contracts/
│   │   ├── sip-010-trait.clar
│   │   ├── mock-sbtc.clar            # test doubles standing in for
│   │   ├── mock-stbtc.clar           # StackingDAO ahead of its own
│   │   ├── mock-stacking-dao.clar    # mainnet launch (see Phase 3)
│   │   ├── ve-stx-lock.clar
│   │   ├── bitmax-vault.clar
│   │   └── bitmax-boost-distributor.clar
│   ├── tests/                        # Clarinet SDK (Vitest) unit + integration tests
│   └── settings/                     # Devnet/testnet/mainnet deployment configs
├── keeper/                           # TypeScript epoch-trigger service
│   └── src/
│       ├── index.ts                  # poll loop
│       ├── chain.ts                  # node polling + Clarity decoding
│       ├── epoch.ts                  # epoch-close trigger logic
│       └── submit.ts                 # sign/broadcast via @stacks/transactions
├── frontend/                         # Next.js app
│   ├── app/                          # Dashboard, Boost, Borrow routes
│   ├── components/                   # shared Card/Nav/Status kit
│   └── lib/
│       ├── network.ts                # network + contract-deployer config
│       ├── vault.ts                  # bitmax-vault/ve-stx-lock wrappers
│       ├── sbtc.ts                   # real sBTC peg-in/out
│       └── zest.ts                   # embedded Zest borrow integration
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
cd frontend && pnpm install

# Keeper
cd keeper && pnpm install
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

Built and tested against three mock contracts rather than StackingDAO's real one — not because it was unavailable (it's since shipped and its real addresses are confirmed, see section 5), but because building against mocks first kept this phase unblocked while stBTC was still shipping. Swapping the mocks for the real contract is a known next step, tracked in section 9, not done yet:

- `sip-010-trait.clar` — standard SIP-010 trait, implemented by both mocks so their interface shape matches the real sBTC/stBTC tokens.
- `mock-sbtc.clar` / `mock-stbtc.clar` — SIP-010 fungible tokens. `mock-sbtc` has an open `mint` (test-only — real sBTC has no such function, it's minted by the peg-in flow in Phase 2). `mock-stbtc`'s `mint`/`burn` are restricted to `mock-stacking-dao`, mirroring how a real LST's supply only ever moves through its own staking contract.
- `mock-stacking-dao.clar` — 1:1 `stake`/`unstake`, plus a test-only `accrue-yield` (mints extra stBTC with no matching stake, to seed yield for Phase 4's distributor tests). The 1:1 rate is a deliberate placeholder, not a guess at StackingDAO's real fee/exchange-rate mechanics — confirm those before pointing at the real contract.

`bitmax-vault.clar` itself:
- `deposit (amount uint)` — pulls sBTC from caller, stakes it via `mock-stacking-dao`, credits caller's internal balance 1:1 with the resulting stBTC (the exchange-rate read belongs at this call site once the real StackingDAO contract isn't 1:1).
- `redeem (amount uint)` — debits the caller's internal balance, transfers real stBTC (already held by the vault) to the caller's wallet. This is the point BitMax's custody ends — see section 1.
- `redeem-to-sbtc (amount uint)` — same, but unstakes back to sBTC first, for a user headed toward a full peg-out via `frontend/lib/sbtc.ts`'s `initiateWithdrawal`.
- `increase-balance` / `decrease-balance (who, amount)` — callable only by whatever principal `set-boost-distributor` (owner-only, one-shot) has been pointed at; this is the hook Phase 4's `bitmax-boost-distributor.clar` will call. Only ever touch `amount`, never `principal` — this is exactly what makes the balance-minus-principal gap mean "yield/boost earned."
- `get-balance (who principal)` / `get-principal (who principal)` — read-only. The frontend's balance card shows `get-principal` as "you put in" and `get-balance - get-principal` as "you've earned."

18/18 Vitest tests passing across `ve-stx-lock` + `bitmax-vault` (including a dedicated principal-vs-yield test), `clarinet check` clean. Swap the three mocks for StackingDAO's real contract principal once it's live on testnet — `bitmax-vault.clar`'s own logic shouldn't need to change, only the `contract-call?` targets.

### Phase 4 — `bitmax-boost-distributor.clar` (done)

Clarity has no native map/list enumeration, so depositors must self-`register` into a bounded participant list (`MAX-PARTICIPANTS u200` — an explicit MVP scale limit, not an oversight; a production version would need a different accounting pattern, e.g. Curve-style lazy per-user checkpoints, to scale past a few hundred depositors) before an epoch close will include them.

- `register ()` — adds the caller to the participant list, idempotently.
- `close-epoch ()` — permissionless, gated to once per `EPOCH-LENGTH` (~1 day) via a block-height check. Computes `real stBTC held by the vault` minus `sum of all registered participants' tracked balances` as the epoch's yield, then credits each participant a **boosted share**: `balance(i) * (1 + BOOST-FACTOR * weight-share(i))`, normalized against the same sum for everyone else — i.e. a bonus on top of flat pro-rata proportional to each participant's *fraction* of total `ve-stx-lock` weight, not raw locked units. (Weight is in STX units, balance is in sats — wildly different scales — so the formula works in normalized shares, never adding the two directly. See the contract's header comment for the exact reasoning.)
- Integer-division rounding means the sum credited each epoch can fall a few units short of the true total (never over) — the dust is simply left uncredited in the vault rather than redistributed, a deliberate simplicity tradeoff.
- `BOOST-FACTOR` (currently `u1`, meaning up to a 2x multiplier for someone holding 100% of all locked weight alone) is a tunable placeholder constant, not derived from any external precedent — expect to revisit once real usage data exists.

4 tests covering: idempotent registration, flat pro-rata when no one has locked STX, epoch-too-soon rejection, and a boosted-vs-unboosted depositor split. All 22 tests across the three contracts pass; `clarinet check` clean on all 7.

**A real gotcha worth flagging for anyone continuing this build:** the Clarinet JS SDK's Vitest integration snapshots and rolls back simnet state *per individual `it()` block*, not once per test file. Tests that assume state carries over from a previous `it` (e.g. "close an epoch, then in the next test try to close it again too soon") will silently start from a fresh chain and fail in confusing ways — every test that depends on prior mutations needs to set that state up itself, from scratch, inside itself.

### Phase 5 — Keeper (done — `keeper/`, TypeScript)

Originally built in Rust (spawning a Node subprocess for transaction signing, since the only Rust option for that, `stacks-rs`, hasn't been updated since March 2024). On review that split didn't earn its keep: the keeper's whole job is polling a node and deciding "is it time yet" — nothing perf-critical, nothing that benefits from Rust specifically — and it still needed Node for signing regardless. A two-language service with a subprocess boundary was net complexity for no real benefit, so it was rewritten as a single TypeScript service:

- **`src/chain.ts`** — polls `/v2/info` for block height and `bitmax-boost-distributor`'s `get-last-epoch-close-height` via `/v2/contracts/call-read`, decoding the response with `@stacks/transactions`' own `hexToCV`/`cvToValue` rather than a hand-rolled decoder (the Rust version had to write one; the JS library already has it).
- **`src/epoch.ts`** — `shouldCloseEpoch`, a pure function mirroring the contract's own gate exactly. Unit-tested in isolation.
- **`src/submit.ts`** — builds and broadcasts the `close-epoch` transaction directly via `makeContractCall`/`broadcastTransaction`, the same library already verified working in `frontend/lib/sbtc.ts` — no subprocess, no second language.
- **`src/index.ts`** — the poll loop, reading config from env vars.

Config via env vars: `STACKS_API_URL`, `CONTRACT_ADDRESS`, `DISTRIBUTOR_CONTRACT_NAME`, `NETWORK`, `EPOCH_LENGTH_BLOCKS`, `POLL_INTERVAL_SECS`, `KEEPER_PRIVATE_KEY`. Run with `pnpm start` (or `npx tsx src/index.ts`). Run against devnet first (`clarinet devnet start` gives a local Stacks node + faucet), then testnet.

7/7 Vitest tests passing (`epoch.test.ts` unit tests, `chain.test.ts` against a mocked `fetch` using real `@stacks/transactions`-encoded responses, not hand-crafted hex), `tsc --noEmit` clean.

**Not yet done:** end-to-end testing against a running devnet (only unit-tested so far, no live network); no automated tests directly on `submit.ts` (it's a thin wrapper over `@stacks/transactions`, exercised manually via the same code path `frontend/lib/sbtc.ts` already validates, but not covered by its own test).

### Phase 6 — Frontend (done — `frontend/`, multi-page with embedded Zest borrow)

Built as a guided, plain-language app rather than a jargon-heavy DeFi UI — "sBTC"/"stBTC"/"ve-lock"/"epoch" mostly stay out of the copy in favor of "your Bitcoin-backed balance," "boost," "lock." Network (`devnet`/`testnet`/`mainnet`) and the deployer address switch via `NEXT_PUBLIC_NETWORK` / `NEXT_PUBLIC_CONTRACT_DEPLOYER` in `frontend/lib/network.ts` — no other file needs to change between environments.

**Scope change: BitMax does not handle the BTC→sBTC peg-in itself.** Earlier drafts had the app initiate the Bitcoin peg-in directly (`lib/sbtc.ts`'s `depositBtcToSbtc` and friends). That's been pulled out of the UI — users are expected to already hold sBTC (via sBTC's own official bridge, an exchange, wherever) and BitMax's job starts at depositing that sBTC into the vault. `lib/sbtc.ts`'s peg-in helpers (`buildDepositAddress`, `sendDepositTransfer`, `notifyDeposit`, `depositBtcToSbtc`) are still in the codebase, correct and typechecked, but currently unused by any page — kept as working infrastructure in case a peg-in flow is wanted again later, not dead code to be confused with something broken. `initiateWithdrawal` (sBTC→BTC) remains similarly unwired into the UI.

Four routes behind a shared top nav (`components/Nav.tsx`, rendered once in `app/layout.tsx`):

- **`app/page.tsx` (Landing)** — the public marketing page (`components/Landing.tsx`), always reachable regardless of wallet state. See the landing-page and route-split notes above.
- **`app/app/page.tsx` (Dashboard)** — balance card broken into three numbers, not one: total balance, **"you put in"** (`get-principal`), and **"you've earned"** (balance minus principal) — plus a boost-status banner ("🚀 boosted" or "earning at base rate") linking to Boost. Below that: a single "Deposit sBTC to start earning" card showing the user's live sBTC wallet balance and calling `bitmax-vault.deposit` — depositing *is* what starts earning, there's no separate step. Then "move to my wallet" (`redeem`) with a link into Borrow.
- **`app/app/boost/page.tsx`** — its own page: current boost weight, active lock detail with unlock height, lock/unlock actions. Framed as "the mechanism that makes BitMax different," not a side feature.
- **`app/app/borrow/page.tsx`** — **embedded Zest borrowing, not a redirect.** A "Your Zest position" card up top shows real, on-chain collateral supplied and an estimated borrow limit (see section 6a) — not a redirect target, the actual dashboard for deciding what to type below. Below that, Supply and Borrow sit in two side-by-side containers (`flex`, stacking on mobile); Supply shows the user's live **stBTC** balance (not sBTC — an earlier version of this page showed the wrong token's balance, since Zest's `supply-collateral-add` takes real stBTC as collateral). The general explainer card moved to the bottom, since the position dashboard is what a returning user actually wants to see first. Calls Zest's real mainnet contract directly (`lib/zest.ts`); gated behind `ZEST_AVAILABLE` (mainnet-only) with a plain explanation when the app is pointed at devnet/testnet instead of a broken/silent failure.
- **`components/ConnectPrompt.tsx`** — shared fallback each `/app/*` page shows if visited without a wallet connected, instead of each page separately assuming one.
- **`lib/wallet.tsx`** — connect/disconnect via `@stacks/connect`. One real subtlety: `getLocalStorage()` deliberately strips the BTC public key before persisting it, so it's captured only from a *live* `connect()` result, not restored on page reload — relevant if a peg-in flow using it is reintroduced later.
- **`lib/vault.ts`** / **`lib/zest.ts`** — thin wrappers over the vault/lock/distributor contract calls and the embedded Zest calls, respectively; `lib/vault.ts` also reads the real sBTC token balance (`SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token` on mainnet, `mock-sbtc` elsewhere).
- **`lib/format.ts`** — BTC↔sats and STX↔µSTX conversion, and human lock-duration presets ("2 weeks" … "2 years") mapped to the block counts `ve-stx-lock.clar` actually expects — nobody should have to think in block heights.

Verified: `tsc --noEmit` clean, `next build` succeeds across all four routes, dev server serves a 200; a real bug was caught and fixed during manual testing (an unhandled promise rejection when no Stacks node is reachable — `refresh()` now fails gracefully with a plain-language banner instead of crashing). **Not yet done:** in-browser click-through testing of the boost/borrow pages specifically (only the dashboard got a manual pass so far), and live testing of the Zest integration against mainnet with a funded wallet.

**Visual design pass:** token-based theming in `app/globals.css` (`--brand`, `--surface`, `--border`, `--muted`, etc., with light/dark variants) instead of hardcoded `zinc-*`/`orange-*` classes scattered per component, so the palette changes in one place. `components/Card.tsx` grew into a small shared kit (`Card`, `PrimaryButton`, `SecondaryButton`, `TextInput`, `Select`, `StatTile`, `Badge`) reused across all three pages instead of each page rolling its own input/button styling. `Nav.tsx` is now sticky with a logo mark and wraps to a second row on narrow screens rather than overflowing.

**Landing page, now a real separate route** (`components/Landing.tsx`, rendered at `/`): hero, a trust strip ("Non-custodial," "Bitcoin-backed (sBTC)," "Withdraw anytime"), four detailed how-it-works cards, a dedicated "boosting is what BitMax is about" section (echoing the section 2.3/6a framing — boosting isn't a side feature), a "borrow without leaving" section, an FAQ (plain `<details>`/`<summary>`, no JS state needed), and a final CTA. Deliberately makes no unverifiable claims — no APY numbers, no "audited" claim — since none of that is true yet.

`/` originally swapped between this landing content and the dashboard based on wallet-connection state — same route, two faces. That meant a connected user never actually saw a distinct landing page, which defeats the point of having one. Restructured so `/` is *always* the landing page (public, no wallet needed) and the actual app lives under `/app`, `/app/boost`, `/app/borrow` — the standard split for a dApp: marketing page stays reachable regardless of wallet state, the gated app is a separate area. The nav logo links to `/`; the landing page's CTA button reads "Connect Wallet to Start" and redirects to `/app` on success, or "Go to Dashboard" (no reconnect needed) if already connected. Each `/app/*` page falls back to a shared `ConnectPrompt` component if visited without a wallet connected, rather than assuming one.

### 6b. Gas sponsorship (`lib/sponsor.ts` + `app/api/sponsor/route.ts`)

Every write in the app — `deposit`, `redeem`, `redeem-to-sbtc`, `lock-stx`, `unlock-stx`, `register`, and both Zest calls (`supply-collateral-add`, `borrow`) — goes through `submitSponsored()` instead of calling `@stacks/connect`'s `request("stx_callContract", ...)` directly, so a user never needs STX in their wallet just to pay a transaction fee.

- **How it works:** the call passes `sponsored: true`. Per `@stacks/connect`'s own types, a sponsored request has the wallet *sign but not broadcast* the transaction (it can't yet — it isn't valid until a sponsor co-signs and pays the fee) and return the raw signed tx instead of a txid. `lib/sponsor.ts` POSTs that raw tx to this app's own `/api/sponsor` route.
- **`app/api/sponsor/route.ts`** (server-only) holds the actual sponsor private key, deserializes the transaction, and — critically — **checks it's a contract-call into one of BitMax's own contracts or Zest's `v0-8-market`** before sponsoring anything. Without that allowlist this endpoint would be a free transaction-broadcasting service for anyone, paid for out of the sponsor wallet; verified by hand-crafting a call to an arbitrary contract and confirming it's rejected with 403 before any signing happens.
- **`SPONSOR_PRIVATE_KEY`** is deliberately not `NEXT_PUBLIC_`-prefixed so it never reaches the browser bundle. See `.env.example`. Whatever account it corresponds to needs to be funded with STX — every sponsored transaction spends real STX from it.
- **No unsponsored fallback.** If `SPONSOR_PRIVATE_KEY` isn't set, the endpoint returns a clear 503 and every write in the app fails with an explicit "gas sponsorship isn't configured" message, rather than silently trying something else. That was a deliberate choice, not an oversight — the alternative (silently falling back to asking the user to pay their own fee) would contradict the whole point of sponsoring "all transactions," as asked.
- **Not yet done:** rate-limiting / per-account spend caps on the sponsor endpoint. The contract allowlist stops arbitrary abuse, but a malicious user could still spam legitimate-looking calls (e.g. tiny repeated deposits) to drain the sponsor wallet faster than intended — worth adding before a real funded key goes live on mainnet.

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
