// deploy/deploy_all.js
const { ethers, network } = require("hardhat");
const { isAddress, getAddress } = require("ethers");
require("dotenv").config();

function mustAddr(v, label) {
  if (!v || !isAddress(v)) throw new Error(`Invalid ${label}: ${v}`);
  return getAddress(v);
}
async function waitFor(contract) {
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment();
    return await contract.getAddress();
  }
  await contract.deployed();
  return contract.address;
}

async function deployDestination() {
  const [deployer] = await ethers.getSigners();
  const admin  = isAddress(process.env.ADMIN) ? getAddress(process.env.ADMIN) : deployer.address;
  const router = mustAddr(process.env.CCIP_ROUTER, "CCIP_ROUTER");

  const name   = process.env.BRIDGED_NAME   || "Wrapped TOKEN";
  const symbol = process.env.BRIDGED_SYMBOL || "wTKN";
  const decs   = Number(process.env.BRIDGED_DECIMALS || 18);

  console.log("Deployer:", deployer.address);
  console.log("Network :", network.name, "(destination)");
  console.log("Admin   :", admin);
  console.log("Router  :", router);

  console.log("\n=== Deploying BridgeReceiver + BridgedERC20 ===");
  const Receiver = await ethers.getContractFactory("BridgeReceiver");
  const receiver = await Receiver.deploy(admin);
  const receiverAddr = await waitFor(receiver);
  console.log("BridgeReceiver:", receiverAddr);

  const Token = await ethers.getContractFactory("BridgedERC20");
  const token = await Token.deploy(name, symbol, decs, admin);
  const tokenAddr = await waitFor(token);
  console.log("BridgedERC20 :", tokenAddr);

  console.log("\n=== Configuring destination ===");
  await (await receiver.setRouter(router)).wait();
  await (await receiver.setBridgedToken(tokenAddr, true)).wait();
  await (await token.setMinter(receiverAddr, true)).wait();
  console.log("✅ Receiver + Token configured.");

  console.log("\nRECEIVER_ADDR=", receiverAddr);
  console.log("BRIDGED_TOKEN=", tokenAddr);
}

async function deploySource() {
  const [deployer] = await ethers.getSigners();
  const admin        = isAddress(process.env.ADMIN) ? getAddress(process.env.ADMIN) : deployer.address;
  const router       = mustAddr(process.env.CCIP_ROUTER, "CCIP_ROUTER");          // Sepolia router
  const dstSelector  = process.env.DST_CHAIN_SELECTOR;                             // e.g. Amoy selector
  const canonicalTok = mustAddr(process.env.CANONICAL_TOKEN, "CANONICAL_TOKEN");   // Sepolia ERC20
  const receiverAddr = mustAddr(process.env.RECEIVER_ADDR, "RECEIVER_ADDR");       // Receiver deployed on dest

  if (!dstSelector) throw new Error("Missing DST_CHAIN_SELECTOR in .env");

  console.log("Deployer:", deployer.address);
  console.log("Network :", network.name, "(source)");
  console.log("Admin   :", admin);
  console.log("Router  :", router);
  console.log("Receiver:", receiverAddr);
  console.log("DstSel  :", dstSelector);
  console.log("CanonTK :", canonicalTok);

  console.log("\n=== Deploying TokenVault (source) ===");
  const Vault = await ethers.getContractFactory("TokenVault");
  const vault = await Vault.deploy(router, admin);
  const vaultAddr = await waitFor(vault);
  console.log("TokenVault:", vaultAddr);

  console.log("\n=== Wiring source → destination ===");
  await (await vault.setPeer(BigInt(dstSelector), receiverAddr, true)).wait();
  await (await vault.setTokenAllowed(canonicalTok, true)).wait();
  console.log("✅ Vault wired (peer set + token allowlisted).");

  console.log("\nVAULT_ADDR=", vaultAddr);
}

async function main() {
  if (network.name === "sepolia") {
    await deploySource();
  } else {
    await deployDestination();
  }
  console.log("\n=== Deploy Complete ✅ ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
