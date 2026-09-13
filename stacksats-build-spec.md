# StackSats — Build Specification

Status: pre-implementation spec, written for a coding agent to start from. Verify all contract addresses and API shapes against live docs before writing code — protocols referenced (especially stBTC) are actively shipping and interfaces may have moved since this was written (Sept 2026).

## 1. What we're building
A web app where a user deposits native BTC, it automatically converts to sBTC, streams gradually into StackingDAO's stBTC over a chosen period, and can be borrowed against via Zest Protocol or withdrawn back to native BTC at any time. Full flow and product rationale: see `q3-grant-project-overview.md`, section 1.

## 2. Tech stack
- **Smart contracts:** Clarity (Stacks' contract language — decidable, no reentrancy by design, has native Bitcoin-state read functions)
- **Contract dev/test:** Clarinet (local devnet, unit + integration testing) — https://github.com/stacks-network/docs (see "Learn Clarinet" and "Clarinet JS SDK" sections)
- **Frontend:** Stacks.js for wallet connect, contract calls, and transaction building — docs under the same stacks-network/docs repo, "Learn Stacks.js" and "Stacks Connect" sections
- **Keeper/automation service:** Rust, polling chain state via the Hiro Stacks Blockchain API, submitting scheduled swap-trigger transactions
- **Wallets to support:** Leather, Xverse (both support Stacks + Bitcoin)

## 3. Protocol integrations

| Protocol | What we call | Reference |
|---|---|---|
| **sBTC** | Peg-in (BTC → sBTC) and peg-out (sBTC → BTC) | Docs: `stacks-network/sbtc-docs` on GitHub (`SUMMARY.md` — see "Developer Guides > Quickstart", "Initiating a Deposit", "Initiating a Withdrawal", "The sBTC SDK"). Also: Clarinet's built-in "sBTC Integration" guide under Clarinet Integrations. |
| **Bitflow** | sBTC ↔ stBTC swap execution during streaming | npm package `@bitflowlabs/core-sdk`. REST/OpenAPI specs live at `bff.bitflowapis.finance` (`/api/quotes/openapi.json`, `/api/app/openapi.json`) — not linked from the main docs site, fetch directly. SDK source repo (`github.com/BitflowFinance/bitflow-sdk`) has been reported as inaccessible/404 as of writing — confirm access before relying on it; fall back to the raw REST API if so. |
| **StackingDAO (stBTC)** | Staking leg — sBTC deposited here becomes stBTC | App: `app.stackingdao.com`. stBTC was in audit as of Aug 2026 targeting a Q3 mainnet launch — **confirm mainnet contract address and mint/redeem interface directly from StackingDAO before building against it; do not assume it matches the existing stSTX contract pattern.** |
| **Zest Protocol** | Optional: borrow against stBTC without unstaking | App-based lending market. Already supports stSTX as collateral (precedent for stBTC) — see StackingDAO's guide "Borrowing and Lending on Zest with stSTX" for the UX pattern (supply stSTX → borrow aeUSDC up to ~50% LTV). **stBTC collateral support on Zest is not yet confirmed — verify before building the borrow feature.** |

## 4. Contracts to write

- `sats-vault.clar` — holds a user's streaming position (source asset balance, target asset balance, interval, total periods, periods completed, start block height)
- `sats-keeper-trigger.clar` — permissionless public function any keeper can call to execute the next due tranche; pays the caller a 0.1% bounty on the tranche amount
- `sats-swap-now.clar` (or a function within `sats-vault.clar`) — lets the vault owner trigger an immediate full-balance conversion, bypassing the schedule
- `sats-withdraw.clar` — lets the vault owner withdraw accumulated stBTC (or sBTC before conversion) at any time; initiates sBTC peg-out on final withdrawal to native BTC

Existing asset: the original bidirectional USDCx↔sBTC Clarity contract from the earlier StackSats design exists and should be used as a starting point — strip the USDCx/de-risk branch, retarget the swap destination from USDCx to stBTC via StackingDAO instead of only Bitflow-routed USDCx.

## 5. Data flow

1. Frontend (Stacks.js) builds a peg-in transaction per the sBTC deposit flow → user's BTC locks on L1, sBTC mints to their Stacks address (this has a real confirmation delay — surface it, don't hide it)
2. User calls a `create-vault` function on `sats-vault.clar` with: sBTC amount, number of periods, blocks-per-period
3. Keeper service (Rust, off-chain) polls the Stacks API for vaults where `current-block >= next-trigger-block`, calls `sats-keeper-trigger`
4. `sats-keeper-trigger` calls Bitflow's swap function (via the core SDK or direct contract call) to convert the tranche of sBTC into stBTC, credits the vault, pays the keeper's bounty, advances `periods-completed`
5. Frontend dashboard reads vault state via read-only calls (Stacks.js) — no separate indexer strictly required for MVP, since vault state is queryable directly on-chain; add an indexer only if querying across many vaults becomes a bottleneck
6. Withdrawal calls `sats-withdraw` → unstakes from StackingDAO (stBTC → sBTC) → initiates sBTC peg-out per the sBTC withdrawal flow in the sbtc-docs repo

## 6. Suggested build order
1. Devnet setup with Clarinet; stub contracts for vault creation/state
2. sBTC peg-in/peg-out integration against testnet (do this early — it's the highest-uncertainty external dependency)
3. Vault + keeper-trigger contracts, with Bitflow swap wired in (start with sBTC↔USDCx if stBTC mainnet isn't live yet, swap the destination once stBTC ships)
4. Keeper service (Rust) — polling + trigger submission
5. Frontend: deposit flow, streaming-period picker, dashboard, withdraw
6. Zest borrow integration (only once stBTC-as-collateral is confirmed supported)

## 7. Known open dependencies (do not assume these are resolved)
- stBTC mainnet contract address/interface — not public at spec time
- Zest's stBTC collateral listing — not confirmed
- Bitflow SDK source repo accessibility — reported broken; may need direct REST integration instead
