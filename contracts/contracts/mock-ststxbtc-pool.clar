;; title: mock-ststxbtc-pool
;; summary: Test-only stand-in for StackingDAO's real stSTXbtc product -
;;   stacking-dao-core-ststxbtc-v2.clar (deposit/init-withdraw/withdraw)
;;   plus ststxbtc-tracking-v2.clar (claim-pending-rewards). Real behavior
;;   confirmed by reading StackingDAO's own deployed source
;;   (github.com/StackingDAO/stackingdao-smart-contracts) before building
;;   this: `deposit` has no caller restriction (any principal, including a
;;   contract, can call it - confirmed there's no tx-sender/contract-caller
;;   check beyond a DAO-enabled flag), mints ststxbtc 1:1 with STX
;;   deposited (unlike stBTC, this one doesn't use an appreciating
;;   exchange rate), and the actual BTC-denominated Dual Stacking reward
;;   arrives through a *separate* claim mechanism, not through the token
;;   appreciating on its own.
;;
;;   Exiting is two real steps, not one: `init-withdraw` starts a cooldown
;;   and hands back a ticket id (the real contract mints an actual NFT for
;;   this; this mock uses a plain ticket map instead, since only
;;   ve-stx-lock - not end users - ever holds one, so SIP-009 semantics add
;;   nothing here), and `withdraw` only pays out once that cooldown has
;;   passed - confirmed live on mainnet via
;;   ststxbtc-data-v2.get-withdraw-cooldown-blocks (currently 2100 burn
;;   blocks, ~2 weeks; that value is admin-settable on their side via
;;   set-withdraw-cooldown-blocks, so WITHDRAW-COOLDOWN-BLOCKS below is
;;   this mock's own fixed choice, not a live mirror of theirs).
;; description: ve-stx-lock.clar is the only real depositor into this mock
;;   (it pools every locker's STX into one call), so this mock simplifies
;;   accordingly: one pooled balance, one claimable reward pot, rather than
;;   per-holder tracking - ve-stx-lock is responsible for splitting what it
;;   withdraws/claims among individual lockers, this contract only needs to
;;   be correct about the pool as a whole. Withdrawal tickets ARE tracked
;;   per-holder (by whichever principal called init-withdraw - in practice
;;   always ve-stx-lock, via as-contract), since a cooldown ticket is
;;   inherently an individual claim, not a pooled one.

;; constants

(define-constant ERR-ZERO-AMOUNT (err u800))
(define-constant ERR-INSUFFICIENT-POOLED-STX (err u801))
(define-constant ERR-NO-TICKET (err u802))
(define-constant ERR-NOT-TICKET-OWNER (err u803))
(define-constant ERR-NOT-YET-UNLOCKED (err u804))

;; ~2 weeks of burn (Bitcoin) blocks at ~10min/block - see this contract's
;; header for why this is a fixed mock choice, not a live-mirrored value.
(define-constant WITHDRAW-COOLDOWN-BLOCKS u2016)

;; data vars

(define-data-var pooled-stx uint u0)
(define-data-var claimable-sbtc uint u0)
(define-data-var next-ticket-id uint u0)

;; data maps

(define-map withdrawal-tickets
  { id: uint }
  {
    owner: principal,
    amount: uint,
    unlock-height: uint,
  }
)

;; public functions

;; Deposits `amount` STX from the caller (in practice, always ve-stx-lock,
;; pooling many lockers' STX into one call) into the mock stSTXbtc
;; position. Real contract mints ststxbtc 1:1 here too - no share math
;; needed since there's only ever one depositor in this design.
(define-public (deposit (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (var-set pooled-stx (+ (var-get pooled-stx) amount))
    (ok amount)
  )
)

;; Step 1 of 2 for exiting. Removes `amount` from the pooled balance right
;; away (mirrors the real contract locking it via stx-reserve-v2 at this
;; same step) and issues a ticket that becomes claimable after
;; WITHDRAW-COOLDOWN-BLOCKS - no STX moves to the caller yet.
(define-public (init-withdraw (amount uint))
  (let (
      (caller tx-sender)
      (id (var-get next-ticket-id))
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= (var-get pooled-stx) amount) ERR-INSUFFICIENT-POOLED-STX)
    (var-set pooled-stx (- (var-get pooled-stx) amount))
    (map-set withdrawal-tickets { id: id } {
      owner: caller,
      amount: amount,
      unlock-height: (+ burn-block-height WITHDRAW-COOLDOWN-BLOCKS),
    })
    (var-set next-ticket-id (+ id u1))
    (ok id)
  )
)

;; Step 2 of 2. Pays out a ticket's STX to its owner once its cooldown has
;; passed, and burns the ticket. Only the ticket's own owner can claim it.
(define-public (withdraw (id uint))
  (let (
      (caller tx-sender)
      (ticket (unwrap! (map-get? withdrawal-tickets { id: id }) ERR-NO-TICKET))
    )
    (asserts! (is-eq caller (get owner ticket)) ERR-NOT-TICKET-OWNER)
    (asserts! (>= burn-block-height (get unlock-height ticket)) ERR-NOT-YET-UNLOCKED)
    (map-delete withdrawal-tickets { id: id })
    (as-contract (stx-transfer? (get amount ticket) tx-sender caller))
  )
)

;; Pays out the entire currently-claimable sBTC reward pot to the caller,
;; zeroing it. Mints nothing itself - relies on accrue-yield (test-only,
;; below) having already put real mock-sbtc into this contract's own
;; balance to back the payout, the same invariant bitmax-boost-distributor
;; already depends on elsewhere (see its own header comment).
(define-public (claim-rewards)
  (let (
      (caller tx-sender)
      (amount (var-get claimable-sbtc))
    )
    (var-set claimable-sbtc u0)
    (as-contract (contract-call? .mock-sbtc transfer amount tx-sender caller none))
  )
)

;; read only functions

(define-read-only (get-pooled-stx)
  (var-get pooled-stx)
)

(define-read-only (get-claimable-sbtc)
  (var-get claimable-sbtc)
)

(define-read-only (get-withdrawal-ticket (id uint))
  (map-get? withdrawal-tickets { id: id })
)

;; test-only functions

;; Simulates the real BTC-denominated Dual Stacking reward becoming
;; claimable, funded by minting real mock-sbtc into this contract's own
;; balance so claim-rewards has something real to pay out.
(define-public (accrue-yield (amount uint))
  (begin
    (try! (as-contract (contract-call? .mock-sbtc mint amount tx-sender)))
    (var-set claimable-sbtc (+ (var-get claimable-sbtc) amount))
    (ok true)
  )
)
