const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  const NAME = process.env.CANON_NAME || "My Canonical Token";
  const SYMBOL = process.env.CANON_SYMBOL || "CTKN";
  const DECIMALS = Number(process.env.CANON_DECIMALS || 18);
  const OWNER = process.env.ADMIN || deployer.address;

  const INIT = process.env.CANON_INITIAL_SUPPLY
    ? BigInt(process.env.CANON_INITIAL_SUPPLY)
    : 0n;

  const Canon = await ethers.getContractFactory("CanonicalERC20");
  const canon = await Canon.deploy(NAME, SYMBOL, DECIMALS, OWNER, INIT);
  await canon.waitForDeployment();

  console.log("CanonicalERC20 deployed at:", await canon.getAddress());
  console.log(
    "symbol:",
    await canon.symbol(),
    "decimals:",
    await canon.decimals()
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
