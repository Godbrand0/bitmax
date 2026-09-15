;; title: mock-ststxbtc-pool
;; summary: Test-only stand-in for StackingDAO's real stSTXbtc product -
;;   stacking-dao-core-ststxbtc-v2.clar (deposit) plus
;;   ststxbtc-tracking-v2.clar (claim-pending-rewards). Real behavior
;;   confirmed by reading StackingDAO's own deployed source
;;   (github.com/StackingDAO/stackingdao-smart-contracts) before building
;;   this: `deposit` has no caller restriction (any principal, including a
;;   contract, can call it - confirmed there's no tx-sender/contract-caller
;;   check beyond a DAO-enabled flag), mints ststxbtc 1:1 with STX
;;   deposited (unlike stBTC, this one doesn't use an appreciating
;;   exchange rate), and the actual BTC-denominated Dual Stacking reward
;;   arrives through a *separate* claim mechanism, not through the token
;;   appreciating on its own.
;; description: ve-stx-lock.clar is the only real depositor into this mock
;;   (it pools every locker's STX into one call), so this mock simplifies
;;   accordingly: one pooled balance, one claimable reward pot, rather than
;;   per-holder tracking - ve-stx-lock is responsible for splitting what it
;;   withdraws/claims among individual lockers, this contract only needs to
;;   be correct about the pool as a whole.

;; constants

(define-constant ERR-ZERO-AMOUNT (err u800))
(define-constant ERR-INSUFFICIENT-POOLED-STX (err u801))

;; data vars

(define-data-var pooled-stx uint u0)
(define-data-var claimable-sbtc uint u0)

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

;; Withdraws `amount` STX back to the caller - instant in this mock. The
;; real stacking-dao-core-ststxbtc-v2 withdrawal flow mints an NFT receipt
;; with a real unlock cooldown (init-withdraw / withdraw, two steps) - a
;; deliberate simplification here, not a claim that the real contract is
;; instant. See readme.md for the real-integration gap this leaves open.
(define-public (withdraw (amount uint))
  (let ((caller tx-sender))
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= (var-get pooled-stx) amount) ERR-INSUFFICIENT-POOLED-STX)
    (var-set pooled-stx (- (var-get pooled-stx) amount))
    (as-contract (stx-transfer? amount tx-sender caller))
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
