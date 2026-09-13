# Q3 2026 Stacks Endowment — Project Overview

Two candidate products for the Q3 2026 Stacks Endowment grant cycle (applications Aug 31 – Sept 23, 2026). Both are Bitcoin-native, both give sBTC and Bitcoin Staking real utility, and both are designed to sit apart from adjacent ecosystem products (BitYield, Xverse's pooled Genesis Bond access) rather than duplicate them.

---

# 1. StackSats — Bitcoin Savings Autopilot

## One-line pitch
A beginner-friendly product that turns idle Bitcoin into a growing, still-usable position: deposit real BTC, let it stream automatically into staked Bitcoin yield via StackingDAO's stBTC, and optionally borrow against that balance via Zest Protocol — without ever needing to understand sBTC, Bitcoin Staking, or DeFi mechanics.

## Problem
Bitcoin holders who want yield today have two bad options: sell BTC (losing upside and triggering tax events) or manually navigate a stack of unfamiliar Stacks-native concepts (sBTC peg-in, Bitcoin Staking protocol bonds, liquid staking tokens, DEX routing) that are far from beginner-friendly.

## How it works — protocols involved

| Layer | Protocol | Role |
|---|---|---|
| Peg-in / peg-out | **sBTC** | Converts real BTC into a SIP-010 token smart contracts can act on, and back again on withdrawal. |
| Swap routing | **Bitflow** | Executes sBTC ↔ stBTC conversions during the streaming period. |
| Staking / yield | **StackingDAO (stBTC)** | Liquid staking token for a Bitcoin Staking (PoX-5) position; streamed sBTC is staked here. |
| Execution | **Permissionless keeper network** | Anyone can trigger each scheduled streaming transaction, earning a 0.1% bounty. |
| Optional utility | **Zest Protocol** | Users can supply stBTC as collateral and borrow a stablecoin without unstaking. |

## User flow
1. **Connect wallet** (Leather, Xverse)
2. **Deposit BTC** — sBTC peg-in happens invisibly (real Bitcoin-confirmation delay shown honestly, not hidden)
3. **Pick a streaming period** (e.g. 4/8/12 weeks), sensible default pre-selected
4. **Automatic streaming** — each interval, a keeper converts the next tranche of sBTC into stBTC via Bitflow + StackingDAO
5. **Dashboard** — total BTC deposited, stBTC balance / yield earned, in BTC terms
6. **Optional: borrow against it** via Zest, without unstaking
7. **Withdraw anytime** — one button unwinds stBTC → sBTC → native BTC

## Product principles
- BTC in, BTC out — sBTC and stBTC stay invisible implementation details
- No stablecoin leg (earlier bidirectional USDCx design dropped in favor of a single clear promise)
- Advanced complexity (custom intervals, borrowing) is opt-in, never default
- Bitcoin finality delays are shown honestly, not smoothed over

## Grant fit
- **Primary: Bitcoin Staking & sBTC Utility** — low-friction treasury tool for BTC holders
- **Secondary: Market Efficiency & Risk** — via the Zest borrowing integration
- **Distribution & Integrations** — the core thesis is bringing non-DeFi-native users into Stacks by hiding its complexity

## Differentiation vs. existing ecosystem players
- **sBTC Escrow** (Q1 grantee) doesn't overlap — different product category
- **BitYield** (a friend's project) already routes sBTC into Zest lending and native Dual Stacking via a strategy-picker UI. StackSats differs on two structural points, not positioning: (1) it starts from raw BTC and automates the sBTC peg-in, rather than assuming the user already holds sBTC; (2) it streams gradually into a *liquid* staking position (stBTC) rather than a one-time allocation into a locked native bond, which is what enables the Zest-borrowing feature without unstaking.
- **Xverse's pooled Genesis Bond access** (launched this week) is a wallet feature for individual access to the bond, not a dedicated streaming/automation product — worth monitoring as the closest adjacent competitor.

## Existing assets
- Full eight-document suite from the original StackSats design (spec, architecture, Clarity contract) — needs revision for the BTC-native pivot and removal of the USDCx leg
- Original Clarity contract for the bidirectional USDCx ↔ sBTC vault, to be adapted for BTC → sBTC → stBTC streaming

## Open questions / risks
- stBTC mint mechanics not fully public pre-mainnet — confirm against StackingDAO's docs once live
- stBTC is pre-mainnet (in audit as of writing)
- Zest stBTC listing not yet confirmed (stSTX precedent makes it likely, not guaranteed)
- Peg-in/peg-out UX needs real design work so "beginner-friendly" doesn't misrepresent wait times

---

# 2. BoostBTC — sBTC Yield & Leverage Vault *(working name)*

## One-line pitch
A dual-leg vault that makes sBTC itself directly productive — split between real-time Zest lending yield and StackingDAO staking yield — with an optional STX-locking boost mechanism and optional atomic leverage looping, for users who want more sophisticated yield than a simple savings product.

## Problem this solves
Most sBTC sits idle once minted — it's a wrapped receipt, not a working asset. Existing options (BitYield, manual DeFi use) require picking a single static strategy. There's also no mechanism on Stacks yet that rewards users for making a deeper commitment (locking STX) with a bigger share of yield — a pattern (vote-escrow boosting) that's proven on other chains but doesn't exist on Stacks.

## Core design decision: why sBTC is the base asset, not the boost lever
Two earlier versions of this idea were considered and rejected:
- **STX as the base asset, sBTC as the boost lever** — rejected because it makes sBTC the passive lever rather than the productive asset, undermining the sBTC-utility grant theme.
- **sBTC as both the base and the boost lever (deposit more sBTC to boost)** — rejected because depositing more of the same liquid asset just scales earnings linearly; it isn't a boost, since there's no distinct cost being paid that would justify redistributing yield in the depositor's favor.

The mechanism that actually works: **sBTC is the base, productive asset. STX-locking is a separate, illiquid commitment that earns a bigger share of the same yield pool.** This mirrors how vote-escrow boosting works on other chains (lock a governance/commitment token → boost yield on a separate productive asset) and is consistent with how PoX-5 already pairs STX with BTC at the protocol level.

## How it works — protocols involved

| Layer | Protocol | Role |
|---|---|---|
| Peg-in | **sBTC** | Entry asset — user deposits BTC, receives sBTC |
| Lend leg | **Zest Protocol** | A user-chosen % of sBTC is supplied directly to Zest for lending yield — the core sBTC-utility claim, no staking or locking required |
| Stake leg | **StackingDAO (stBTC)** | The remaining % converts to stBTC for Bitcoin Staking yield |
| Swap routing | **Bitflow** | Used during leverage-loop iterations to convert borrowed stablecoin back into sBTC |
| Boost lever | **Own ve-style lock contract** | User locks extra STX for a chosen duration, receiving a decaying, non-transferable weight that boosts their share of the vault's combined yield |
| Leverage (optional) | **Zest Protocol (collateral)** | The vault's blended share token is supplied as collateral, a stablecoin borrowed, swapped back to sBTC, and re-split into the same lend/stake ratio — repeated atomically to a target multiplier |
| Execution | **Rust indexer/keeper** | Tracks epochs, computes boost-weighted yield shares, monitors leverage health factor |

## User flow
1. **Deposit BTC** → peg-in to sBTC
2. **Choose lend/stake split** — e.g. 60% stays as sBTC on Zest, 40% converts to stBTC via StackingDAO
3. **Optional: lock extra STX** for a chosen duration to set a boost multiplier
4. **Optional: set a leverage target** — vault supplies its blended share as Zest collateral, borrows a stablecoin, swaps to sBTC via Bitflow, re-splits per the chosen ratio, repeats atomically to the target multiplier
5. **Yield redistribution** — each epoch, the vault totals real yield earned across both legs (Zest lending APY + StackingDAO staking APY) and distributes it weighted by boost multiplier; unboosted depositors get correspondingly less than flat pro-rata
6. **Dashboard** — sBTC deposited, lend/stake split, boost multiplier, leverage level, blended net APY, liquidation price if leveraged
7. **Automated risk monitoring** (if leveraged) — keeper watches health factor, alerts or auto-deleverages before liquidation
8. **Unwind** — leverage repaid first, blended share redeemed back to sBTC from both legs, pegged out to native BTC

## Money flow summary
- Yield paid to boosted depositors is **not created from nothing** — it's a zero-sum redistribution of the vault's real, existing yield (Zest lending interest + StackingDAO staking rewards), shifted toward depositors who locked more STX for longer, at the expense of those who didn't.
- Both the sBTC/stBTC deposit and the STX boost-lock happen inside the vault's own contracts, so the platform has first-party visibility into locked amounts — no reliance on reading external chain state for the boost mechanic to function.

## Grant fit
- **Primary: Bitcoin Staking & sBTC Utility** — sBTC earns real yield directly via the lend leg, independent of staking
- **Market Efficiency & Risk** — the leverage-loop component and its health-factor monitoring
- **Distribution & Integrations** — composes StackingDAO, Zest, and Bitflow together rather than duplicating any of them

## Differentiation vs. BitYield
- BitYield lets a user manually pick one static strategy from a list. BoostBTC blends two yield sources simultaneously (lend + stake) in one position, and adds a boost mechanism BitYield has no equivalent of.
- BitYield's staking option routes into locked native Dual Stacking. BoostBTC's stake leg uses stBTC, keeping the position liquid.

## Key dependency / open risk
- **The leverage-loop feature requires Zest to accept the vault's blended share token as collateral** — this is a listing decision on Zest's side, not something controllable unilaterally. Worth an early conversation with Zest if this direction is pursued. The lend leg and boost mechanism do not depend on this and can ship independently of leverage support.
- stBTC pre-mainnet status and mint mechanics carry the same open questions noted under StackSats.
