export function txUrl(chainId: number, tx: `0x${string}`) {
  switch (chainId) {
    case 11155111: // Sepolia
      return `https://sepolia.etherscan.io/tx/${tx}`;
    case 80002: // Polygon Amoy
      return `https://www.oklink.com/amoy/tx/${tx}`;
    case 421614: // Arbitrum Sepolia
      return `https://sepolia.arbiscan.io/tx/${tx}`;
    default:
      return `#`;
  }
}

export function addrUrl(chainId: number, addr: `0x${string}`) {
  switch (chainId) {
    case 11155111:
      return `https://sepolia.etherscan.io/address/${addr}`;
    case 80002:
      return `https://www.oklink.com/amoy/address/${addr}`;
    case 421614:
      return `https://sepolia.arbiscan.io/address/${addr}`;
    default:
      return `#`;
  }
}
