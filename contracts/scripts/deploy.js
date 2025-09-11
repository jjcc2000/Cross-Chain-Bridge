// deploy/deploy_all.js
const { ethers, network } = require("hardhat");
require("dotenv").config();

async function waitFor(contract) {
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment();
    return contract.getAddress();
  } else if (typeof contract.deployed === "function") {
    await contract.deployed();
    return contract.address;
  } else {
    throw new Error("Unknown ethers version: no deployed()/waitForDeployment()");
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin      = process.env.ADMIN || deployer.address;
  const router     = process.env.CCIP_ROUTER;
  const name       = process.env.BRIDGED_NAME   || "Wrapped TOKEN";
  const symbol     = process.env.BRIDGED_SYMBOL || "wTKN";
  const decs       = Number(process.env.BRIDGED_DECIMALS || 18);

  if (!router) throw new Error("Missing CCIP_ROUTER in .env");

  console.log("Deployer:", deployer.address);
  console.log("Network :", network.name);
  console.log("Admin   :", admin);
  console.log("Router  :", router);

  // --- Fee caps (adjust if needed) ---
  const maxFeePerGas = ethers.parseUnits("30", "gwei");        // cap
  const maxPriorityFeePerGas = ethers.parseUnits("1.5", "gwei"); // tip

  // 1) Destination chain deployment  
  console.log("\n=== Deploying BridgeReceiver + BridgedERC20 ===");
  const Receiver = await ethers.getContractFactory("BridgeReceiver");
  const receiver = await Receiver.deploy(admin, {
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  const receiverAddr = await waitFor(receiver);
  console.log("BridgeReceiver:", receiverAddr);

  const Token = await ethers.getContractFactory("BridgedERC20");
  const token = await Token.deploy(name, symbol, decs, admin, {
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  const tokenAddr = await waitFor(token);
  console.log("BridgedERC20 :", tokenAddr);

  // Configure receiver
  let tx = await receiver.setRouter(router, { maxFeePerGas, maxPriorityFeePerGas });
  await tx.wait();

  tx = await receiver.setBridgedToken(tokenAddr, true, { maxFeePerGas, maxPriorityFeePerGas });
  await tx.wait();

  tx = await token.setMinter(receiverAddr, true, { maxFeePerGas, maxPriorityFeePerGas });
  await tx.wait();

  console.log("Receiver + Token configured.");

  // ------------------------------
  // 2) Source chain deployment (optional: run only on Sepolia)
  // ------------------------------
  if (network.name === "sepolia") {
    console.log("\n=== Deploying TokenVault on source chain ===");
    const Vault = await ethers.getContractFactory("TokenVault");
    const vault = await Vault.deploy(router, admin, {
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    const vaultAddr = await waitFor(vault);
    console.log("TokenVault:", vaultAddr);

    const dstSelector  = process.env.DST_CHAIN_SELECTOR;
    const canonicalTok = process.env.CANONICAL_TOKEN;

    if (dstSelector && canonicalTok) {
      tx = await vault.setPeer(BigInt(dstSelector), receiverAddr, true, {
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      await tx.wait();

      tx = await vault.setTokenAllowed(canonicalTok, true, {
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      await tx.wait();

      console.log("Vault wired to receiver + token allowlisted.");
    }
  }

  console.log("\n=== Deploy Complete ✅ ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
