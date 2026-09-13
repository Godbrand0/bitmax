;; title: mock-stbtc
;; summary: Test-only stand-in for StackingDAO's real stBTC SIP-010 token.
;;   Mint/burn are restricted to mock-stacking-dao, the contract that owns
;;   the stake/unstake logic - matching how a real LST's supply is only
;;   ever changed by its own staking contract, never a third party.

(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token mock-stbtc)

(define-constant ERR-NOT-TOKEN-OWNER (err u400))
(define-constant ERR-NOT-AUTHORIZED (err u401))

(define-public (mint
    (amount uint)
    (recipient principal)
  )
  (begin
    (asserts! (is-eq contract-caller .mock-stacking-dao) ERR-NOT-AUTHORIZED)
    (ft-mint? mock-stbtc amount recipient)
  )
)

(define-public (burn
    (amount uint)
    (owner principal)
  )
  (begin
    (asserts! (is-eq contract-caller .mock-stacking-dao) ERR-NOT-AUTHORIZED)
    (ft-burn? mock-stbtc amount owner)
  )
)

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
    (try! (ft-transfer? mock-stbtc amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

(define-read-only (get-name)
  (ok "Mock stBTC")
)

(define-read-only (get-symbol)
  (ok "stBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance mock-stbtc who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply mock-stbtc))
)

(define-read-only (get-token-uri)
  (ok none)
)
