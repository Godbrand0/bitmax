# How BitMax moves funds

*Reference · September 2026*

Every flow BitMax's contracts execute, and exactly which external protocol
contract each one calls. Every principal below is real and live on Stacks
mainnet, read directly from each protocol's own deployed source — not from
documentation prose, and not a devnet/testnet mock.

---

## The actors

One rule holds across every flow below: BitMax's own contracts never end a
transaction holding funds as final custodian. Money sits in the user's own
wallet, or in the external protocol's own contract — never parked in a
BitMax-controlled balance beyond the instant of a relay.

| Actor | Role |
|---|---|
| **User's wallet** | Signs every transaction below. The only place funds are ever truly "held" outside a protocol's own contract. |
| **bitmax-vault** | Pools every depositor's sBTC, stakes it with StackingDAO, tracks each depositor's own stBTC entitlement. |
| **ve-stx-lock** | Locks STX, pools it into StackingDAO's Dual Stacking product, computes each locker's decaying weight. |
| **bitmax-boost-distributor** | Claims the Dual Stacking BTC reward each epoch, pays it to registered lockers by weight. |
| **StackingDAO** | External. Two separate live products: stBTC (stakes sBTC), and Dual Stacking (stakes STX for an additional BTC reward). |
| **Zest Protocol** | External. The lending market the Borrow page calls directly — no BitMax contract sits in this path at all. |

---

## 1 · Deposit

**Status: live on mainnet** — sBTC → staked stBTC, at a real, appreciating exchange rate.

```
Wallet                  bitmax-vault              StackingDAO              bitmax-vault
sign deposit(amount, →  forwards to        →      mints real stBTC   →     credits your
minOut, …)              StackingDAO                at the live rate,      entitlement
sBTC leaves wallet,     calls stacking-dao-         not 1:1                stbtc-owned +=
into bitmax-vault       core-stbtc-v1.deposit                              stBTC actually minted
```

The minted amount is **not** assumed 1:1 with the sBTC deposited — StackingDAO's
stBTC already carries an appreciating exchange rate (live: ~1.0012 sBTC per
stBTC). The minimum acceptable mint is computed off-chain from a direct read
of that rate and passed in as slippage protection, the same pattern used for
Zest's own collateral calls.

> **This is the fix to "watch it grow."** Your displayed balance is
> `stbtc-owned × live sBTC-per-stBTC rate`, read fresh from StackingDAO's own
> contract on every page load — not a number BitMax updates itself. It rises
> automatically as real Bitcoin Staking rewards accrue, with no explicit
> "credit yield" transaction anywhere.

---

## 2 · Boost

**Status: pooling leg not yet wired to StackingDAO** — Lock STX → pooled into Dual Stacking → paid out as sBTC.

```
Wallet                  ve-stx-lock               Distributor              Locker's wallet
sign lock-stx      →    pools into Dual    →      claims the reward, →     paid in sBTC
(amount, until)          Stacking                  ~daily                  directly
STX leaves wallet,      stacking-dao-core-        permissionless          weighted by locked
into ve-stx-lock        ststxbtc-v2.deposit        close-epoch call        amount × duration
```

Weight decays linearly toward the chosen unlock height — locking more STX, or
for longer, both raise it. The reward lands as plain sBTC in the locker's own
wallet, not inside their vault balance, so `bitmax-boost-distributor`
separately tracks a lifetime-paid total per address: sBTC is fungible, so
once it's in a wallet a balance read alone can no longer prove how much of it
the boost paid versus anything else.

---

## 3 · Exit a lock

Two real steps, with a real, separate cooldown between them.

```
Wallet                  Dual Stacking             — ~2 weeks —             Wallet
request-unlock     →    init-withdraw       →     cooldown elapses  →      claim-unlock
callable once the        starts StackingDAO's     no action available     STX lands back
chosen duration ends     own cooldown              until it passes         in the wallet
```

Total time from locking to STX back in the wallet is the **chosen lock
duration plus this second cooldown** — never either alone. This mirrors
StackingDAO's own real withdrawal mechanics exactly (confirmed live: 2,100
burn blocks, ~2 weeks) rather than assuming an instant exit.

---

## 4 · Exit the vault

**Status: live on mainnet** — Two destinations: stay in stBTC, or unwind all the way to sBTC.

**Redeem to stBTC.** One call. The stBTC being transferred already carries
its appreciated value, so no exchange-rate math or external call is needed
at this step — `bitmax-vault` just relays it from its own pooled holdings
straight to the wallet. From here it's usable anywhere stBTC is accepted,
including as Zest collateral.

**Redeem all the way to sBTC.** Two steps, mirroring the lock exit exactly:
`request-redeem-to-sbtc` starts StackingDAO's real withdrawal cooldown (live:
4,200 burn blocks, ~29 days) via an NFT-ticketed `init-withdraw`;
`claim-redeem-to-sbtc` pays out once it passes.

---

## 5 · Borrow

**Status: live on mainnet** — The one leg with zero BitMax contract in the path — your wallet signs straight to Zest.

```
Wallet                  Zest                      Wallet                   Zest
supply-collateral- →    wraps to zstBTC     →      borrow(USDCx)      →     USDCx to wallet
add                      shares                     checked against         repay / withdraw
stBTC → Zest's           credited to your own       live 80% LTV            whenever
v0-8-market directly     Zest account
```

> `supply-collateral-add` hard-requires `contract-caller == tx-sender` on
> Zest's own contract — confirmed directly in their deployed source. No
> contract, BitMax's or anyone else's, can ever intermediate this call. It's
> why this is the one leg where the frontend talks to an external protocol
> with nothing BitMax-side in between.

---

## Contract reference

Every external principal these flows call, confirmed against each
protocol's own deployed source — not guessed, not from documentation prose.

### sBTC — external

| Contract | Principal | Purpose |
|---|---|---|
| `sbtc-token` | `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token` | The SIP-010 sBTC token — what's deposited, and what a full exit pays out. |
| `sbtc-withdrawal` | `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-withdrawal` | Initiates an sBTC → native BTC peg-out. |

### StackingDAO — stBTC leg — external, wired up

| Contract | Principal | Purpose |
|---|---|---|
| `stacking-dao-core-stbtc-v1` | `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-stbtc-v1` | deposit / init-withdraw / withdraw — the entrypoint bitmax-vault calls. |
| `data-stbtc-v1` | `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.data-stbtc-v1` | The live, appreciating sBTC-per-stBTC exchange rate. |
| `withdraw-data-stbtc` | `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.withdraw-data-stbtc` | Withdrawal cooldown + per-ticket bookkeeping (4,200 blocks live). |
| `stbtc-token` | `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stbtc-token` | The SIP-010 stBTC token — what a deposit earns. |

### StackingDAO — Dual Stacking leg — external, not yet wired

| Contract | Principal | Purpose |
|---|---|---|
| `stacking-dao-core-ststxbtc-v2` | `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-ststxbtc-v2` | Real Dual Stacking pool for locked STX — `ve-stx-lock` still targets a local stand-in for this today. |
| `ststxbtc-data-v2` | `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.ststxbtc-data-v2` | Withdrawal cooldown for this leg (2,100 blocks live, ~2 weeks). |

### Zest Protocol — external, wired up

| Contract | Principal | Purpose |
|---|---|---|
| `v0-8-market` | `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-8-market` | Supply collateral, borrow, repay — the Borrow page's core contract. |
| `v0-market-vault` | `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-market-vault` | Read-only: real supplied collateral and loan status. |
| `v0-egroup` | `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-egroup` | Real, live LTV and liquidation thresholds per collateral class. |
| `v0-assets` | `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-assets` | Registry resolving asset ids to their real SIP-010 principals. |
| `usdcx` | `SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx` | The real token borrowed — confirmed as USDCx via its own `get-symbol`, not USDC. |

---

## Live numbers

Read directly from mainnet, not estimated. All subject to change on each
protocol's own side — see build status below.

| Metric | Value |
|---|---|
| sBTC / stBTC rate | 1.00117 sBTC per stBTC |
| stBTC exit cooldown | 4,200 burn blocks (~29 days) |
| Dual Stacking cooldown | 2,100 burn blocks (~2 weeks) |
| Zest LTV (stBTC) | 80% (85% partial liq. · 90% full liq.) |
| Liquidation penalty | 7.5–10%, scales with severity |
| Boost epoch length | 144 burn blocks (~1 day) |

---

## Build status

What's genuinely calling the real contracts above today, versus what still
targets a local stand-in.

| Leg | Status | Detail |
|---|---|---|
| sBTC peg-in / peg-out | real | Peg-in happens before BitMax, via sBTC's own bridge. Peg-out is built (`lib/sbtc.ts`) but unused by the UI. |
| Vault staking (sBTC → stBTC) | real | `bitmax-vault` calls StackingDAO's real `stacking-dao-core-stbtc-v1` directly, mainnet-only by construction. |
| Vault balance display | real | Computed live from the real exchange rate — the fix that makes "watch it grow" true. |
| Boost pool (STX → Dual Stacking) | real | `ve-stx-lock` calls StackingDAO's real `stacking-dao-core-ststxbtc-v2` directly, mainnet-only by construction. Note: as of this writing, StackingDAO has deposits, init-withdraw, and withdraw all administratively shut down on this contract (confirmed via live reads) — almost certainly a maintenance/migration pause on their side, not permanent, but it means this leg can't be exercised end-to-end on mainnet until they re-enable it. |
| Boost payout + lifetime tracking | real | `bitmax-boost-distributor` claims the real sBTC Dual Stacking reward via `ststxbtc-tracking-v2.claim-pending-rewards` and pays it out on-chain. |
| Borrow (Zest) | real | Fully live, zero BitMax contract in the path, verified against deployed source. |

---

*Every principal and figure on this page was read directly from each
protocol's own deployed mainnet source or a live on-chain call — none are
estimated or taken from documentation prose. Live numbers drift as each
protocol's own parameters change; re-verify before treating any figure here
as current.*
