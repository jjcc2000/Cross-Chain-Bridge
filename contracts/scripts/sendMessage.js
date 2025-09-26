import { ethers, network } from "hardhat";

async function main() {
  if (network.name !== `avalancheFuji`) {
    console.error(`❌ Must be called from Avalanche Fuji`);
    return 1;
  }

  const ccipSenderAddress = `PUT CCIP_SENDER_UNSAFE ADDRESS HERE`;
  const ccipReceiverAddress = `PUT CCIP_RECEIVER_UNSAFE ADDRESS HERE`;
  const someText = `CCIP Masterclass`;
  const destinationChainSelector = 16015286601757825753;

  const ccipSenderFactory = await ethers.getContractFactory(
    "CCIPSender_Unsafe"
  );
  const ccipSender = await ccipSenderFactory.connect(
    ccipSenderAddress,
    ethers.provider
  );

  const tx = await ccipSender.send(
    ccipReceiverAddress,
    someText,
    destinationChainSelector
  );
  console.log(destinationChainSelector);
  console.log(`Transaction hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
