//! Minimal read access to a Stacks node: current chain height and read-only
//! contract calls, decoded just enough to pull a `uint` out of the response.
//!
//! Deliberately hand-rolled rather than pulled in from a crate: the only
//! Rust crate offering this (`stacks-rs`) hasn't been updated since March
//! 2024, and decoding a single Clarity type here is a few lines - not worth
//! the dependency risk. Transaction *signing/broadcast* is a different
//! story (see `submit.rs` / `scripts/submit-close-epoch.mjs`) - that's
//! security-sensitive enough that it's delegated to `@stacks/transactions`,
//! an actively-maintained library, instead of hand-rolling it here too.

use anyhow::{bail, Context, Result};
use serde::Deserialize;
use serde_json::json;

pub struct StacksClient {
    base_url: String,
    http: reqwest::Client,
}

#[derive(Deserialize)]
struct InfoResponse {
    stacks_tip_height: u64,
}

#[derive(Deserialize)]
struct CallReadOnlyResponse {
    okay: bool,
    result: Option<String>,
    cause: Option<String>,
}

impl StacksClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            http: reqwest::Client::new(),
        }
    }

    pub async fn get_block_height(&self) -> Result<u64> {
        let url = format!("{}/v2/info", self.base_url);
        let info: InfoResponse = self
            .http
            .get(&url)
            .send()
            .await
            .context("requesting /v2/info")?
            .error_for_status()
            .context("/v2/info returned an error status")?
            .json()
            .await
            .context("parsing /v2/info response")?;
        Ok(info.stacks_tip_height)
    }

    /// Calls a read-only function that returns a plain `uint` (not wrapped
    /// in a `(response ...)`), as `get-last-epoch-close-height` does.
    pub async fn call_read_only_uint(
        &self,
        contract_address: &str,
        contract_name: &str,
        function_name: &str,
        sender: &str,
    ) -> Result<u64> {
        let url = format!(
            "{}/v2/contracts/call-read/{}/{}/{}",
            self.base_url, contract_address, contract_name, function_name
        );
        let body = json!({ "sender": sender, "arguments": [] });
        let parsed: CallReadOnlyResponse = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .context("requesting call-read-only")?
            .error_for_status()
            .context("call-read-only returned an error status")?
            .json()
            .await
            .context("parsing call-read-only response")?;

        if !parsed.okay {
            bail!(
                "call-read-only for {function_name} failed: {}",
                parsed.cause.unwrap_or_default()
            );
        }
        let hex = parsed
            .result
            .context("call-read-only response missing `result`")?;
        decode_uint_hex(&hex)
    }
}

/// Decodes a hex-encoded Clarity `uint` value, e.g. `"0x0100000000000000000000000000000001"`.
/// Clarity's serialized-value format prefixes a `uint` with type byte
/// `0x01` followed by a 16-byte big-endian integer. This is the only
/// Clarity type this keeper ever needs to decode, so a single-purpose
/// decoder is enough - no general Clarity-value parser needed.
fn decode_uint_hex(hex: &str) -> Result<u64> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);
    let bytes = hex::decode(hex).context("decoding hex Clarity value")?;
    if bytes.len() != 17 || bytes[0] != 0x01 {
        bail!("expected a 17-byte Clarity uint (type byte 0x01), got {bytes:?}");
    }
    // last 8 bytes are enough for any realistic block height / epoch value;
    // a uint this large would overflow u64 well before it mattered here.
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&bytes[9..17]);
    Ok(u64::from_be_bytes(buf))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Builds a Clarity-serialized uint hex string the same way a real
    /// Stacks node would, for a given value and type byte.
    fn encode(type_byte: u8, value: u128) -> String {
        let mut bytes = vec![type_byte];
        bytes.extend_from_slice(&value.to_be_bytes());
        format!("0x{}", hex::encode(bytes))
    }

    #[test]
    fn decodes_zero() {
        assert_eq!(decode_uint_hex(&encode(0x01, 0)).unwrap(), 0);
    }

    #[test]
    fn decodes_a_small_uint() {
        assert_eq!(decode_uint_hex(&encode(0x01, 10)).unwrap(), 10);
    }

    #[test]
    fn decodes_a_large_uint() {
        assert_eq!(decode_uint_hex(&encode(0x01, 123_456_789)).unwrap(), 123_456_789);
    }

    #[test]
    fn rejects_wrong_type_byte() {
        assert!(decode_uint_hex(&encode(0x02, 10)).is_err());
    }

    #[test]
    fn rejects_wrong_length() {
        assert!(decode_uint_hex("0x01").is_err());
    }
}
