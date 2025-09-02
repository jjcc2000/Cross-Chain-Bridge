export const tokenVaultAbi = [
  {
    type: "function",
    name: "lockAndBridge",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
      { name: "dstChain", type: "uint64" }
    ],
    outputs: []
  }
] as const;
