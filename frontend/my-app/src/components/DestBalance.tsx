"use client";

import { Address, formatUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain, useChainId } from "wagmi";
import { arbitrumSepolia, polygonAmoy } from "wagmi/chains";
import { erc20Abi } from "viem";
import { useMemo } from "react";
import { getDestName } from "@/lib/dest";

const BRIDGED = process.env.NEXT_PUBLIC_BRIDGED_TOKEN as Address | undefined;
// choose your dest chain here or expose via env (simple switch):
const DEST_CHAIN = process.env.NEXT_PUBLIC_DEST_CHAIN?.toLowerCase() === "arbitrum"
  ? arbitrumSepolia
  : polygonAmoy;

export default function DestBalance() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const decimalsRead = useReadContract({
    address: BRIDGED,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!BRIDGED }
  });
  const symbolRead = useReadContract({
    address: BRIDGED,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: !!BRIDGED }
  });
  const balRead = useReadContract({
    address: BRIDGED,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: DEST_CHAIN.id, // read on destination chain
    query: { enabled: !!BRIDGED && !!address }
  });

  const decimals = (decimalsRead.data as number | undefined) ?? 18;
  const symbol = (symbolRead.data as string | undefined) ?? "wTKN";
  const balance = useMemo(() => {
    const v = (balRead.data as bigint | undefined) ?? 0n;
    return formatUnits(v, decimals);
  }, [balRead.data, decimals]);

  const onSwitch = () => switchChain?.({ chainId: DEST_CHAIN.id });

  return (
    <div style={{ border: "1px solid #2a2a3a", borderRadius: 16, padding: 20 }}>
      <h2 style={{ margin: 0 }}>Destination Balance</h2>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        {getDestName()} ({DEST_CHAIN.name})
      </p>
      <div style={{ fontSize: 20, fontWeight: 600 }}>
        {balance} {symbol}
      </div>

      {chainId !== DEST_CHAIN.id && (
        <button
          onClick={onSwitch}
          disabled={isPending}
          style={{ marginTop: 12, padding: "8px 12px", borderRadius: 10, border: "1px solid #333", background: "#1f1f39", color: "white", cursor: "pointer" }}
        >
          {isPending ? "Switching…" : `Switch to ${DEST_CHAIN.name}`}
        </button>
      )}
    </div>
  );
}