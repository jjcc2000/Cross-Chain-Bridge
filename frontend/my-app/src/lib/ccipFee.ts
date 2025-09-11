import { Address, PublicClient, createPublicClient, http, encodeAbiParameters, parseAbiParameters } from "viem";
import { sepolia } from "viem/chains";

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
const client: PublicClient = createPublicClient({ chain: sepolia, transport: http() });

export async function estimateCcipFee(receiver: Address, token: Address, to: Address, amount: bigint): Promise<bigint> {
  try {
    const inner = encode(["address","address","uint256"], [token, to, amount]);
    const message = encode(["address","bytes"], [receiver, inner]);
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

function encode(types: string[], values: any[]) {
  return encodeAbiParameters(parseAbiParameters(types.join(",")), values);
}
