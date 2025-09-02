// deploy/deploy_all.js
const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin      = process.env.ADMIN || deployer.address;
  const router     = process. env.CCIP_ROUTER;
  const name       = process.env.BRIDGED_NAME   || "Wrapped TOKEN";
  const symbol     = process.env.BRIDGED_SYMBOL || "wTKN";
  const decs       = Number(process.env.BRIDGED_DECIMALS || 18);

  if (!router) throw new Error("Missing CCIP_ROUTER in .env");

  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);
  console.log("Admin:   ", admin);
  console.log("Router:  ", router);

  // ------------------------------
  // 1) Destination chain deployment
  // ------------------------------
  console.log("\n=== Deploying BridgeReceiver + BridgedERC20 ===");
  const Receiver = await ethers.getContractFactory("BridgeReceiver");
  const receiver = await Receiver.deploy(admin);
  await receiver.deployed();
  console.log("BridgeReceiver:", receiver.address);

  const Token = await ethers.getContractFactory("BridgedERC20");
  const token = await Token.deploy(name, symbol, decs, admin);
  await token.deployed();
  console.log("BridgedERC20:", token.address);

  // Configure receiver
  let tx = await receiver.setRouter(router);
  await tx.wait();
  tx = await receiver.setBridgedToken(token.address, true);
  await tx.wait();
  tx = await token.setMinter(receiver.address, true);
  await tx.wait();

  console.log("Receiver + Token configured.");

  // ------------------------------
  // 2) Source chain deployment (optional: run only on Sepolia)
  // ------------------------------
  if (network.name === "sepolia") {
    console.log("\n=== Deploying TokenVault on source chain ===");
    const Vault = await ethers.getContractFactory("TokenVault");
    const vault = await Vault.deploy(router, admin);
    await vault.deployed();
    console.log("TokenVault:", vault.address);

    // Wiring if env vars are provided
    const dstSelector  = process.env.DST_CHAIN_SELECTOR;
    const canonicalTok = process.env.CANONICAL_TOKEN;

    if (dstSelector && canonicalTok) {
      tx = await vault.setPeer(BigInt(dstSelector), receiver.address, true);
      await tx.wait();
      tx = await vault.setTokenAllowed(canonicalTok, true);
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
