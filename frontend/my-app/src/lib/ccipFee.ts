import { Address, PublicClient, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

// Minimal ABI for a router with getFee(uint64, bytes) -> uint256
const routerFeeAbi = [
  {
    type: "function",
    name: "getFee",
    stateMutability: "view",
    inputs: [
      { name: "dstChainSelector", type: "uint64" },
      { name: "message", type: "bytes" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

const ROUTER = (process.env.NEXT_PUBLIC_CCIP_ROUTER || "") as Address;
const DST_SELECTOR = BigInt(process.env.NEXT_PUBLIC_DST_SELECTOR || "0");

// Build a default public client (Sepolia) — can swap chain if needed
const client: PublicClient = createPublicClient({ chain: sepolia, transport: http() });

/**
 * Best-effort fee estimate. We mirror the payload your TokenVault sends:
 * abi.encode(receiver, abi.encode(token, to, amount))
 * If the router ABI differs, this call will throw — we catch & return 0n.
 */
export async function estimateCcipFee(receiver: Address, token: Address, to: Address, amount: bigint): Promise<bigint> {
  try {
    // inner payload: (token, to, amount)
    const inner = encode(["address", "address", "uint256"], [token, to, amount]);
    // full message: (receiver, bytes)
    const message = encode(["address", "bytes"], [receiver, inner]);

    const fee = await client.readContract({
      address: ROUTER,
      abi: routerFeeAbi,
      functionName: "getFee",
      args: [DST_SELECTOR, message],
    });
    return fee as bigint;
  } catch {
    return 0n;
  }
}

// tiny abi encoder using viem
import { encodeAbiParameters, parseAbiParameters } from "viem";

function encode(types: string[], values: any[]) {
  return encodeAbiParameters(parseAbiParameters(types.join(",")), values);
}
