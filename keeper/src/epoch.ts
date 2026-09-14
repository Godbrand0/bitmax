// When to trigger `bitmax-boost-distributor.close-epoch`. Mirrors the
// contract's own gate exactly (see close-epoch in bitmax-boost-distributor.clar):
// allowed if it has never been closed, or if EPOCH_LENGTH blocks have
// passed since the last close. A pure function so it's testable without a
// chain connection.

export function shouldCloseEpoch(
  currentHeight: bigint,
  lastCloseHeight: bigint,
  epochLength: bigint
): boolean {
  return lastCloseHeight === 0n || currentHeight >= lastCloseHeight + epochLength;
}
