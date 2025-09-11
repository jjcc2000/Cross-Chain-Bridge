"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import NetworkGuard from "@/components/NetworkGuard";
import BridgeForm from "@/components/BridgeForm";
import DestBalance from "../components/DestBalance";
import StatusPanel from "@/components/StatusPanel";

export default function Home() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>🔗 Cross-Chain Bridge</h1>
        <ConnectButton />
      </header>

      <NetworkGuard>
        <BridgeForm />
      </NetworkGuard>

      <DestBalance />
      <StatusPanel />
    </div>
  );
}