mod chain;
mod epoch;
mod submit;

use std::env;
use std::time::Duration;

use chain::StacksClient;
use submit::SubmitConfig;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let api_url = env::var("STACKS_API_URL").unwrap_or_else(|_| "http://localhost:20443".into());
    let contract_address = env::var("CONTRACT_ADDRESS")
        .expect("CONTRACT_ADDRESS env var required (the deployer principal)");
    let distributor_name = env::var("DISTRIBUTOR_CONTRACT_NAME")
        .unwrap_or_else(|_| "bitmax-boost-distributor".into());
    let network = env::var("NETWORK").unwrap_or_else(|_| "devnet".into());
    let epoch_length: u64 = env::var("EPOCH_LENGTH_BLOCKS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(144);
    let poll_interval_secs: u64 = env::var("POLL_INTERVAL_SECS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(60);
    let script_path = env::var("SUBMIT_SCRIPT")
        .unwrap_or_else(|_| "scripts/submit-close-epoch.mjs".into());

    let client = StacksClient::new(api_url);
    let submit_config = SubmitConfig {
        script_path,
        network,
        contract_address: contract_address.clone(),
        distributor_contract_name: distributor_name.clone(),
    };

    println!(
        "bitmax-keeper starting: contract={contract_address}.{distributor_name} epoch_length={epoch_length} poll_interval={poll_interval_secs}s"
    );

    loop {
        match tick(&client, &contract_address, &distributor_name, epoch_length, &submit_config).await {
            Ok(true) => println!("close-epoch triggered"),
            Ok(false) => println!("not due yet"),
            Err(err) => eprintln!("tick failed: {err:#}"),
        }
        tokio::time::sleep(Duration::from_secs(poll_interval_secs)).await;
    }
}

/// One polling cycle: read chain state, decide, and submit if due. Returns
/// whether a close-epoch transaction was submitted.
async fn tick(
    client: &StacksClient,
    contract_address: &str,
    distributor_name: &str,
    epoch_length: u64,
    submit_config: &SubmitConfig,
) -> anyhow::Result<bool> {
    let current_height = client.get_block_height().await?;
    let last_close_height = client
        .call_read_only_uint(
            contract_address,
            distributor_name,
            "get-last-epoch-close-height",
            contract_address,
        )
        .await?;

    if !epoch::should_close_epoch(current_height, last_close_height, epoch_length) {
        return Ok(false);
    }

    let txid = submit::submit_close_epoch(submit_config).await?;
    println!("close-epoch broadcast: {txid}");
    Ok(true)
}
