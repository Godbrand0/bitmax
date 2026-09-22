# BitMax — Stacks Endowment Q3 2026 Application

**Track:** Getting Started · **Requested:** $10,000 · **Split:** 20 / 30 / 50

> **Before submitting — two things only you can fill in:**
> 1. Replace every `[VERCEL URL]` with your live deployment URL.
> 2. Confirm the GitHub repo `github.com/Godbrand0/bitmax` is set to **public**. Reviewers will click it.

---

## 02 — Project

### Project name
```
BitMax
```

### Website or repo
```
https://github.com/Godbrand0/bitmax — [VERCEL URL]
```

### Primary category
Pick the DeFi / Bitcoin-finance option (the field currently defaults to **AI**, which is wrong — change it). If a "Bitcoin Staking & sBTC Utility" option exists, use that.

### Secondary category
Bitcoin Staking / Liquid staking, if available.

### Project Description
```
BitMax is a Bitcoin yield vault on Stacks with one feature nothing else in the
ecosystem has: locking STX earns you a real, additional Bitcoin reward on top of
your staking yield — funded by actual Dual Stacking rewards, not by taking yield
away from anyone else.

What exists today, verifiable right now: all four BitMax contracts are deployed
and live on Stacks testnet under ST19XTHQ3SVST2NCYPTHP2W31MFDQDBFG3W5VFJ8Z
(bitmax-vault, ve-stx-lock, bitmax-boost-distributor, sip-010-trait — each
confirmed on the Hiro explorer). 23 contract tests and 7 keeper tests pass. A
four-page web app is deployed at [https://github.com/Godbrand0/bitmax] with a working wallet connection,
deposit flow, boost page, embedded Zest borrowing, and a public docs page listing
every contract address the app touches. Every transaction is gas-sponsored, so a
user never needs STX in their wallet just to pay a fee.

The integrations are real, not planned. bitmax-vault calls StackingDAO's live
stacking-dao-core-stbtc-v1. ve-stx-lock pools locked STX into StackingDAO's real
stacking-dao-core-ststxbtc-v2 Dual Stacking product. The borrow page calls Zest's
live v0-8-market contract directly. Each address was traced through the protocol's
own deployed source, not copied from documentation.

What the grant funds: moving all of this from testnet to Stacks mainnet, running
the boost mechanism end-to-end with real Dual Stacking rewards paid out in real
sBTC, and a closed beta with Bitcoin holders who have never used DeFi — to find
out whether the flow actually works for them without me sitting next to them.

What reviewers should understand first: the only genuinely new code here is the
STX-locking boost mechanism. sBTC handles the Bitcoin peg. StackingDAO handles
staking. Zest handles borrowing. BitMax composes three live protocols and adds one
missing piece — a commitment-based boost, which has no implementation anywhere on
Stacks today.
```

---

## 03 — Audience and ecosystem fit

### Primary audience
```
Bitcoin holders who want their BTC to earn without selling it, and who have never
used a DeFi application. They own Bitcoin, they have heard that yield exists on
Stacks, and they stop at the first screen that asks them to understand sBTC,
peg-ins, liquid staking tokens, or gas fees.

The secondary audience is STX holders looking for a reason to commit their STX
for longer. BitMax gives them one: locking STX pays a Bitcoin-denominated reward
through StackingDAO's Dual Stacking, routed back to them as sBTC.

The product is written for the first group. The interface says "your Bitcoin-backed
balance," "you put in," "you've earned," and "boost." The words sBTC, stBTC,
vote-escrow, and epoch stay out of the main flow. Anyone who wants the mechanics
can read the docs page, which lists every contract address with an explorer link.
```

### Audience segmentation
```
1. Non-technical Bitcoin holders — the core user. Own BTC, want yield, will not
   learn DeFi to get it. They need a deposit button and an honest number.

2. Existing sBTC holders with idle balances — already crossed the hardest barrier
   (the peg-in) but have nothing productive to do with the result. BitMax starts
   exactly where they already are: deposit sBTC, earn staking yield.

3. STX holders seeking Bitcoin-denominated yield — the boost side. They lock STX,
   it is pooled into StackingDAO's real Dual Stacking product, and the Bitcoin
   reward it earns is paid back to them in sBTC, split by lock weight.

4. Stacks DeFi users who want more than a base rate — people who already use
   Zest or StackingDAO directly and want a reason to go deeper than a flat
   deposit.

5. Ecosystem protocols as indirect beneficiaries — every BitMax deposit becomes
   StackingDAO TVL, every STX lock becomes Dual Stacking participation, and every
   redeemed stBTC balance is usable as Zest collateral. BitMax does not compete
   with any of them for deposits; it routes users into them.
```

### Why Stacks?
```
This product cannot exist anywhere else, and that is not a positioning claim —
it is three specific dependencies.

sBTC is what makes it possible at all. It is the only way real Bitcoin becomes a
token a smart contract can act on and then convert back to Bitcoin. Without
sBTC's peg, "deposit Bitcoin, earn yield, withdraw Bitcoin" is a custodial
promise rather than a contract.

Bitcoin Staking (PoX-5) is what makes the yield Bitcoin-denominated. On other
chains, "Bitcoin yield" means lending wrapped BTC and being paid in that chain's
own token. On Stacks the reward is paid in Bitcoin, because the consensus
mechanism itself pays in Bitcoin. The boost mechanism depends on this directly:
locked STX earns a BTC-denominated Dual Stacking reward through StackingDAO's
stacking-dao-core-ststxbtc-v2, which is why locking STX can pay a Bitcoin reward
at all. There is no equivalent primitive elsewhere.

Clarity is what makes it safe enough for me to ship solo. The language is
decidable, has no reentrancy by construction, and can read Bitcoin state
natively. ve-stx-lock's decaying weight and the distributor's epoch accounting
are exactly the kind of arithmetic where a Solidity reentrancy bug would end the
project. Clarity removes that category of failure rather than asking me to guard
against it.

There is also a timing reason. stBTC only reached mainnet this quarter. A boost
layer built on a primitive that is weeks old is the sort of early composability
that stops being available later.
```

### Maintenance plan
```
I maintain it. I am the sole developer and this is the project I am building, not
a side experiment — the repo has 31 commits of continuous work, including several
full redesigns where an approach failed review and was replaced rather than
patched over.

Practically, after the grant:

Code stays public at github.com/Godbrand0/bitmax under an open license. Issues are
the public support channel, and I respond there.

The keeper service is the one piece that needs to stay running. It is a small
TypeScript poller that triggers close-epoch permissionlessly. If it stops, nothing
breaks and no funds are affected — epochs simply do not close until someone calls
it, and anyone can. That was a deliberate design choice so the product does not
depend on my uptime.

The contracts have no admin key over user funds. set-boost-distributor is
owner-only and one-shot; after it is set once it cannot be repointed. There is no
pause, no upgrade, no withdrawal path for me. Users redeem to their own wallets at
any time.

Ongoing cost after the grant is the gas sponsorship wallet and hosting. I will
fund the sponsor wallet myself at beta scale, and per-account spend caps are on the
roadmap before mainnet — the contract allowlist already stops arbitrary abuse, but
not a determined spammer.


```

### Ecosystem fit
```
The Foundation named three Q3 priorities: shipping Bitcoin Staking, building
liquid-staking infrastructure around stBTC across DeFi primitives, and expanding
the range of Bitcoin-native financial products. BitMax is the second and third of
those in one build.

It is liquid-staking infrastructure around stBTC specifically: sBTC goes in,
StackingDAO's live stBTC contract stakes it, the user holds a real transferable
stBTC balance when they redeem, and that balance is usable as Zest collateral
without BitMax needing Zest to list anything new. That last point was a design
decision made to remove a dependency, not a happy accident.

It composes instead of duplicating. The Endowment explicitly does not fund
projects that rebuild working infrastructure. BitMax writes no token, no lending
market, no DEX, and no staking pool. It writes one contract that does something
nobody has built here: vote-escrow style boosting.

On overlap, two projects are close enough to name directly.

Zest's Stacks Vaults (announced July 2026) is an automated stBTC looping vault.
An earlier version of BitMax had a leverage loop and would have duplicated it, so
that component was cut. BitMax never loops, never re-borrows against its own
position, and generates no leverage-driven yield.

BitYield, funded in Q2 2026, routes sBTC into Zest lending and locked native Dual
Stacking through a strategy picker. It has no boost or commitment mechanism, and
its staking leg locks the position. BitMax keeps the position liquid via stBTC and
adds the boost layer, which is the part with no analog anywhere in the ecosystem.

Xverse's pooled Genesis Bond access is a wallet-level feature for bond access, not
a yield product, and is not a competitor.
```

---

## 04 — Risk and prior history

### Referral source
```
Through the Stacks ecosystem directly. I completed Stacks Ascent Level 1 in 2025
and received a $250 grant for it. In 2026 I was part of the Stacks Validate cohort,
which is where I learned to identify target users and build for them specifically —
the plain-language interface in this project is a direct result of that program. I
also applied to the Q2 2026 Endowment cycle with a different project (Taxify) and
was not selected. This is my third engagement with the programs and my second
Endowment application.
```

### Risk disclosure
```
Delivery risk — single developer. I am building this alone. If I am unavailable,
progress stops. This is mitigated by the scope being genuinely small (one new
contract mechanism, three live protocols composed) and by everything being public
and documented as I go, but it is a real risk and I am not going to pretend
otherwise.

Technical risk — StackingDAO's Dual Stacking product is currently paused.
As of this application, StackingDAO has deposits, init-withdraw, and withdraw
administratively disabled on stacking-dao-core-ststxbtc-v2. I confirmed this with
live on-chain reads, not by assumption. This almost certainly indicates
maintenance or a migration, but it means the boost leg cannot be exercised
end-to-end on mainnet until they re-enable it, regardless of how correct my
integration is. This is the single biggest external dependency in the project.
Milestone 2 carries an explicit contingency for it: if the product is still paused
at that date, I deliver the same integration verified against a Clarinet devnet
fork with the real contract interfaces, plus documented evidence of the pause, and
the live payout follows when StackingDAO reopens.

Technical risk — Zest v2 is mainnet-only. There is no testnet deployment, so the
borrow integration cannot be tested anywhere but mainnet with real funds. The app
already gates the borrow page on network rather than letting a user submit a
doomed transaction, but full verification requires a funded mainnet wallet holding
real stBTC.

Technical risk — no audit. These contracts have not been audited. I am not going
to invite users to deposit large amounts into unaudited contracts, so the beta will
be capped at small deposit sizes and stated as such to participants. An audit is a
follow-on Builder Grant item, not something $10,000 covers honestly.

Operational risk — gas sponsorship wallet. Every user transaction is paid by a
sponsor wallet. The API route already verifies that each transaction targets a
BitMax contract or Zest's market before sponsoring, and rejects anything else — I
verified this by hand-crafting a call to an unrelated contract and confirming a 403
before any signing. But there is no rate limiting or per-account spend cap yet, so a
determined user could drain the wallet with many small legitimate-looking calls.
This must be added before a mainnet sponsor key is funded meaningfully, and it is
in Milestone 1's scope.

Technical risk — the contracts are mainnet-only by construction and cannot be
fully tested before they are live. This is the consequence of a deliberate design
decision. The vault and lock call StackingDAO's real contracts as trait-typed
parameters, each asserted equal to its known mainnet principal before any state
changes — so a caller cannot pass a fake contract and trick the vault into
crediting stBTC with no real backing. Clarity offers no environment-conditional
way to keep a devnet stand-in alive alongside that, because a relative contract
call can only ever resolve to a contract the same deployer controls. The result is
that every deposit path fails the pinned-principal assertion anywhere except
mainnet, which is correct behaviour but means local test coverage cannot reach the
external legs at all. Milestone 1 is where those paths execute against live
contracts for the first time, and it is the most likely place for surprises —
StackingDAO's real fee behaviour in particular.

Market risk. Bitcoin Staking yields are variable and not guaranteed. The app makes
no APY claims anywhere and does not display a projected rate, because I cannot
verify one yet.

Legal and regulatory. BitMax is non-custodial: users sign every transaction from
their own wallet, funds are redeemable to their own wallet at any time, and there
is no admin withdrawal path in the contracts. There is no token, no sale, and no
fundraise. I am not aware of a material legal risk in this structure, but I am not
a lawyer and would welcome the Foundation's guidance if they see one.
```

### Prior grants
```
Stacks Ascent — Level 1, $250, Stacks Foundation, 2025. Completed. Level 1
deliverables were met and the grant was paid.

No other grants from any funder.
```

### Prior Stacks work
```
Stacks Ascent (2025) — completed Level 1 and received the $250 grant.

Stacks Validate cohort (2026) — participated in the program focused on finding
target users, building specifically for them, and reducing product friction. This
directly shaped BitMax's interface: the plain-language copy, the three-number
balance card ("total / you put in / you've earned"), and the decision to sponsor
gas so users never need STX just to transact are all consequences of that cohort
rather than design preferences.

Q2 2026 Endowment application — applied with Taxify, a different project. Not
selected. I took the outcome as a signal to build further before applying again,
which is why this application arrives with contracts already live on testnet
rather than as a proposal.

BitMax (2026, current) — four Clarity contracts live on Stacks testnet under
ST19XTHQ3SVST2NCYPTHP2W31MFDQDBFG3W5VFJ8Z, 30 passing tests across contracts and
the keeper service, a deployed four-page web application, and verified integrations
against StackingDAO's and Zest's live mainnet contracts.
```

---

## 05 — Track and qualification ✅ (already complete)
Getting Started · $10,000 · Open track, no gates.

---

## 06 — Track-specific context (Getting Started)

### What are you proposing to explore or build?
```
A Bitcoin yield vault where committing STX earns you additional Bitcoin.

The core flow is three steps. Deposit sBTC into bitmax-vault, which stakes it
through StackingDAO's live contract so it earns Bitcoin Staking rewards.
Optionally lock STX in ve-stx-lock for a chosen duration, which pools that STX
into StackingDAO's real Dual Stacking product. Each epoch,
bitmax-boost-distributor claims the Bitcoin-denominated reward that pooled STX
earned and pays it out in sBTC to lockers, split by lock weight.

The thing being explored is the boost mechanism specifically. Vote-escrow style
boosting — lock a commitment asset for longer, earn a larger share — is proven on
other chains but has never been implemented on Stacks. The open question is
whether it works when the boost reward is Bitcoin-denominated and sourced from
PoX rather than from token emissions.

One design decision defines the whole project. An earlier version funded the boost
by redistributing the vault's own base yield: lockers got more because non-lockers
got less. I cut it, because it meant a non-locking depositor was strictly better
off depositing somewhere else — which is not a product, it is a tax. The current
design funds the boost from a genuinely separate yield source: the Dual Stacking
rewards that locked STX earns on its own. Depositors who never lock are completely
unaffected either way. Nobody loses for someone else to gain.

What I am not building: no token, no lending market, no DEX, no leverage loop, no
staking pool. Those all exist on Stacks already and work well. The only new
contract logic is the lock and the distribution.
```

### What user or ecosystem problem motivates the project?
```
Two problems, and they are connected.

The user problem: a Bitcoin holder who wants yield has to become a DeFi user
first. They must understand what sBTC is, perform a peg-in, learn what a liquid
staking token is, acquire STX purely to pay transaction fees, and navigate
interfaces written for people who already know all of this. Most people stop at
step one. The Bitcoin does not move because the interface asked too much, not
because the yield was unattractive.

BitMax's response is concrete rather than rhetorical. Gas is sponsored, so a user
never needs to acquire STX to transact. The dashboard shows three plain numbers —
total, what you put in, what you have earned — instead of an APY table. The word
sBTC appears in the trust strip and the docs; the flow itself says "your
Bitcoin-backed balance." Every contract address the app touches is listed publicly
with an explorer link, so "non-custodial" is checkable rather than asserted.

The ecosystem problem: there is no reason on Stacks to commit rather than
participate. A user deposits, earns the going rate, and leaves when a better rate
appears. Every mature DeFi ecosystem eventually builds a commitment layer — lock
for longer, earn more — because it converts mercenary liquidity into a stable base.
Stacks has no such mechanism anywhere. STX locking exists for stacking, but there
is nothing that lets a protocol reward the people who commit to it specifically.

BitMax's boost is that mechanism, built the honest way: the extra reward comes
from extra work the locked STX actually does, through PoX, paid in Bitcoin. It is
not inflation and it is not taken from anyone. That is the part I believe is worth
proving out, and the part that generalizes beyond this one product.
```

### Why is Stacks the right environment for this work?
```
Because the boost mechanism is only possible here.

The boost pays a Bitcoin reward for locking STX. That is possible because PoX pays
Bitcoin for committing STX at the consensus layer, and StackingDAO's Dual Stacking
product exposes it as something a contract can pool into. On every other chain,
locking a governance token pays that same token, which means the "reward" is
inflation. Here, locking STX earns actual Bitcoin. No other chain has a consensus
mechanism that pays in Bitcoin, so this specific design has no port.

sBTC is the second requirement. It is what lets real Bitcoin enter a contract and
return as real Bitcoin, which is the difference between a non-custodial product and
a promise. The withdrawal path is an on-chain contract call, not a request to a
company.

Clarity is the third. Building a lock with decaying weight plus epoch-based
distribution alone, unaudited, in a language with reentrancy would be
irresponsible. Clarity's decidability and lack of reentrancy remove that entire
failure class by construction. Being able to read Bitcoin block height natively
also matters directly here — lock durations and epoch gates are measured against
Bitcoin blocks, not Stacks blocks, which is what makes "two weeks" mean two weeks.

And the composability is already there and already live. StackingDAO shipped stBTC
to mainnet this quarter. Zest's market is live and accepts stBTC as collateral —
I confirmed asset id 12 is a registered general-purpose collateral asset by reading
their deployed source, not their docs. Every protocol BitMax needs exists, works,
and is running today. There is nothing to wait for except my own build.
```

### What have you already validated, prototyped, or learned?
```
Deployed and verifiable right now:

Six contracts live on Stacks testnet under ST19XTHQ3SVST2NCYPTHP2W31MFDQDBFG3W5VFJ8Z
— the three BitMax contracts (bitmax-vault, ve-stx-lock, bitmax-boost-distributor),
the SIP-010 trait, and two test-double tokens used only by the test suite. All
deployments succeeded and are viewable on the Hiro explorer.

The three BitMax contracts contain no test-double code paths. Every external call
goes to StackingDAO's or sBTC's real mainnet principal, passed as a trait-typed
parameter and asserted against the known address before any state change. The
vault credits the exact stBTC amount StackingDAO's contract returns from the
deposit, so stBTC's appreciating exchange rate is handled correctly rather than
assumed to be 1:1. The test doubles exist for the test suite, not as a fallback
the production path can reach.

23 contract tests and 7 keeper tests passing, with clarinet check clean. Coverage
includes lock weight decay across block heights, early-unlock rejection,
principal-versus-yield accounting, idempotent registration, epoch-too-soon
rejection, and a weight-proportional split across a locked/locked/never-locked
trio.

A deployed four-page application at [https://bitmax-rouge.vercel.app/]: landing page, dashboard, boost
page, embedded Zest borrow page, and a public docs page listing every contract
address with explorer links. Wallet connect works with Leather and Xverse.

Gas sponsorship working end-to-end, with a contract allowlist I verified by
hand-crafting a call to an unrelated contract and confirming it is rejected with a
403 before any signing occurs.

What I learned by getting things wrong:

The original design was a dual-leg vault with a leverage loop. I cut it entirely
when Zest announced Stacks Vaults in July 2026, because it would have duplicated
their product and depended on Zest listing a custom share token as collateral.
Duplicating working infrastructure is explicitly not fundable, and rightly so.

The original boost redistributed the vault's base yield. I cut that too, for the
reason described above: it made non-lockers strictly worse off than depositing
elsewhere. The replacement — funding the boost from Dual Stacking rewards that the
locked STX genuinely earns — is the current design and the better product.

Reading deployed source beats reading documentation. Every external address in
this project was traced through the protocol's own deployed contracts. That is how
I found that Zest stores collateral under the z-prefixed share asset id 13 rather
than stBTC's own id 12, that collateral-remove alone leaves a user holding
unspendable vault shares while collateral-remove-redeem completes both steps, and
that repay safely caps the token pull at the real outstanding debt — which is why a
"use full balance" button is safe rather than a guess. Docs said none of that.

Honest exits are longer than they look. StackingDAO's real withdrawal flow has a
two-step cooldown of roughly two weeks. My first lock design had a single instant
unlock. It now mirrors the real cooldown with request-unlock and claim-unlock, and
the interface states both waiting periods rather than implying an instant exit.

What I have not validated: real users. Nobody outside me has used this. That is
exactly what Milestone 3 exists to find out, and I would rather discover the flow
breaks for real people during a funded beta than assume it does not.
```

### Who will do the work and what experience do they bring?
```
Me, solo. Thompson Eregha.

Relevant background: I completed Stacks Ascent Level 1 in 2025 and took part in
the Stacks Validate cohort in 2026, which was specifically about identifying target
users and building for them rather than for yourself. That program is why this
project sponsors gas and why the dashboard shows "you put in / you've earned"
instead of an APY chart.

Demonstrated on this project specifically: Clarity contract development with a
passing test suite, TypeScript and Next.js for the application, a keeper service
with its own tests, and direct integration work against three live mainnet
protocols by reading their deployed source rather than their documentation.

The clearest evidence of how I work is what I removed. This project has been
through two structural redesigns — cutting the leverage loop when it turned out to
overlap with Zest's product, and replacing the entire boost yield source when the
original version turned out to make non-lockers worse off. Both were caught before
shipping, and both meant discarding working code. I would rather ship a smaller
thing that is correct than a larger thing I have to defend.

I am not claiming a team I do not have. This is a single-developer project. The
scope has been cut deliberately until it is something one person can finish: one
new contract mechanism, three live protocols composed, no token, no audit surface I
cannot cover.
```

### What is the smallest useful outcome this grant should produce?
```
One person who is not me deposits real sBTC on Stacks mainnet through BitMax,
earns real Bitcoin Staking yield on it, locks STX, receives a real sBTC boost
payment funded by actual Dual Stacking rewards, and withdraws everything to their
own wallet, without needing to hold STX for fees, without understanding what a
liquid staking token is, and without me guiding them through it.

If that happens once, verifiably on-chain, the concept is proven. The contracts
work against live protocols, the boost mechanism distributes real Bitcoin, the
sponsored-gas path works for someone with no STX, and the interface is
self-explanatory enough for a Bitcoin holder to complete unaided.

Everything else in this application is in service of that single transaction
sequence being real and repeatable.
```

### What evidence will show the concept is worth continuing?
```
Three pieces of evidence, in order of how much they would change my mind.

First, on-chain deposits from people I did not walk through the flow. A deposit
transaction from a beta participant who received no guidance is the only evidence
that the interface actually works. Every transaction is publicly verifiable on the
Stacks explorer, so this is checkable by the Foundation independently of anything I
claim.

Second, STX locks specifically. A deposit only proves the yield was attractive. A
lock proves the boost mechanism was understood and considered worth committing
for, which is the entire thesis. If people deposit but nobody locks, the boost is
not a compelling enough product and I want to know that early. Lock duration is
also informative — long locks mean the mechanism reads as trustworthy.

Third, a completed epoch that distributes real sBTC to lockers. This is the
mechanical proof: the full chain from locked STX, through StackingDAO's Dual
Stacking, through a claim, into weighted sBTC payouts landing in real wallets,
executed by a permissionless keeper call anyone could have made.

What would tell me to stop: if beta participants consistently cannot complete a
deposit unaided, or if they deposit but never lock, the product thesis is wrong.
The post-mortem in Milestone 3 will say so publicly if that is what the data shows.
A negative result published honestly is a real outcome for a Getting Started grant,
and I would rather deliver that than quietly reframe it.
```

### What dependencies or risks could affect delivery?
```
Biggest one: StackingDAO's Dual Stacking product is currently paused. Deposits,
init-withdraw, and withdraw are all administratively disabled on
stacking-dao-core-ststxbtc-v2 right now — I confirmed this with live on-chain
reads. My integration is written and correct against their real contracts, but the
boost leg cannot run end-to-end on mainnet until they reopen it. This is outside
my control. Milestone 2 carries an explicit contingency: if it is still paused on
the target date, I deliver the integration verified against a devnet fork using the
real contract interfaces, with documented evidence of the pause, and the live
payout follows when the product reopens. I will also reach out to StackingDAO
directly for a timeline.

Zest v2 is mainnet-only, with no testnet deployment. The borrow integration can
only be fully verified on mainnet with a funded wallet holding real stBTC. The app
already gates that page by network rather than letting users submit transactions to
a contract that does not exist on their chain, but final verification requires
real funds on mainnet.

The contracts cannot be fully exercised until they are on mainnet. They call
StackingDAO's real contracts with the address pinned and asserted, which is what
stops a caller passing a fake contract — but it also means there is no devnet or
testnet path for those calls by construction, so local tests cannot cover the
external legs. The logic is written and the addresses are verified against
StackingDAO's deployed source, but Milestone 1 is the first time it runs against
live contracts, and their real fee behaviour is the most likely surprise.

Single developer. If I am unavailable, delivery stops. Mitigated by small scope and
public, documented progress, but not eliminated.

Beta recruitment. Milestone 3 depends on finding real Bitcoin holders willing to
deposit into unaudited contracts. I will cap deposit sizes, state the unaudited
status plainly to every participant, and recruit through the waitlist plus direct
outreach. If I cannot find enough participants, I will report the actual number
reached rather than inflate it.

Deliberately out of scope, so they are not delivery risks: a security audit
(honestly beyond a $10,000 grant, and a Builder Grant follow-on item), and the
BTC-to-sBTC peg-in flow (users arrive already holding sBTC; the peg-in code exists
in the repo but is unwired, which the docs state plainly).
```

### What support from the Stacks ecosystem would help?
```
An introduction to StackingDAO would help most. My integration depends on their
stBTC and Dual Stacking contracts, and their Dual Stacking product is paused right
now. A direct line for a reopening timeline, and a review of whether I am using
their contracts as intended, would de-risk the largest external dependency in this
project.

A conversation with Zest would help second. I integrated against their deployed
source rather than their documentation and found several things the docs did not
cover. A short review confirming I am calling the market correctly would be
valuable, and my notes on what was undocumented may be useful to them.

A Clarity review from an experienced developer. Not a full audit, which is out of
scope at this grant size, but a second pair of eyes on ve-stx-lock's weight
decay and the distributor's epoch accounting before real funds touch mainnet.

If none of this is available, the work still ships. These would make it better and
safer.
```

### How will you share progress or learnings publicly?
```
The repository is public at github.com/Godbrand0/bitmax and stays that way.
Commits are the primary progress record, written to be readable — including the
ones that remove things, which are the more informative ones.

The application carries a public docs page listing every contract BitMax touches,
grouped by protocol, each with its exact address and an explorer link. It also
states what is not wired up yet. That page is updated with each milestone rather
than being written once and left to drift.

Per milestone, I publish a written update in the repository with the on-chain
transaction links that evidence it, and share it on X. For the closed beta, a full
post-mortem covering how many people completed the flow, where they got stuck, how
many locked STX, and what the next iteration needs — published whether the numbers
are good or bad.

I will also publish the integration notes separately, because they are useful to
anyone else building on these protocols: what Zest's docs omit about collateral
share accounting and the repay cap, how StackingDAO's real two-step withdrawal
cooldown actually behaves, and the Clarinet SDK behaviour where Vitest rolls back
simnet state per individual test block rather than per file — which silently breaks
any test that assumes state carried over. Each of those cost me real time to find
and none of it is written down anywhere public.
```

### What happens after the grant if the work succeeds?
```
Success means the beta shows real Bitcoin holders completing the flow unaided and
choosing to lock STX. If that happens, three things follow.

First, a security audit — the single largest gap between this and a product I would
invite anyone to deposit meaningfully into. That is the primary purpose of a
follow-on Builder Grant application, which is the path the program itself lays out
for a Getting Started project that ships.

Second, opening it publicly and removing the beta deposit caps, with per-account
spend limits on gas sponsorship in place first, and a sustainable funding model for
it. Sponsoring every user's gas indefinitely out of my own pocket does not scale,
and I would rather say that now than discover it later.

Third, the boost mechanism as reusable infrastructure. ve-stx-lock is not
BitMax-specific. It is a general Stacks vote-escrow primitive: lock STX, earn a
decaying weight, distribute any reward stream by that weight. If it works here, I
want to document it properly so other Stacks protocols can adopt the pattern
instead of rebuilding it. That is a larger contribution than one vault.

If the beta shows the flow does not work for real users, I publish that result with
the data and do not apply for a follow-on grant on the strength of a story the
evidence does not support.
```

### Any other context reviewers should consider?
```
On budget. $10,000 tied line by line to the milestones: $2,000 for mainnet
deployment and real-contract integration (deployment costs, initial gas sponsorship
funding, test capital to run real deposits), $3,000 for the boost mechanism running
live (keeper hosting, STX for real locks, sBTC and stBTC for end-to-end
verification, Zest mainnet testing with real funds), $5,000 for the closed beta
(participant support, gas sponsorship at beta volume, my time on unguided sessions,
and the post-mortem). No salaries, no marketing spend, no token.

On why the milestone weighting is back-loaded. Half the money sits on the beta,
because deployed contracts prove only that I can write contracts. Real people using
them is the claim worth paying for, and it is the claim I am least certain of.

On scope discipline. Three things were cut from this project before applying: the
leverage loop (overlapped Zest's Stacks Vaults), the redistributive boost (made
non-lockers worse off), and the BTC peg-in flow (users arrive holding sBTC). Each
cut made the build smaller and the product more honest. What remains is what one
developer can actually finish.

On my previous application. I applied in Q2 with a different project and was not
selected. Rather than reapply immediately, I built until there was something to
verify. That is why this application points at live testnet contracts and a passing
test suite instead of a plan.

On verification. Nothing in this application requires taking my word for it. The
contracts are at ST19XTHQ3SVST2NCYPTHP2W31MFDQDBFG3W5VFJ8Z on Stacks testnet, the
repository is public, the application is deployed at [https://bitmax-rouge.vercel.app/], and the tests run with a single command. I would rather be checked than believed.
```

---

## 07 — Compliance readiness
Individual applicant. Tick the confirmation; have one acceptable government ID ready per the Vouched guidance. Do not upload anything at this stage.

---

## 08 — Milestones

### Milestone 1 — 20% · $2,000
**Name**
```
Mainnet deployment with real StackingDAO staking
```
**Target date**
```
2026-11-15
```
**Description**
```
Deploy bitmax-vault, ve-stx-lock, and bitmax-boost-distributor to Stacks mainnet
and run them against StackingDAO's live contracts for the first time. The
integration code is already written and the contracts are already live on testnet,
but they are mainnet-only by construction: each StackingDAO call is pinned to its
real mainnet principal and asserted before any state change, so those paths cannot
execute anywhere else. This milestone is where they execute for real — verifying
StackingDAO's actual fee and exchange-rate behaviour against what the vault's
accounting expects, and correcting it if they differ.

Alongside that: add per-account spend caps to the gas sponsorship endpoint and
fund a mainnet sponsor wallet, point the deployed application at mainnet, and
complete a full deposit, redeem, and withdrawal cycle with real sBTC end to end.
```
**Success criteria**
```
ALL THREE BITMAX CONTRACTS DEPLOYED TO STACKS MAINNET WITH PUBLIC EXPLORER LINKS.
REAL sBTC DEPOSITED THROUGH THE APP AND STAKED VIA STACKINGDAO'S LIVE
stacking-dao-core-stbtc-v1 CONTRACT, VERIFIABLE ON-CHAIN. FULL DEPOSIT, REDEEM,
AND WITHDRAWAL CYCLE COMPLETED WITH REAL FUNDS. PER-ACCOUNT SPEND CAPS LIVE ON THE
GAS SPONSORSHIP ENDPOINT. APPLICATION DEPLOYED AND PUBLICLY REACHABLE ON MAINNET.
GITHUB REPOSITORY AND PUBLIC DOCS PAGE UPDATED WITH ALL MAINNET ADDRESSES.
```
**Payment percent** `20`

**Adoption metric**
```
Internal test deposits of real sBTC completed on Stacks mainnet, with on-chain
transaction records showing sBTC entering bitmax-vault and stBTC minted through
StackingDAO's live contract, each publicly verifiable on the Stacks explorer.
```

---

### Milestone 2 — 30% · $3,000
**Name**
```
Boost mechanism live, paying real Bitcoin yield
```
**Target date**
```
2026-12-15
```
**Description**
```
Run the boost mechanism end-to-end on mainnet. STX locked through ve-stx-lock is
pooled into StackingDAO's real Dual Stacking product, the keeper service runs
against mainnet and triggers close-epoch permissionlessly, and
bitmax-boost-distributor claims the Bitcoin-denominated reward that pooled STX
earned and pays it out as sBTC to lockers, weighted by lock weight. The two-step
exit — request-unlock, then claim-unlock after StackingDAO's real cooldown — is
verified with real funds and both waiting periods stated plainly in the interface.
The Zest borrow integration is verified against Zest's live market with real stBTC
collateral, completing the deposit, boost, and borrow path in one application.

Contingency, stated up front: StackingDAO's Dual Stacking product is
administratively paused as of this application. If it is still paused on this date,
I deliver the same integration verified against a Clarinet devnet fork using the
real contract interfaces, publish on-chain evidence of the pause, and the live
mainnet payout follows as soon as StackingDAO reopens. The keeper, distributor
logic, and Zest verification are unaffected either way and ship regardless.
```
**Success criteria**
```
STX LOCKED ON MAINNET AND POOLED INTO STACKINGDAO'S REAL DUAL STACKING CONTRACT.
KEEPER SERVICE RUNNING AGAINST MAINNET AND TRIGGERING close-epoch
PERMISSIONLESSLY. AT LEAST ONE EPOCH CLOSED, CLAIMING REAL BITCOIN-DENOMINATED
REWARDS AND PAYING sBTC TO LOCKERS WEIGHTED BY LOCK WEIGHT, VERIFIABLE ON-CHAIN.
TWO-STEP UNLOCK VERIFIED WITH REAL FUNDS. ZEST BORROW VERIFIED ON MAINNET WITH
REAL stBTC COLLATERAL. GITHUB UPDATED WITH INTEGRATION CODE AND A WRITTEN
DEPLOYMENT NOTE. IF STACKINGDAO REMAINS PAUSED, DEVNET-FORK VERIFICATION PLUS
PUBLISHED ON-CHAIN EVIDENCE OF THE PAUSE IS DELIVERED IN ITS PLACE.
```
**Payment percent** `30`

**Adoption metric**
```
At least one completed close-epoch transaction on Stacks mainnet distributing real
sBTC to STX lockers in proportion to lock weight, with transaction records linking
the locked STX through StackingDAO's Dual Stacking contract to the sBTC payouts
received, publicly verifiable on the Stacks explorer.
```

---

### Milestone 3 — 50% · $5,000 · FINAL
**Name**
```
Closed beta with independent on-chain adoption evidence
```
**Target date**
```
2027-01-15
```
**Description**
```
Open a structured closed beta to the waitlist and to Bitcoin holders sourced
through direct community outreach, with priority on people who have never used a
DeFi application. Participants run the full BitMax flow themselves — deposit sBTC,
lock STX, receive a boost payment, borrow against their balance if they choose,
withdraw — with no guidance from me during their session. Deposit sizes are capped
and the unaudited status of the contracts is stated plainly to every participant
before they begin.

Results are documented with on-chain transaction records, observations of where
people stalled or gave up, and a written post-mortem published publicly covering
completion rates, how many participants locked STX rather than only depositing,
what worked, what did not, and what the next iteration requires. The post-mortem
is published whether the results are good or bad.
```
**Success criteria**
```
REAL NON-TECHNICAL BITCOIN HOLDERS INVITED TO THE CLOSED BETA AND RUN THROUGH THE
FULL FLOW WITHOUT GUIDANCE DURING THEIR SESSION. INDEPENDENT ON-CHAIN DEPOSITS AND
STX LOCKS COMPLETED BY PARTICIPANTS. ON-CHAIN TRANSACTION LINKS PROVIDED AS
EVIDENCE. POST-MORTEM PUBLISHED TO GITHUB AND SHARED PUBLICLY ON X, COVERING
COMPLETION RATES, LOCK PARTICIPATION, AND NEXT ITERATION — PUBLISHED REGARDLESS OF
WHETHER RESULTS ARE POSITIVE.
```
**Payment percent** `50`

**Final adoption metric**
```
Verified independent on-chain deposits and STX locks from closed beta participants
who received no guidance during their session, measured by counting distinct
mainnet wallet addresses that completed a bitmax-vault deposit and, separately,
a ve-stx-lock lock — each transaction publicly verifiable on the Stacks explorer
and listed in the published post-mortem.
```
