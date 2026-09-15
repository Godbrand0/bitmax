;; title: ve-stx-lock
;; summary: Vote-escrow style STX locking. Locking STX for longer yields a
;;   higher, linearly-decaying weight, read by bitmax-boost-distributor to
;;   boost a depositor's share of bitmax-vault yield.
;; description: Non-transferable, non-custodial-beyond-lock-duration. A
;;   depositor locks raw STX for a chosen duration; weight decays linearly
;;   to zero at unlock-height, at which point the STX can be withdrawn.
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
;;   readme.md for the full reasoning and the real-contract gaps this mock
;;   leaves open (StackingDAO's actual withdrawal flow has a cooldown this
;;   mock doesn't simulate).

;; constants

(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ZERO-AMOUNT (err u101))
(define-constant ERR-LOCK-TOO-SHORT (err u102))
(define-constant ERR-LOCK-TOO-LONG (err u103))
(define-constant ERR-EXISTING-LOCK (err u104))
(define-constant ERR-NO-LOCK (err u105))
(define-constant ERR-NOT-YET-UNLOCKED (err u106))

;; ~2 weeks at ~10min/block
(define-constant MIN-LOCK-DURATION u2016)
;; ~2 years at ~10min/block
(define-constant MAX-LOCK-DURATION u105120)

;; data maps

(define-map locks
  { owner: principal }
  {
    amount: uint,
    created-at: uint,
    unlock-height: uint,
  }
)

;; public functions

;; Lock `amount` STX until `unlock-height`. Only one active lock per
;; principal at a time - unlock the existing one first to relock.
(define-public (lock-stx
    (amount uint)
    (unlock-height uint)
  )
  (let ((duration (- unlock-height stacks-block-height)))
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (is-none (map-get? locks { owner: tx-sender })) ERR-EXISTING-LOCK)
    (asserts! (>= duration MIN-LOCK-DURATION) ERR-LOCK-TOO-SHORT)
    (asserts! (<= duration MAX-LOCK-DURATION) ERR-LOCK-TOO-LONG)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (try! (as-contract (contract-call? .mock-ststxbtc-pool deposit amount)))
    (map-set locks { owner: tx-sender } {
      amount: amount,
      created-at: stacks-block-height,
      unlock-height: unlock-height,
    })
    (ok true)
  )
)

;; Withdraw STX after unlock-height has passed, clearing the lock. Pulls
;; the locker's STX back out of the pool first - the real StackingDAO
;; withdrawal this mock stands in for has its own unbonding cooldown on
;; top of this contract's own unlock-height, not simulated here yet.
(define-public (unlock-stx)
  (let (
      (owner tx-sender)
      (lock (unwrap! (map-get? locks { owner: tx-sender }) ERR-NO-LOCK))
    )
    (asserts! (>= stacks-block-height (get unlock-height lock)) ERR-NOT-YET-UNLOCKED)
    (map-delete locks { owner: owner })
    (try! (as-contract (contract-call? .mock-ststxbtc-pool withdraw (get amount lock))))
    (as-contract (stx-transfer? (get amount lock) tx-sender owner))
  )
)

;; read only functions

(define-read-only (get-lock (who principal))
  (map-get? locks { owner: who })
)

;; Linearly-decaying weight: amount * (unlock-height - current) / MAX-LOCK-DURATION.
;; Zero if no lock, or if past unlock-height.
(define-read-only (get-weight (who principal))
  (match (map-get? locks { owner: who })
    lock (let (
        (unlock-height (get unlock-height lock))
        (amount (get amount lock))
      )
      (if (>= stacks-block-height unlock-height)
        u0
        (/ (* amount (- unlock-height stacks-block-height)) MAX-LOCK-DURATION)
      )
    )
    u0
  )
)
