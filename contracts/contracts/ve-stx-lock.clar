;; title: ve-stx-lock
;; summary: Vote-escrow style STX locking. Locking STX for longer yields a
;;   higher, linearly-decaying weight, read by bitmax-boost-distributor to
;;   boost a depositor's share of bitmax-vault yield.
;; description: Non-transferable, non-custodial-beyond-lock-duration. A
;;   depositor locks raw STX for a chosen duration; weight decays linearly
;;   to zero at unlock-height. Exiting past that point is two real calls,
;;   not one - `request-unlock` then, after a further cooldown,
;;   `claim-unlock` - mirroring StackingDAO's own real exit mechanics
;;   exactly (see below). There is no way to get STX out faster than that;
;;   this contract does not offer an instant exit at any point.
;;
;;   Locked STX is not left idle: every lock immediately pools its STX into
;;   StackingDAO's real Dual Stacking product, stacking-dao-core-ststxbtc-v2
;;   (confirmed against its deployed source,
;;   github.com/StackingDAO/stackingdao-smart-contracts, fetched directly,
;;   Sept 2026 - not guessed, and not a devnet/testnet mock). `deposit`
;;   there has no caller restriction, so ve-stx-lock can pool many lockers'
;;   STX into one call and act as a single depositor - exactly the way
;;   StackingDAO's own liquid-staking products already pool many users.
;;   That STX earns real Dual Stacking rewards while locked (paid in sBTC
;;   via ststxbtc-tracking-v2, see claim-boost-reward below), which
;;   bitmax-boost-distributor claims and distributes as the boost - this is
;;   what makes boosting additive (new yield from the locked STX) rather
;;   than a redistribution of other depositors' base sBTC yield. See
;;   readme.md for the full reasoning.
;;
;;   StackingDAO's real contracts are passed in as trait-typed parameters,
;;   not called via a hardcoded absolute principal, for the same reason
;;   bitmax-vault.clar's stBTC leg does this (see that file's header):
;;   `clarinet check` cannot statically resolve a `contract-call?` to a
;;   contract whose source isn't part of this project. Every trait-typed
;;   parameter below is asserted equal to its known real mainnet principal
;;   before any state changes, so a caller can't substitute a fake
;;   contract and trick this contract into a bogus claim.
;;
;;   stSTXbtc (StackingDAO's Dual Stacking token) mints and burns strictly
;;   1:1 with STX - unlike stBTC, it carries no appreciating exchange rate
;;   (confirmed in stacking-dao-core-ststxbtc-v2's own deposit function:
;;   `mint-for-protocol stx-amount tx-sender`, not a computed amount) - so
;;   lock-stx below passes `amount` as its own min-shares-out with no live
;;   rate read needed, unlike bitmax-vault's deposit.
;;
;;   Exiting mirrors StackingDAO's own real two-step withdrawal (confirmed
;;   against their deployed stacking-dao-core-ststxbtc-v2 and
;;   ststxbtc-data-v2 contracts): once unlock-height passes, `request-unlock`
;;   clears this contract's own lock and calls the real init-withdraw,
;;   which starts a *separate* cooldown (2100 burn blocks / ~2 weeks,
;;   confirmed live via ststxbtc-data-v2.get-withdraw-cooldown-blocks)
;;   before the STX can actually be claimed via `claim-unlock`. That second
;;   cooldown is additive: total time from locking to STX back in your
;;   wallet is your chosen lock duration PLUS this second withdrawal
;;   cooldown, not either one alone.
;;
;;   Local `clarinet test` coverage is correspondingly limited, the same
;;   situation bitmax-vault.clar's real leg and the Zest integration
;;   already accepted: every public function that reaches a real
;;   StackingDAO call needs a successful external call simnet can't make,
;;   so only what runs before the trait-principal pin (cheap local checks,
;;   deliberately ordered first) has local coverage - the rest is verified
;;   by direct comparison against StackingDAO's deployed source and live
;;   mainnet reads instead.
;;
;;   IMPORTANT OPERATIONAL NOTE (as of the integration date above):
;;   StackingDAO's stacking-dao-core-ststxbtc-v2 currently has deposits,
;;   init-withdraw, AND withdraw all administratively shut down on mainnet
;;   (confirmed live via get-shutdown-deposits / get-shutdown-init-withdraw
;;   / get-shutdown-withdraw, all true) - almost certainly a maintenance or
;;   migration pause on their side, not a permanent state, but it means
;;   lock-stx/request-unlock/claim-unlock will all revert with whatever
;;   error StackingDAO's own contract raises (ERR_SHUTDOWN) until they
;;   re-enable it, regardless of how correct this integration is. This
;;   contract makes no attempt to detect or work around that - there is no
;;   safe fallback, the call simply fails until StackingDAO flips the flag
;;   back.
;;
;;   Durations are counted in `burn-block-height` (Bitcoin blocks, ~10min
;;   each), not `stacks-block-height` (~11.8s each on mainnet, and variable
;;   with Nakamoto fast blocks) - confirmed against StackingDAO's own
;;   ststxbtc-data-v2 contract, whose real withdrawal cooldown is likewise
;;   measured in burn-block-height. Using the Stacks clock here would make
;;   MIN/MAX-LOCK-DURATION below wrong by roughly the ratio of the two block
;;   times, not just imprecise.

;; traits

;; The subset of StackingDAO's real stacking-dao-core-ststxbtc-v2 interface
;; this contract calls - defined locally since it isn't a published trait
;; anywhere, matching the real contract's own function signatures exactly
;; (confirmed against its deployed source).
(define-trait ststxbtc-core-trait (
  (deposit (uint uint) (response uint uint))
  (init-withdraw (uint) (response uint uint))
  (withdraw (uint) (response { stx-fee: uint, stx-user: uint } uint))
))

;; The subset of StackingDAO's real ststxbtc-tracking-v2 interface used by
;; claim-boost-reward below - confirmed against its deployed source.
;; Referenced by bitmax-boost-distributor.clar via
;; `.ve-stx-lock.ststxbtc-tracking-trait`, the same way a SIP-010 trait is
;; shared across contracts via `.sip-010-trait.sip-010-trait`.
(define-trait ststxbtc-tracking-trait (
  (claim-pending-rewards (principal principal) (response uint uint))
))

(use-trait ft-trait .sip-010-trait.sip-010-trait)

;; constants

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ZERO-AMOUNT (err u101))
(define-constant ERR-LOCK-TOO-SHORT (err u102))
(define-constant ERR-LOCK-TOO-LONG (err u103))
(define-constant ERR-EXISTING-LOCK (err u104))
(define-constant ERR-NO-LOCK (err u105))
(define-constant ERR-NOT-YET-UNLOCKED (err u106))
(define-constant ERR-EXISTING-WITHDRAWAL (err u107))
(define-constant ERR-NO-PENDING-WITHDRAWAL (err u108))
;; A trait-typed parameter didn't resolve to the real, known contract it
;; claims to be - see this file's header for why this check exists at all.
(define-constant ERR-WRONG-CONTRACT (err u109))
(define-constant ERR-ALREADY-SET (err u110))

;; ~2 weeks of burn (Bitcoin) blocks at ~10min/block - StackingDAO's own
;; Dual Stacking withdrawal cooldown is one such window (2100 blocks, read
;; live off ststxbtc-data-v2.get-withdraw-cooldown-blocks on mainnet), so
;; this is the shortest commitment that lines up with a real exit cycle.
(define-constant MIN-LOCK-DURATION u2016)
;; ~6 months of burn (Bitcoin) blocks at ~10min/block. Also the denominator
;; in get-weight below, so this doubles as "how long a lock must be to earn
;; full (1:1) weight per STX locked" - shortening it raises the weight any
;; given lock duration earns, it isn't just a longer-locks-allowed ceiling.
(define-constant MAX-LOCK-DURATION u26280)

;; StackingDAO's and sBTC's real, live mainnet principals - what every
;; trait-typed parameter below is checked against. Confirmed via
;; StackingDAO's own deployed source, not guessed.
(define-constant STACKINGDAO-STSTXBTC-CORE 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-ststxbtc-v2)
(define-constant STACKINGDAO-STSTXBTC-TRACKING 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.ststxbtc-tracking-v2)
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; data vars

;; Set once, by CONTRACT-OWNER, to bitmax-boost-distributor's principal -
;; the only principal claim-boost-reward will ever pay out to.
(define-data-var boost-distributor (optional principal) none)

;; data maps

(define-map locks
  { owner: principal }
  {
    amount: uint,
    created-at: uint,
    unlock-height: uint,
  }
)

;; Set by request-unlock, cleared by claim-unlock. A principal can have a
;; `locks` entry or a `pending-withdrawals` entry, never both at once -
;; request-unlock moves a position from one to the other atomically.
;; `nft-id` is StackingDAO's own real withdrawal-ticket NFT id (minted by
;; their ststxbtc-withdraw-nft-v3 inside init-withdraw) - this contract
;; deliberately doesn't cache the ticket's unlock height, which is readable
;; live and authoritatively from StackingDAO's own
;; ststxbtc-data-v2.get-withdrawals-by-nft instead of risking a stale local
;; copy drifting from StackingDAO's own record.
(define-map pending-withdrawals
  { owner: principal }
  {
    nft-id: uint,
    amount: uint,
  }
)

;; public functions

(define-public (set-boost-distributor (distributor principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (is-none (var-get boost-distributor)) ERR-ALREADY-SET)
    (var-set boost-distributor (some distributor))
    (ok true)
  )
)

;; Lock `amount` STX until `unlock-height`. Only one active lock per
;; principal at a time, and none while a previous lock's withdrawal is
;; still pending - claim that first before starting a new lock.
;;
;; `ststxbtc-core` is trait-typed (see this file's header) - the frontend
;; passes StackingDAO's real mainnet principal, checked below before
;; anything moves. min-shares-out is passed as `amount` itself, not a
;; caller-supplied slippage figure, since stSTXbtc mints strictly 1:1 with
;; STX deposited (see header) - there is no rate to protect against.
(define-public (lock-stx
    (amount uint)
    (unlock-height uint)
    (ststxbtc-core <ststxbtc-core-trait>)
  )
  (let ((duration (- unlock-height burn-block-height)))
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (is-none (map-get? locks { owner: tx-sender })) ERR-EXISTING-LOCK)
    (asserts! (is-none (map-get? pending-withdrawals { owner: tx-sender })) ERR-EXISTING-WITHDRAWAL)
    (asserts! (>= duration MIN-LOCK-DURATION) ERR-LOCK-TOO-SHORT)
    (asserts! (<= duration MAX-LOCK-DURATION) ERR-LOCK-TOO-LONG)
    (asserts! (is-eq (contract-of ststxbtc-core) STACKINGDAO-STSTXBTC-CORE) ERR-WRONG-CONTRACT)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (try! (as-contract (contract-call? ststxbtc-core deposit amount amount)))
    (map-set locks { owner: tx-sender } {
      amount: amount,
      created-at: burn-block-height,
      unlock-height: unlock-height,
    })
    (ok true)
  )
)

;; Step 1 of 2 for exiting, callable once unlock-height has passed. Clears
;; this contract's own lock and starts StackingDAO's own real withdrawal
;; cooldown (init-withdraw) - no STX moves yet. Boost weight is already u0
;; by this point (get-weight decays to zero at unlock-height), so this step
;; doesn't change anyone's boost share.
(define-public (request-unlock (ststxbtc-core <ststxbtc-core-trait>))
  (let (
      (owner tx-sender)
      (lock (unwrap! (map-get? locks { owner: tx-sender }) ERR-NO-LOCK))
    )
    (asserts! (>= burn-block-height (get unlock-height lock)) ERR-NOT-YET-UNLOCKED)
    (asserts! (is-eq (contract-of ststxbtc-core) STACKINGDAO-STSTXBTC-CORE) ERR-WRONG-CONTRACT)
    (map-delete locks { owner: owner })
    (let ((nft-id (try! (as-contract (contract-call? ststxbtc-core init-withdraw (get amount lock))))))
      (map-set pending-withdrawals { owner: owner } {
        nft-id: nft-id,
        amount: (get amount lock),
      })
      (ok nft-id)
    )
  )
)

;; Step 2 of 2. Pays the STX out once StackingDAO's own withdrawal cooldown
;; has passed - their own contract enforces that timing and computes the
;; exact (fee-adjusted) stx-user amount; this contract just relays whatever
;; it returns (not the originally-locked amount, which could differ if a
;; withdrawal fee is ever set) and clears the pending entry.
(define-public (claim-unlock (ststxbtc-core <ststxbtc-core-trait>))
  (let (
      (owner tx-sender)
      (pending (unwrap! (map-get? pending-withdrawals { owner: tx-sender }) ERR-NO-PENDING-WITHDRAWAL))
    )
    (asserts! (is-eq (contract-of ststxbtc-core) STACKINGDAO-STSTXBTC-CORE) ERR-WRONG-CONTRACT)
    (map-delete pending-withdrawals { owner: owner })
    (let ((result (try! (as-contract (contract-call? ststxbtc-core withdraw (get nft-id pending))))))
      (as-contract (stx-transfer? (get stx-user result) tx-sender owner))
    )
  )
)

;; Callable only by the registered bitmax-boost-distributor. Claims the
;; real sBTC Dual Stacking reward accrued on this contract's pooled
;; stSTXbtc holding (StackingDAO's ststxbtc-tracking-v2 pays sBTC rewards
;; directly to whichever principal holds the stSTXbtc, which is this
;; contract's own principal - see this file's header) and forwards it to
;; the distributor, which splits it among individual lockers by weight.
;; `claim-pending-rewards` is permissionless on StackingDAO's side and
;; always pays the `holder` argument, never the caller - so this doesn't
;; need `as-contract` to protect anything on the claim itself, only on the
;; subsequent sBTC transfer out of this contract's own balance.
(define-public (claim-boost-reward
    (sbtc-token <ft-trait>)
    (tracking <ststxbtc-tracking-trait>)
  )
  (let ((distributor (unwrap! (var-get boost-distributor) ERR-NOT-AUTHORIZED)))
    (asserts! (is-eq tx-sender distributor) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (contract-of sbtc-token) SBTC-TOKEN) ERR-WRONG-CONTRACT)
    (asserts! (is-eq (contract-of tracking) STACKINGDAO-STSTXBTC-TRACKING) ERR-WRONG-CONTRACT)
    (let ((claimed (try! (contract-call? tracking claim-pending-rewards (as-contract tx-sender) (as-contract tx-sender)))))
      (if (> claimed u0)
        (begin
          (try! (as-contract (contract-call? sbtc-token transfer claimed tx-sender distributor none)))
          (ok claimed)
        )
        (ok u0)
      )
    )
  )
)

;; read only functions

(define-read-only (get-lock (who principal))
  (map-get? locks { owner: who })
)

(define-read-only (get-pending-withdrawal (who principal))
  (map-get? pending-withdrawals { owner: who })
)

(define-read-only (get-boost-distributor)
  (var-get boost-distributor)
)

;; Linearly-decaying weight: amount * (unlock-height - current) / MAX-LOCK-DURATION.
;; Zero if no lock, or if past unlock-height.
(define-read-only (get-weight (who principal))
  (match (map-get? locks { owner: who })
    lock (let (
        (unlock-height (get unlock-height lock))
        (amount (get amount lock))
      )
      (if (>= burn-block-height unlock-height)
        u0
        (/ (* amount (- unlock-height burn-block-height)) MAX-LOCK-DURATION)
      )
    )
    u0
  )
)
