const { ethers, network } = require("hardhat");

async function main() {
  if (network.name !== "amoy") {
    console.error("❌ Must be called from amoy");
    process.exit(1);
  }

  // Deployed CCIPSender_Unsafe on Amoy
  const ccipSenderAddress = "0x3ec67a50fb1E2BCC84c7b97f1CE19F3527dF214b";

  // 🚨 IMPORTANT: This must live on the DESTINATION chain (see selector below)
  // If you're sending to Sepolia, put your Sepolia receiver address here.
  const ccipReceiverAddress = "0xFDb8637D4D180F41675D0683d32Bc95c954de122";

  // Use BigInt for the selector (Sepolia in this example)
  const destinationChainSelector = 16015286601757825753n; // Sepolia

  const [signer] = await ethers.getSigners();

  // Attach to the already deployed contract
  const ccipSender = await ethers.getContractAt(
    "CCIPSender_Unsafe",
    ccipSenderAddress,
    signer
  );

  const someText = "CCIP Masterclass";

  const tx = await ccipSender.send(
    ccipReceiverAddress,
    someText,
    destinationChainSelector
  );

  console.log("Destination selector:", destinationChainSelector.toString());
  console.log("📨 Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Mined in block:", receipt.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
