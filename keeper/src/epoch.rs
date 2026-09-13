//! When to trigger `bitmax-boost-distributor.close-epoch`. Mirrors the
//! contract's own gate exactly (see close-epoch in bitmax-boost-distributor.clar):
//! allowed if it has never been closed, or if EPOCH_LENGTH blocks have
//! passed since the last close. Kept as a pure function so it's testable
//! without a chain connection.

pub fn should_close_epoch(current_height: u64, last_close_height: u64, epoch_length: u64) -> bool {
    last_close_height == 0 || current_height >= last_close_height + epoch_length
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_the_first_ever_close_at_any_height() {
        assert!(should_close_epoch(1, 0, 144));
        assert!(should_close_epoch(100_000, 0, 144));
    }

    #[test]
    fn rejects_closing_before_epoch_length_has_passed() {
        assert!(!should_close_epoch(100, 50, 144));
        assert!(!should_close_epoch(193, 50, 144)); // one block short
    }

    #[test]
    fn allows_closing_once_epoch_length_has_passed() {
        assert!(should_close_epoch(194, 50, 144)); // exactly on the boundary
        assert!(should_close_epoch(500, 50, 144));
    }
}
