;; title: mock-sbtc
;; summary: Test-only stand-in for the real sBTC SIP-010 token. Real sBTC is
;;   minted via the Bitcoin peg-in flow (see frontend/lib/sbtc.ts); this mock
;;   lets bitmax-vault's staking logic be built and tested on devnet before
;;   swapping in the real sBTC contract principal, via a plain `mint` anyone
;;   can call (the real sBTC token has no such public mint).

(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token mock-sbtc)

(define-constant ERR-NOT-TOKEN-OWNER (err u400))

(define-public (mint
    (amount uint)
    (recipient principal)
  )
  (ft-mint? mock-sbtc amount recipient)
)

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
    (try! (ft-transfer? mock-sbtc amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

(define-read-only (get-name)
  (ok "Mock sBTC")
)

(define-read-only (get-symbol)
  (ok "sBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance mock-sbtc who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply mock-sbtc))
)

(define-read-only (get-token-uri)
  (ok none)
)
