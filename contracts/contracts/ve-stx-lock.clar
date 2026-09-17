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
;;   mock-ststxbtc-pool (a stand-in for StackingDAO's real stSTXbtc
;;   product - see that contract's header for why this works: `deposit`
;;   there has no caller restriction, so ve-stx-lock can pool many lockers'
;;   STX into one call and act as a single depositor, exactly the way
;;   StackingDAO's own liquid-staking products already pool many users).
;;   That STX earns real Dual Stacking rewards while locked, which
;;   bitmax-boost-distributor claims and distributes as the boost - this
;;   is what makes boosting additive (new yield from the locked STX) rather
;;   than a redistribution of other depositors' base sBTC yield. See
;;   readme.md for the full reasoning.
;;
;;   Exiting mirrors StackingDAO's own real two-step withdrawal (confirmed
;;   against their deployed stacking-dao-core-ststxbtc-v2 and
;;   ststxbtc-data-v2 contracts): once unlock-height passes, `request-unlock`
;;   clears this contract's own lock and calls the pool's `init-withdraw`,
;;   which starts a *separate* cooldown (currently ~2 weeks on the real
;;   protocol) before the STX can actually be claimed via `claim-unlock`.
;;   That second cooldown is not simulated here as being any shorter than
;;   the real one - see mock-ststxbtc-pool.clar's own header for the exact
;;   duration this mock uses and why. The two cooldowns are additive: total
;;   time from locking to STX back in your wallet is your chosen lock
;;   duration PLUS this second withdrawal cooldown, not either one alone.
;;
;;   Durations are counted in `burn-block-height` (Bitcoin blocks, ~10min
;;   each), not `stacks-block-height` (~11.8s each on mainnet, and variable
;;   with Nakamoto fast blocks) - confirmed against StackingDAO's own
;;   ststxbtc-data-v2 contract, whose real withdrawal cooldown is likewise
;;   measured in burn-block-height. Using the Stacks clock here would make
;;   MIN/MAX-LOCK-DURATION below wrong by roughly the ratio of the two block
;;   times, not just imprecise.

;; constants

(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ZERO-AMOUNT (err u101))
(define-constant ERR-LOCK-TOO-SHORT (err u102))
(define-constant ERR-LOCK-TOO-LONG (err u103))
(define-constant ERR-EXISTING-LOCK (err u104))
(define-constant ERR-NO-LOCK (err u105))
(define-constant ERR-NOT-YET-UNLOCKED (err u106))
(define-constant ERR-EXISTING-WITHDRAWAL (err u107))
(define-constant ERR-NO-PENDING-WITHDRAWAL (err u108))

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
(define-map pending-withdrawals
  { owner: principal }
  {
    ticket-id: uint,
    amount: uint,
  }
)

;; public functions

;; Lock `amount` STX until `unlock-height`. Only one active lock per
;; principal at a time, and none while a previous lock's withdrawal is
;; still pending - claim that first before starting a new lock.
(define-public (lock-stx
    (amount uint)
    (unlock-height uint)
  )
  (let ((duration (- unlock-height burn-block-height)))
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (is-none (map-get? locks { owner: tx-sender })) ERR-EXISTING-LOCK)
    (asserts! (is-none (map-get? pending-withdrawals { owner: tx-sender })) ERR-EXISTING-WITHDRAWAL)
    (asserts! (>= duration MIN-LOCK-DURATION) ERR-LOCK-TOO-SHORT)
    (asserts! (<= duration MAX-LOCK-DURATION) ERR-LOCK-TOO-LONG)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (try! (as-contract (contract-call? .mock-ststxbtc-pool deposit amount)))
    (map-set locks { owner: tx-sender } {
      amount: amount,
      created-at: burn-block-height,
      unlock-height: unlock-height,
    })
    (ok true)
  )
)

;; Step 1 of 2 for exiting, callable once unlock-height has passed. Clears
;; this contract's own lock and starts the pool's own withdrawal cooldown
;; (see mock-ststxbtc-pool.clar) - no STX moves yet. Boost weight is
;; already u0 by this point (get-weight decays to zero at unlock-height),
;; so this step doesn't change anyone's boost share.
(define-public (request-unlock)
  (let (
      (owner tx-sender)
      (lock (unwrap! (map-get? locks { owner: tx-sender }) ERR-NO-LOCK))
    )
    (asserts! (>= burn-block-height (get unlock-height lock)) ERR-NOT-YET-UNLOCKED)
    (map-delete locks { owner: owner })
    (let ((ticket-id (try! (as-contract (contract-call? .mock-ststxbtc-pool init-withdraw (get amount lock))))))
      (map-set pending-withdrawals { owner: owner } {
        ticket-id: ticket-id,
        amount: (get amount lock),
      })
      (ok ticket-id)
    )
  )
)

;; Step 2 of 2. Pays the STX out once the pool's own withdrawal cooldown
;; has passed - the pool itself enforces that timing (ERR-NOT-YET-UNLOCKED
;; from mock-ststxbtc-pool bubbles up via try! if called too early), this
;; contract just relays the result and clears the pending entry.
(define-public (claim-unlock)
  (let (
      (owner tx-sender)
      (pending (unwrap! (map-get? pending-withdrawals { owner: tx-sender }) ERR-NO-PENDING-WITHDRAWAL))
    )
    (map-delete pending-withdrawals { owner: owner })
    (try! (as-contract (contract-call? .mock-ststxbtc-pool withdraw (get ticket-id pending))))
    (as-contract (stx-transfer? (get amount pending) tx-sender owner))
  )
)

;; read only functions

(define-read-only (get-lock (who principal))
  (map-get? locks { owner: who })
)

(define-read-only (get-pending-withdrawal (who principal))
  (map-get? pending-withdrawals { owner: who })
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
