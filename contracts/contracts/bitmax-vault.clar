;; title: bitmax-vault
;; summary: Holds pooled, real StackingDAO stBTC on behalf of every
;;   depositor and tracks each depositor's own stBTC entitlement plus
;;   original sBTC principal. Users redeem to a real, freely-transferable
;;   stBTC balance whenever they choose - the vault never wraps stBTC in a
;;   new synthetic token (see readme.md section 1 for why: it avoids
;;   depending on Zest listing a new asset).
;; description: Calls StackingDAO's real, live mainnet contracts directly
;;   (stacking-dao-core-stbtc-v1, data-stbtc-v1) - confirmed against
;;   StackingDAO's own deployed source
;;   (github.com/StackingDAO/stackingdao-smart-contracts, fetched
;;   directly, Sept 2026) - not guessed, and not a devnet/testnet mock.
;;
;;   Those contracts are passed in as trait-typed parameters, not called
;;   via a hardcoded absolute principal, for a real Clarity constraint:
;;   `clarinet check` cannot statically resolve a `contract-call?` to a
;;   contract whose source isn't part of this project (confirmed: it
;;   fails with "use of unresolved contract", and the installed Clarinet
;;   SDK's remote-mainnet-fork feature can't parse StackingDAO's real
;;   contracts' Clarity epoch either - verified directly, not assumed).
;;   This is the exact same constraint Zest Protocol's own real
;;   `supply-collateral-add` is built around (`(ft <ft-trait>)`, not a
;;   hardcoded token principal) - and the same security obligation
;;   follows: accepting an arbitrary trait-typed principal without
;;   checking it is really StackingDAO's contract would let a caller pass
;;   a fake one and trick this vault into crediting fabricated stBTC that
;;   has no real backing. Every trait-typed parameter below is asserted
;;   equal to its known real mainnet principal before any state changes,
;;   for exactly that reason - the trait exists to satisfy the compiler,
;;   the assertion is what actually secures the call.
;;
;;   This makes the contract mainnet-only by construction, not by choice:
;;   a relative `.foo` contract-call in Clarity can only ever resolve to a
;;   contract the SAME deployer controls, never to StackingDAO's own
;;   principal - so there is no environment-conditional way to keep a
;;   devnet mock path alive here, the same hard constraint that already
;;   makes lib/zest.ts's Borrow integration mainnet-only. Deposits and
;;   redeem-to-sbtc calls made against this contract on devnet/testnet
;;   will simply fail the pinned-principal assertion (the real
;;   StackingDAO contracts don't exist there under this same principal) -
;;   gate the UI on network the same way ZEST_AVAILABLE already does.
;;
;;   Local `clarinet test` coverage is correspondingly limited: every
;;   public function needs a successful call into StackingDAO's real
;;   contract to do anything useful, which simnet can't reach (see above)
;;   - so this leg has zero local simnet coverage, same situation the
;;   Zest integration already accepted. Verified instead by direct
;;   comparison against StackingDAO's deployed source and live mainnet
;;   reads, not simnet execution.
;;
;;   Redeeming all the way back to sBTC (`request-redeem-to-sbtc` /
;;   `claim-redeem-to-sbtc`) is two real steps with a real cooldown in
;;   between, mirroring ve-stx-lock.clar's own request-unlock /
;;   claim-unlock exactly, for the same reason: StackingDAO's real
;;   withdrawal flow is NFT-ticketed and cooldown-gated (confirmed live on
;;   mainnet: 4200 burn blocks, ~29 days), not instant.

;; traits

;; The subset of StackingDAO's real stacking-dao-core-stbtc-v1 interface
;; this vault calls - defined locally since it isn't a published trait
;; anywhere, matching the real contract's own function signatures exactly
;; (confirmed against its deployed source).
(define-trait stbtc-core-trait (
  (deposit (uint uint) (response uint uint))
  (init-withdraw (uint) (response uint uint))
  (withdraw (uint) (response { sbtc-user: uint, sbtc-fee: uint } uint))
))

(use-trait ft-trait .sip-010-trait.sip-010-trait)

;; constants

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u500))
(define-constant ERR-ZERO-AMOUNT (err u501))
(define-constant ERR-INSUFFICIENT-BALANCE (err u502))
(define-constant ERR-ALREADY-SET (err u503))
(define-constant ERR-EXISTING-WITHDRAWAL (err u504))
(define-constant ERR-NO-PENDING-WITHDRAWAL (err u505))
;; A trait-typed parameter didn't resolve to the real, known contract it
;; claims to be - see this file's header for why this check exists at all.
(define-constant ERR-WRONG-CONTRACT (err u506))

;; StackingDAO's and sBTC's real, live mainnet principals - what every
;; trait-typed parameter below is checked against. Confirmed via each
;; protocol's own deployed source, not guessed. data-stbtc-v1 (the
;; exchange-rate contract) isn't listed here - this contract never calls
;; it directly, see deposit's own comment for why.
(define-constant STACKINGDAO-STBTC-CORE 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-stbtc-v1)
(define-constant STACKINGDAO-STBTC-TOKEN 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stbtc-token)
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; data vars

;; Set once, by CONTRACT-OWNER, to bitmax-boost-distributor's principal.
;; Currently unused by this contract (the boost payout is real sBTC paid
;; straight to each locker's wallet, tracked in
;; bitmax-boost-distributor.clar's own lifetime-boost-paid map - it never
;; touches this vault at all) - kept for a future integration that credits
;; boosted yield through the vault balance itself, not yet built.
(define-data-var boost-distributor (optional principal) none)

;; data maps

;; `stbtc-owned` is the depositor's real, live claim on this vault's pooled
;; stBTC holdings - not an sBTC amount. `principal` stays sBTC-denominated:
;; how much real sBTC they've put in, net of what they've redeemed out,
;; reduced proportionally on partial redemption (see request-redeem-to-sbtc
;; and redeem's own comments for why a straight subtraction would be a unit
;; mismatch once the exchange rate has moved away from 1:1).
(define-map balances
  { owner: principal }
  {
    stbtc-owned: uint,
    principal: uint,
  }
)

;; Set by request-redeem-to-sbtc, cleared by claim-redeem-to-sbtc. Mirrors
;; ve-stx-lock.clar's pending-withdrawals exactly: one pending withdrawal
;; per principal at a time. `nft-id` is StackingDAO's own real withdrawal
;; ticket id - this vault deliberately doesn't cache the ticket's amount or
;; unlock height, both of which are readable live and authoritatively from
;; StackingDAO's own withdraw-data-stbtc.get-withdrawals-by-nft instead of
;; risking a stale local copy drifting from StackingDAO's own record.
(define-map pending-sbtc-withdrawals
  { owner: principal }
  { nft-id: uint }
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

;; Deposits `amount` real sBTC, stakes it via StackingDAO's real
;; stacking-dao-core-stbtc-v1, and credits the caller with however much
;; real stBTC that mints - NOT assumed to be 1:1 with `amount`, since
;; StackingDAO's stBTC already carries an appreciating exchange rate
;; (confirmed live: ~1.0012 sBTC per stBTC as of this writing, not 1.0).
;;
;; `min-stbtc-out` is supplied by the caller rather than computed in this
;; function: a Clarity trait's own function signatures must return a
;; `(response T E)` type (confirmed: `clarinet check` rejects a trait
;; function declared to return a bare uint as an "invalid trait
;; definition"), and StackingDAO's real get-sbtc-per-stbtc-up returns a
;; bare uint - so it can't be wrapped in a trait to read in-line here at
;; all. The frontend reads that live rate directly (a plain off-chain
;; read, not a Clarity call) and passes a 1%-under-expected minimum, the
;; same pattern lib/zest.ts's supplyStbtcCollateral already uses for its
;; own min-shares slippage protection.
;;
;; sbtc-token/stbtc-core are trait-typed (see this file's header) - the
;; frontend passes StackingDAO's and sBTC's real mainnet principals,
;; checked below before anything moves.
(define-public (deposit
    (amount uint)
    (min-stbtc-out uint)
    (sbtc-token <ft-trait>)
    (stbtc-core <stbtc-core-trait>)
  )
  (let (
      (existing (default-to { stbtc-owned: u0, principal: u0 } (map-get? balances { owner: tx-sender })))
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (is-eq (contract-of sbtc-token) SBTC-TOKEN) ERR-WRONG-CONTRACT)
    (asserts! (is-eq (contract-of stbtc-core) STACKINGDAO-STBTC-CORE) ERR-WRONG-CONTRACT)
    (try! (contract-call? sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
    (let ((minted (try! (as-contract (contract-call? stbtc-core deposit amount min-stbtc-out)))))
      (map-set balances { owner: tx-sender } {
        stbtc-owned: (+ (get stbtc-owned existing) minted),
        principal: (+ (get principal existing) amount),
      })
      (ok minted)
    )
  )
)

;; Redeems `stbtc-amount` of the caller's real stBTC entitlement to a
;; plain, freely-transferable stBTC balance in their own wallet - no
;; StackingDAO call needed here at all, since the stBTC being transferred
;; already carries its own appreciated value; this contract just relays it
;; out of its own pooled holdings. This is the last point BitMax touches
;; it - from here it's usable anywhere stBTC is accepted, including as
;; Zest collateral.
(define-public (redeem
    (stbtc-amount uint)
    (stbtc-token <ft-trait>)
  )
  (let (
      (caller tx-sender)
      (existing (default-to { stbtc-owned: u0, principal: u0 } (map-get? balances { owner: tx-sender })))
      (current (get stbtc-owned existing))
      ;; Principal is sBTC-denominated, stbtc-amount is stBTC-denominated -
      ;; reduce principal by the same FRACTION of the position being
      ;; redeemed, not by the raw stbtc-amount itself (a straight
      ;; subtraction would be a unit mismatch once the exchange rate has
      ;; moved away from 1:1).
      (principal-reduction (if (> current u0) (/ (* (get principal existing) stbtc-amount) current) u0))
    )
    (asserts! (> stbtc-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= current stbtc-amount) ERR-INSUFFICIENT-BALANCE)
    (asserts! (is-eq (contract-of stbtc-token) STACKINGDAO-STBTC-TOKEN) ERR-WRONG-CONTRACT)
    (map-set balances { owner: caller } {
      stbtc-owned: (- current stbtc-amount),
      principal: (saturating-sub (get principal existing) principal-reduction),
    })
    (as-contract (contract-call? stbtc-token transfer stbtc-amount tx-sender caller none))
  )
)

;; Step 1 of 2 for redeeming all the way back to sBTC (for a user headed
;; toward a full sBTC peg-out rather than continued stBTC use - the
;; peg-out itself happens off-chain via frontend/lib/sbtc.ts's
;; initiateWithdrawal, not here). Starts StackingDAO's own real withdrawal
;; cooldown via init-withdraw - no sBTC moves yet, only the caller's own
;; stBTC leaves this contract's pooled holdings, into StackingDAO's own
;; custody for the duration of the cooldown.
(define-public (request-redeem-to-sbtc
    (stbtc-amount uint)
    (stbtc-core <stbtc-core-trait>)
  )
  (let (
      (caller tx-sender)
      (existing (default-to { stbtc-owned: u0, principal: u0 } (map-get? balances { owner: tx-sender })))
      (current (get stbtc-owned existing))
      (principal-reduction (if (> current u0) (/ (* (get principal existing) stbtc-amount) current) u0))
    )
    (asserts! (> stbtc-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= current stbtc-amount) ERR-INSUFFICIENT-BALANCE)
    (asserts! (is-none (map-get? pending-sbtc-withdrawals { owner: caller })) ERR-EXISTING-WITHDRAWAL)
    (asserts! (is-eq (contract-of stbtc-core) STACKINGDAO-STBTC-CORE) ERR-WRONG-CONTRACT)
    (map-set balances { owner: caller } {
      stbtc-owned: (- current stbtc-amount),
      principal: (saturating-sub (get principal existing) principal-reduction),
    })
    (let ((nft-id (try! (as-contract (contract-call? stbtc-core init-withdraw stbtc-amount)))))
      (map-set pending-sbtc-withdrawals { owner: caller } { nft-id: nft-id })
      (ok nft-id)
    )
  )
)

;; Step 2 of 2. Pays out real sBTC to the caller once StackingDAO's own
;; withdrawal cooldown has passed - StackingDAO's own contract enforces
;; that timing and computes the exact (fee-adjusted) sbtc-user amount; this
;; contract just relays whatever it returns and clears the pending entry.
(define-public (claim-redeem-to-sbtc
    (stbtc-core <stbtc-core-trait>)
    (sbtc-token <ft-trait>)
  )
  (let (
      (owner tx-sender)
      (pending (unwrap! (map-get? pending-sbtc-withdrawals { owner: tx-sender }) ERR-NO-PENDING-WITHDRAWAL))
    )
    (asserts! (is-eq (contract-of stbtc-core) STACKINGDAO-STBTC-CORE) ERR-WRONG-CONTRACT)
    (asserts! (is-eq (contract-of sbtc-token) SBTC-TOKEN) ERR-WRONG-CONTRACT)
    (map-delete pending-sbtc-withdrawals { owner: owner })
    (let ((result (try! (as-contract (contract-call? stbtc-core withdraw (get nft-id pending))))))
      (as-contract (contract-call? sbtc-token transfer (get sbtc-user result) tx-sender owner none))
    )
  )
)

;; read only functions

;; The caller's real stBTC entitlement, in raw stBTC terms - what
;; redeem/request-redeem-to-sbtc actually operate on.
;;
;; Deliberately NOT converted to an sBTC-equivalent value here: Clarity's
;; analyzer rejects a `define-read-only` function making an external
;; `contract-call?` at all unless the target's interface is staticly
;; resolvable, which an absolute-principal contract outside this project
;; never is (confirmed: `clarinet check` fails with "expecting read-only
;; statements, detected a writing operation" / "use of unresolved
;; contract" when this function tried to read StackingDAO's real
;; data-stbtc-v1.get-sbtc-per-stbtc inline) - and unlike the public
;; functions above, a read-only function can't take a trait-typed
;; parameter to work around it either (nothing signs a read-only call, so
;; there's no transaction to attach a trait argument to).
;;
;; The live sBTC-equivalent value this represents is computed in the
;; frontend instead (lib/vault.ts's getVaultBalance), by combining this
;; read with a separate, direct read of StackingDAO's own live exchange
;; rate - the same two-reads-combined-client-side pattern lib/zest.ts
;; already uses for its own borrow-estimate math.
(define-read-only (get-balance (who principal))
  (default-to u0 (get stbtc-owned (map-get? balances { owner: who })))
)

;; How much of get-balance is still "money the depositor put in", in sBTC
;; terms, as opposed to yield accrued since. Comparing this against the
;; live sBTC-equivalent value (see get-balance's own comment) is what the
;; frontend shows as earned.
(define-read-only (get-principal (who principal))
  (default-to u0 (get principal (map-get? balances { owner: who })))
)

(define-read-only (get-pending-sbtc-withdrawal (who principal))
  (map-get? pending-sbtc-withdrawals { owner: who })
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
