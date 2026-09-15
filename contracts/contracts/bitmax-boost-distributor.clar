;; title: bitmax-boost-distributor
;; summary: At each epoch, claims the real BTC-denominated Dual Stacking
;;   reward accrued on pooled locked STX (mock-ststxbtc-pool) and pays it out
;;   in sBTC to registered participants, split purely by their ve-stx-lock
;;   weight - additive yield that only exists because STX was locked, not a
;;   redistribution of bitmax-vault's base stBTC yield (see readme.md
;;   section 6 for why that distinction matters).
;; description: Clarity has no native map/list enumeration, so depositors
;;   must self-`register` into a bounded participant list (MAX-PARTICIPANTS)
;;   for the epoch pass to iterate over - an explicit MVP scale limit, not
;;   an oversight. Participants with no active ve-stx-lock (weight u0) are
;;   harmless to keep registered - they simply receive no share, since the
;;   whole pot is split proportionally by weight alone.

;; constants

(define-constant ERR-TOO-SOON (err u700))
(define-constant ERR-LIST-FULL (err u701))

(define-constant MAX-PARTICIPANTS u200)
;; ~1 day at ~10min/block
(define-constant EPOCH-LENGTH u144)

;; data vars

(define-data-var participants (list 200 principal) (list))
(define-data-var last-epoch-close-height uint u0)
;; Snapshots from the most recent close-epoch call, kept for transparency
;; (dashboard/debugging), not required for the next call's correctness.
(define-data-var epoch-total-weight uint u0)
(define-data-var epoch-total-claimed uint u0)

;; public functions

;; Self-registration is required to be included in epoch distributions -
;; depositing into bitmax-vault or locking in ve-stx-lock does not, by
;; itself, add a principal to this list.
(define-public (register)
  (let ((current (var-get participants)))
    (if (is-some (index-of current tx-sender))
      (ok true)
      (match (as-max-len? (append current tx-sender) u200)
        updated (begin
          (var-set participants updated)
          (ok true)
        )
        ERR-LIST-FULL
      )
    )
  )
)

;; Permissionless. Claims the sBTC currently sitting in
;; mock-ststxbtc-pool's reward pot (the Dual Stacking yield earned on
;; every locker's pooled STX) and pays it out to registered participants,
;; proportional to their ve-stx-lock weight - participants with no active
;; lock get nothing, since there's nothing to boost for them.
(define-public (close-epoch)
  (begin
    (asserts!
      (or
        (is-eq (var-get last-epoch-close-height) u0)
        (>= stacks-block-height (+ (var-get last-epoch-close-height) EPOCH-LENGTH))
      )
      ERR-TOO-SOON
    )
    (let (
        (participant-list (var-get participants))
        (claim-amount (contract-call? .mock-ststxbtc-pool get-claimable-sbtc))
        (total-weight (fold sum-weight participant-list u0))
      )
      (var-set epoch-total-weight total-weight)
      (var-set epoch-total-claimed claim-amount)
      (var-set last-epoch-close-height stacks-block-height)
      (if (or (is-eq claim-amount u0) (is-eq total-weight u0))
        (ok u0)
        (begin
          (try! (as-contract (contract-call? .mock-ststxbtc-pool claim-rewards)))
          (map credit-share participant-list)
          (ok claim-amount)
        )
      )
    )
  )
)

;; read only functions

(define-read-only (get-participants)
  (var-get participants)
)

(define-read-only (get-last-epoch-close-height)
  (var-get last-epoch-close-height)
)

(define-read-only (get-epoch-stats)
  {
    total-weight: (var-get epoch-total-weight),
    total-claimed: (var-get epoch-total-claimed),
  }
)

;; private functions

(define-private (weight-of (who principal))
  (contract-call? .ve-stx-lock get-weight who)
)

(define-private (sum-weight
    (who principal)
    (acc uint)
  )
  (+ acc (weight-of who))
)

;; Each share is floored by integer division, so the sum paid out across
;; all participants can fall a few units short of epoch-total-claimed
;; (never over) - the shortfall is simply left sitting in this contract's
;; own sBTC balance rather than redistributed, a deliberate
;; simplicity/precision tradeoff for this MVP.
(define-private (credit-share (who principal))
  (let (
      (total-w (var-get epoch-total-weight))
      (w (weight-of who))
    )
    (if (is-eq w u0)
      true
      (let ((share (/ (* (var-get epoch-total-claimed) w) total-w)))
        (begin
          (unwrap-panic (as-contract (contract-call? .mock-sbtc transfer share tx-sender who none)))
          true
        )
      )
    )
  )
)
