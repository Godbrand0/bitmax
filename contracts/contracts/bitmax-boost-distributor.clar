;; title: bitmax-boost-distributor
;; summary: At each epoch, redistributes bitmax-vault's real stBTC yield
;;   across registered depositors, weighted by their ve-stx-lock weight -
;;   a zero-sum redistribution (see readme.md section 6): boosted
;;   depositors get more than flat pro-rata, unboosted depositors get less.
;; description: Clarity has no native map/list enumeration, so depositors
;;   must self-`register` into a bounded participant list (MAX-PARTICIPANTS)
;;   for the epoch pass to iterate over - an explicit MVP scale limit, not
;;   an oversight. Weight (STX, ~1e14 units) and balance (sats, far smaller)
;;   are different units, so the boost formula works in normalized SHARES
;;   (each participant's fraction of the total), not raw unit sums - see
;;   `boosted-weight-of` below for the exact formula.

;; constants

(define-constant ERR-TOO-SOON (err u700))
(define-constant ERR-LIST-FULL (err u701))
(define-constant ERR-ACCOUNTING-MISMATCH (err u702))

(define-constant MAX-PARTICIPANTS u200)
;; ~1 day at ~10min/block
(define-constant EPOCH-LENGTH u144)
;; Fixed-point scale for the boost-multiplier math below.
(define-constant PRECISION u1000000)
;; A participant holding 100% of total ve-stx-lock weight gets up to a
;; (1 + BOOST-FACTOR)x multiplier on their balance-proportional share.
;; Tunable placeholder, not a value derived from any external precedent.
(define-constant BOOST-FACTOR u1)

;; data vars

(define-data-var participants (list 200 principal) (list))
(define-data-var last-epoch-close-height uint u0)
;; Snapshots from the most recent close-epoch call, kept for transparency
;; (dashboard/debugging), not required for the next call's correctness.
(define-data-var epoch-total-weight uint u0)
(define-data-var epoch-total-balance uint u0)
(define-data-var epoch-total-yield uint u0)
(define-data-var epoch-total-boosted-weight uint u0)

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

;; Permissionless. Totals bitmax-vault's real stBTC yield since the last
;; close, and credits each registered participant's boosted share via
;; bitmax-vault's increase-balance hook.
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
        (real-total (unwrap-panic (contract-call? .mock-stbtc get-balance .bitmax-vault)))
        (tracked-total (fold sum-balance participant-list u0))
      )
      (asserts! (>= real-total tracked-total) ERR-ACCOUNTING-MISMATCH)
      (var-set epoch-total-balance tracked-total)
      (var-set epoch-total-weight (fold sum-weight participant-list u0))
      (var-set epoch-total-yield (- real-total tracked-total))
      (if (or (is-eq (var-get epoch-total-yield) u0) (is-eq tracked-total u0))
        (begin
          (var-set last-epoch-close-height stacks-block-height)
          (ok u0)
        )
        (begin
          (var-set epoch-total-boosted-weight (fold sum-boosted-weight participant-list u0))
          (map credit-share participant-list)
          (var-set last-epoch-close-height stacks-block-height)
          (ok (var-get epoch-total-yield))
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
    total-balance: (var-get epoch-total-balance),
    total-yield: (var-get epoch-total-yield),
    total-boosted-weight: (var-get epoch-total-boosted-weight),
  }
)

;; private functions

(define-private (weight-of (who principal))
  (contract-call? .ve-stx-lock get-weight who)
)

(define-private (balance-of (who principal))
  (contract-call? .bitmax-vault get-balance who)
)

(define-private (sum-weight
    (who principal)
    (acc uint)
  )
  (+ acc (weight-of who))
)

(define-private (sum-balance
    (who principal)
    (acc uint)
  )
  (+ acc (balance-of who))
)

;; boosted-weight(i) = balance(i) * PRECISION * (1 + BOOST-FACTOR * weight-share(i))
;; where weight-share(i) = weight(i) / total-weight. Same PRECISION factor
;; applied to every participant, so ratios between participants (and hence
;; each participant's final normalized share) are correct regardless of its
;; value - it only exists to avoid truncating small weight-shares to zero.
(define-private (boosted-weight-of (who principal))
  (let (
      (bal (balance-of who))
      (w (weight-of who))
      (total-w (var-get epoch-total-weight))
    )
    (if (is-eq total-w u0)
      (* bal PRECISION)
      (* bal (+ PRECISION (/ (* BOOST-FACTOR w PRECISION) total-w)))
    )
  )
)

(define-private (sum-boosted-weight
    (who principal)
    (acc uint)
  )
  (+ acc (boosted-weight-of who))
)

;; Each share is floored by integer division, so the sum credited across
;; all participants can fall a few units short of epoch-total-yield (never
;; over) - the shortfall is simply left uncredited in the vault rather than
;; redistributed, a deliberate simplicity/precision tradeoff for this MVP.
(define-private (credit-share (who principal))
  (let ((total-bw (var-get epoch-total-boosted-weight)))
    (if (is-eq total-bw u0)
      true
      (let ((share (/ (* (var-get epoch-total-yield) (boosted-weight-of who)) total-bw)))
        (begin
          (unwrap-panic (contract-call? .bitmax-vault increase-balance who share))
          true
        )
      )
    )
  )
)
