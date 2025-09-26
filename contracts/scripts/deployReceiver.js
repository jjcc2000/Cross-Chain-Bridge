// scripts/deployReceiver.js
const { ethers, network, run } = require("hardhat");

async function main() {
  if (network.name !== "ethereumSepolia") {
    console.error("❌ Receiver must be deployed to Ethereum Sepolia");
    process.exitCode = 1;
    return;
  }

  const sepoliaRouterAddress = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";

  // compile (noop if up-to-date)
  await run("compile");

  // Option A: classic factory
  const factory = await ethers.getContractFactory("CCIPReceiver_Unsafe");
  const ccipReceiver = await factory.deploy(sepoliaRouterAddress);
  await ccipReceiver.waitForDeployment();

  const addr = await ccipReceiver.getAddress(); // or: ccipReceiver.target
  const txHash = ccipReceiver.deploymentTransaction().hash;

  console.log("✅ CCIPReceiver_Unsafe deployed");
  console.log("   Address:", addr);
  console.log("   Tx hash:", txHash);

  // Optional: verify (works once the tx is indexed)
  // await run("verify:verify", {
  //   address: addr,
  //   constructorArguments: [sepoliaRouterAddress],
  // });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
