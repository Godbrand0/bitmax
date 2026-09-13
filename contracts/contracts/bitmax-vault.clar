;; title: bitmax-vault
;; summary: Holds each depositor's sBTC-staked-into-stBTC position and an
;;   internal, boost-adjusted stBTC entitlement per depositor. Users redeem
;;   to a real, freely-transferable stBTC balance whenever they choose -
;;   the vault never wraps stBTC in a new synthetic token (see readme.md
;;   section 1 for why: it avoids depending on Zest listing a new asset).
;; description: Calls mock-sbtc/mock-stacking-dao/mock-stbtc for now (see
;;   those contracts' headers) - swap for the real StackingDAO principal
;;   once it ships on mainnet; this contract's own logic shouldn't need to
;;   change, only the contract-call targets.

;; constants

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u500))
(define-constant ERR-ZERO-AMOUNT (err u501))
(define-constant ERR-INSUFFICIENT-BALANCE (err u502))
(define-constant ERR-ALREADY-SET (err u503))

;; data vars

;; Set once, by CONTRACT-OWNER, to bitmax-boost-distributor's principal once
;; that contract is deployed (Phase 4). Until set, boost credits/debits are
;; impossible - deposit/redeem work standalone regardless.
(define-data-var boost-distributor (optional principal) none)

;; data maps

;; `amount` is the depositor's full boosted stBTC entitlement; `principal`
;; is how much of that is still "money they put in" (only ever moved by
;; deposit/redeem). The gap between them - `amount - principal` - is
;; exactly the yield/boost the frontend shows as "earned so far".
(define-map balances
  { owner: principal }
  {
    amount: uint,
    principal: uint,
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

;; Deposits `amount` mock-sbtc, stakes it via mock-stacking-dao, and credits
;; the caller's internal stBTC-entitlement balance by the same amount
;; (the mock stakes 1:1; a real integration may not, and this call site is
;; exactly where an exchange-rate read would be inserted).
(define-public (deposit (amount uint))
  (let (
      (existing (default-to { amount: u0, principal: u0 } (map-get? balances { owner: tx-sender })))
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .mock-sbtc transfer amount tx-sender (as-contract tx-sender) none))
    (try! (as-contract (contract-call? .mock-stacking-dao stake amount)))
    (map-set balances { owner: tx-sender } {
      amount: (+ (get amount existing) amount),
      principal: (+ (get principal existing) amount),
    })
    (ok true)
  )
)

;; Redeems `amount` of the caller's boosted stBTC entitlement to a real,
;; freely-transferable stBTC balance in their own wallet. This is the last
;; BitMax touches this stBTC - from here the user can supply it to Zest (or
;; anywhere else stBTC is accepted) with zero BitMax-side integration.
(define-public (redeem (amount uint))
  (let (
      (caller tx-sender)
      (existing (default-to { amount: u0, principal: u0 } (map-get? balances { owner: tx-sender })))
      (current (get amount existing))
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= current amount) ERR-INSUFFICIENT-BALANCE)
    (map-set balances { owner: caller } {
      amount: (- current amount),
      principal: (saturating-sub (get principal existing) amount),
    })
    (as-contract (contract-call? .mock-stbtc transfer amount tx-sender caller none))
  )
)

;; Redeems `amount` of the caller's entitlement all the way back to sBTC
;; (unstaking via mock-stacking-dao first), for a user headed toward a full
;; sBTC peg-out rather than continued stBTC use. Peg-out itself happens
;; off-chain via frontend/lib/sbtc.ts's initiateWithdrawal, not here.
(define-public (redeem-to-sbtc (amount uint))
  (let (
      (caller tx-sender)
      (existing (default-to { amount: u0, principal: u0 } (map-get? balances { owner: tx-sender })))
      (current (get amount existing))
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= current amount) ERR-INSUFFICIENT-BALANCE)
    (map-set balances { owner: caller } {
      amount: (- current amount),
      principal: (saturating-sub (get principal existing) amount),
    })
    (try! (as-contract (contract-call? .mock-stacking-dao unstake amount)))
    (as-contract (contract-call? .mock-sbtc transfer amount tx-sender caller none))
  )
)

;; Called only by bitmax-boost-distributor (Phase 4) at epoch close, to
;; credit a depositor's boosted share. Zero-sum with increase-balance calls
;; elsewhere in the same epoch close - the distributor is responsible for
;; the total staying equal to the vault's real held stBTC.
(define-public (increase-balance
    (who principal)
    (amount uint)
  )
  (let ((existing (default-to { amount: u0, principal: u0 } (map-get? balances { owner: who }))))
    (asserts! (is-eq (some contract-caller) (var-get boost-distributor)) ERR-NOT-AUTHORIZED)
    (map-set balances { owner: who } (merge existing { amount: (+ (get amount existing) amount) }))
    (ok true)
  )
)

(define-public (decrease-balance
    (who principal)
    (amount uint)
  )
  (let ((existing (default-to { amount: u0, principal: u0 } (map-get? balances { owner: who }))))
    (asserts! (is-eq (some contract-caller) (var-get boost-distributor)) ERR-NOT-AUTHORIZED)
    (asserts! (>= (get amount existing) amount) ERR-INSUFFICIENT-BALANCE)
    (map-set balances { owner: who } (merge existing { amount: (- (get amount existing) amount) }))
    (ok true)
  )
)

;; read only functions

(define-read-only (get-balance (who principal))
  (default-to u0 (get amount (map-get? balances { owner: who })))
)

;; How much of get-balance is still "money the depositor put in", as
;; opposed to yield/boost credited since. get-balance minus this is what
;; the frontend shows as earned.
(define-read-only (get-principal (who principal))
  (default-to u0 (get principal (map-get? balances { owner: who })))
)

(define-read-only (get-boost-distributor)
  (var-get boost-distributor)
)

;; private functions

(define-private (saturating-sub
    (a uint)
    (b uint)
  )
  (if (>= a b)
    (- a b)
    u0
  )
)
