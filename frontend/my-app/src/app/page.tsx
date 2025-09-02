import { ConnectButton } from "@rainbow-me/rainbowkit";
import BridgeForm from "../components/BridgeForm";
import StatusPanel from "../components/StatusPanel";
import NetworkGuard from "../components/NetworkGuard";

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

      <StatusPanel />
    </div>
  );
}
