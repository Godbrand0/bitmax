# BoostBTC — Build Specification *(working name)*

Status: pre-implementation spec, written for a coding agent to start from.

## ⚠️ Read this before building the leverage-loop component
**Zest Protocol announced "Stacks Vaults" on July 28, 2026 — its first vault is an automated stBTC looping vault**: a user deposits stBTC, the vault borrows sBTC against it, stakes the borrowed BTC into more stBTC, and repeats to compound yield. This is functionally the same mechanism as the leverage-loop feature specified below (section 4), and it's built by Zest itself — the exact protocol this feature depends on for collateral. Before building the leverage-loop contracts:
- Check whether Zest's Stacks Vaults is live and confirm what it actually offers
- If it substantially overlaps, consider dropping the leverage-loop component from this project and shipping only the dual-leg vault + STX-lock boost (sections 2–3), which do not overlap with anything Zest has announced
- If pursuing leverage anyway, the differentiation would need to be the *combination* with the boost mechanism, not the looping itself

## 1. What we're building
A dual-leg vault: user deposits BTC → sBTC, splits it between direct Zest lending (sBTC stays liquid, earns lending APY) and StackingDAO staking (converts to stBTC, earns staking APY). Users can lock extra STX in a separate contract to boost their share of the vault's combined yield — a vote-escrow-style mechanism, not free yield, but a redistribution of the real yield the vault already earns. Full flow and design rationale (including why STX-locking was chosen as the boost lever over two rejected alternatives): see `q3-grant-project-overview.md`, section 2.

## 2. Tech stack
Same as StackSats — Clarity + Clarinet for contracts, Stacks.js for frontend, Rust for the keeper/epoch-accounting service. See `stacksats-build-spec.md` section 2 for tooling references; not repeated here.

## 3. Protocol integrations

| Protocol | What we call | Reference |
|---|---|---|
| **sBTC** | Entry asset (BTC peg-in) and lend-leg asset | `stacks-network/sbtc-docs` on GitHub — see StackSats spec for the same reference, identical integration surface |
| **Zest Protocol** | Lend leg (supply sBTC directly for yield) + optional leverage collateral | No confirmed public SDK/repo found at spec time — integration will likely be direct contract calls against Zest's lending market contracts; **get the actual contract principals and ABI from Zest's own docs/app before writing code.** Precedent for collateral-asset integration: StackingDAO's "Borrowing and Lending on Zest with stSTX" guide shows the general supply/borrow pattern (supply asset → borrow stablecoin up to an LTV cap, e.g. ~50% for stSTX). |
| **StackingDAO (stBTC)** | Stake leg | Same caveat as StackSats spec: stBTC was in audit as of Aug 2026, contract address/interface not public at spec time — confirm before building |
| **Bitflow** | Swap routing during leverage-loop iterations only (not needed for the core dual-leg vault) | npm `@bitflowlabs/core-sdk`; REST specs at `bff.bitflowapis.finance`. See StackSats spec for the same caveat about the SDK source repo's accessibility. |
| **Own ve-lock contract** | STX boost mechanism | New contract, no external protocol dependency — this is the one component with no external integration risk |

## 4. Contracts to write

- `boost-vault.clar` — holds the dual-leg position: tracks each depositor's sBTC-on-Zest balance, stBTC balance, and issues a blended vault-share balance representing both
- `ve-stx-lock.clar` — separate contract for locking raw STX; issues a non-transferable, time-decaying weight per depositor (Curve-style veToken pattern: `weight = amount_locked * (unlock_block - current_block) / max_lock_duration`)
- `boost-epoch-distributor.clar` — at each epoch, reads total yield accrued across both legs (Zest lending interest + StackingDAO staking rewards) and each depositor's `ve-stx-lock` weight, computes and credits each depositor's boosted share
- `leverage-loop.clar` *(build only if pursuing leverage after resolving the Zest Stacks Vaults question above)* — orchestrates: supply blended share as Zest collateral → borrow stablecoin → swap to sBTC via Bitflow → re-split into lend/stake per the vault's ratio → repeat to target multiplier, atomically

## 5. Data flow

1. User deposits BTC → sBTC peg-in (same flow as StackSats)
2. User sets lend/stake split (e.g. 60/40) → `boost-vault.clar` supplies the lend portion to Zest and routes the stake portion through Bitflow into StackingDAO for stBTC
3. (Optional) user locks STX in `ve-stx-lock.clar` for a chosen duration → receives a decaying weight
4. Each epoch, `boost-epoch-distributor.clar` totals real yield from both legs and redistributes it weighted by `ve-stx-lock` balance — unboosted depositors get less than flat pro-rata; boosted depositors get more
5. (Optional, pending the Zest Vaults question) `leverage-loop.clar` supplies the blended share as collateral, loops per section 4
6. Withdrawal: unwind any leverage first (if present) → redeem blended share back to sBTC from both legs → sBTC peg-out to native BTC

## 6. Suggested build order
1. `ve-stx-lock.clar` first — no external dependencies, fully testable on devnet immediately, and it's the one component confirmed not to overlap with anything else in the ecosystem
2. sBTC peg-in/out (shared with StackSats — if building both projects, this should be a shared module, not duplicated)
3. `boost-vault.clar` lend leg only (Zest integration) — ship this as a standalone MVP: "boosted sBTC lending" without the staking leg, to get something live fastest
4. Add the stake leg once stBTC mainnet details are confirmed
5. `boost-epoch-distributor.clar` — epoch accounting and weighted distribution
6. Resolve the Zest Stacks Vaults question before starting `leverage-loop.clar` at all

## 7. Known open dependencies (do not assume these are resolved)
- **Zest's Stacks Vaults may make the leverage-loop component redundant — resolve this first, see the warning at the top of this file**
- stBTC mainnet contract address/interface not public at spec time
- Zest contract principals/ABI not sourced yet — need direct confirmation from Zest, no public SDK found
- Whether Zest will accept a third-party vault-share token as collateral at all (required for leverage-loop only, not for the lend leg, which just supplies sBTC directly like any other Zest user)
