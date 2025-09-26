//  0xF694E193200268f9a4868e4Aa017A0118C9a8177
//  scripts/deploy-ccip-sender.js

const { ethers, network, run } = require("hardhat");

async function main() {
  // Change this to match your hardhat.config network name exactly
  const REQUIRED_NETWORK = "avalancheFuji"; // e.g., "fuji" if that's what you named it

  if (network.name !== REQUIRED_NETWORK) {
    console.error(`❌ Deploy on ${REQUIRED_NETWORK}. Current: ${network.name}`);
    process.exit(1);
  }

  // Fuji addresses
  const fujiLinkAddress = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
  const fujiRouterAddress = "0xF694E193200268f9a4868e4Aa017A0118C9a8177";

  // Optional: ensure fresh build
  await run("compile");

  const CCIPSenderFactory = await ethers.getContractFactory(
    "CCIPSender_Unsafe"
  );
  const ccipSender = await CCIPSenderFactory.deploy(
    fujiLinkAddress,
    fujiRouterAddress
  );

  // ethers v6: wait for deployment + read address
  await ccipSender.waitForDeployment();
  const address = await ccipSender.getAddress();

  console.log(`✅ CCIPSender_Unsafe deployed to: ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
