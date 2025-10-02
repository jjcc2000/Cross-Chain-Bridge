//  0xF694E193200268f9a4868e4Aa017A0118C9a8177
//  scripts/deploy-ccip-sender.js
// scripts/deploySender.ts

const { ethers, network, run } = require("hardhat");

async function main() {
  if (network.name !== `amoy`) {
    console.error(`❌ Sender must be deployed to amoy`);
    return 1;
  }

  const AMOY_LINK = "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904";
  const AMOY_ROUTER = "0x9C32fCB86BF0f4a1A8921a9Fe46de3198bb884B2";

  await run("compile");

  const Factory = await ethers.getContractFactory("CCIPSender_Unsafe");
  const ccipSender = await Factory.deploy(AMOY_LINK, AMOY_ROUTER);

  await ccipSender.waitForDeployment();
  const addr = await ccipSender.getAddress();

  console.log(`CCIPSender_Unsafe deployed to ${addr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
