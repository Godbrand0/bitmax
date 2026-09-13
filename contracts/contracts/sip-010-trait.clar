;; title: sip-010-trait
;; summary: Standard SIP-010 fungible token trait, implemented by the mock
;;   sBTC/stBTC tokens so their interface matches the real ones.

(define-trait sip-010-trait (
  (transfer (uint principal principal (optional (buff 34))) (response bool uint))
  (get-name () (response (string-ascii 32) uint))
  (get-symbol () (response (string-ascii 32) uint))
  (get-decimals () (response uint uint))
  (get-balance (principal) (response uint uint))
  (get-total-supply () (response uint uint))
  (get-token-uri () (response (optional (string-utf8 256)) uint))
))
