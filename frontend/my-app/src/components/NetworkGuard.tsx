"use client";

import { ReactNode } from "react";
import { useChainId, useSwitchChain } from "wagmi";

const SRC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_SOURCE_CHAIN_ID || 11155111); // Sepolia default

export default function NetworkGuard({ children }: { children: ReactNode }) {
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();

  const onSwitch = () => {
    try {
      switchChain?.({ chainId: SRC_CHAIN_ID });
    } catch {/* noop */}
  };

  const wrong = !!chainId && chainId !== SRC_CHAIN_ID;

  if (wrong) {
    return (
      <div style={{ border: "1px solid #553", background: "#2b1b1b", padding: 20, borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Wrong network</h3>
        <p>Please switch to <b>Sepolia (chainId {SRC_CHAIN_ID})</b> to bridge.</p>
        <button onClick={onSwitch} disabled={isPending}
          style={{ padding: "10px 14px", borderRadius: 10, background: "#5a2", color: "#fff", border: "none", cursor: "pointer" }}>
          {isPending ? "Switching…" : "Switch to Sepolia"}
        </button>
        {error && <p style={{ color: "#ff9" }}>Wallet didn’t switch: {error.message}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
