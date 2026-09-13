;; title: mock-stacking-dao
;; summary: Test-only stand-in for StackingDAO's stBTC staking contract.
;;   1:1 stake/unstake so bitmax-vault's accounting logic is exercised
;;   without depending on the real contract, which isn't on mainnet yet
;;   (see readme.md section 5). Swap bitmax-vault's calls to point at the
;;   real StackingDAO contract once it ships - the interface here
;;   (stake/unstake, amount in -> amount out) is a deliberately simple
;;   placeholder for that shape, not a guess at the real fee/exchange-rate
;;   mechanics, which must be confirmed against StackingDAO directly.

(define-constant ERR-ZERO-AMOUNT (err u600))

;; Stakes `amount` mock-sbtc held by the caller, minting `amount` mock-stbtc
;; back to the caller (1:1, no fee/exchange-rate simulation).
(define-public (stake (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .mock-sbtc transfer amount tx-sender (as-contract tx-sender) none))
    (contract-call? .mock-stbtc mint amount tx-sender)
  )
)

;; Unstakes `amount` mock-stbtc from the caller, returning `amount`
;; mock-sbtc (1:1).
(define-public (unstake (amount uint))
  (let ((caller tx-sender))
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .mock-stbtc burn amount caller))
    (as-contract (contract-call? .mock-sbtc transfer amount tx-sender caller none))
  )
)

;; Test-only: simulate staking yield by minting extra stBTC directly to a
;; recipient, without any corresponding sBTC stake. Used to seed yield for
;; bitmax-boost-distributor tests in a later phase - has no equivalent on
;; the real StackingDAO contract.
(define-public (accrue-yield
    (amount uint)
    (recipient principal)
  )
  (contract-call? .mock-stbtc mint amount recipient)
)
