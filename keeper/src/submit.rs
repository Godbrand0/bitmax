//! Submitting the `close-epoch` transaction is delegated to a small Node
//! script (`scripts/submit-close-epoch.mjs`) built on `@stacks/transactions`,
//! rather than hand-rolled here in Rust - see chain.rs's module comment for
//! why: the only Rust option (`stacks-rs`) is stale, and transaction
//! signing is exactly the kind of security-sensitive code that shouldn't
//! be freshly written when a maintained, widely-used library already does
//! it correctly.

use anyhow::{bail, Context, Result};
use tokio::process::Command;

pub struct SubmitConfig {
    pub script_path: String,
    pub network: String,
    pub contract_address: String,
    pub distributor_contract_name: String,
}

/// Runs the submit script and returns its stdout (expected to be the
/// broadcast transaction's txid) on success.
pub async fn submit_close_epoch(config: &SubmitConfig) -> Result<String> {
    let output = Command::new("node")
        .arg(&config.script_path)
        .arg(&config.network)
        .arg(&config.contract_address)
        .arg(&config.distributor_contract_name)
        .output()
        .await
        .context("spawning submit-close-epoch.mjs")?;

    if !output.status.success() {
        bail!(
            "submit-close-epoch.mjs exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        );
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
