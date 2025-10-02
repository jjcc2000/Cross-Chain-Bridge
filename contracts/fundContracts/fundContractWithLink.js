// fundContractWithLink.js
const { ethers } = require("hardhat");

async function main() {
  const AMOY_LINK = "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904"; // LINK on Amoy
  const CCIP_SENDER = "0x3ec67a50fb1E2BCC84c7b97f1CE19F3527dF214b"; // your contract

  const link = await ethers.getContractAt(
    // minimal ERC20
    ["function transfer(address to, uint256 amount) returns (bool)"],
    AMOY_LINK
  );

  const tx = await link.transfer(CCIP_SENDER, ethers.parseUnits("5", 18)); // 5 LINK
  await tx.wait();
  console.log("✅ Sent 5 LINK to", CCIP_SENDER);
}

main().catch(console.error);
