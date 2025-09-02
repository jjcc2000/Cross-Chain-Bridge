"use client";

import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia, polygonAmoy, arbitrumSepolia } from "wagmi/chains";

const config = getDefaultConfig({
  appName: "Cross-Chain Bridge",
  projectId: "bridge-demo", // WalletConnect Cloud ID if you want real multi-wallet
  chains: [sepolia, polygonAmoy, arbitrumSepolia],
  ssr: true
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#00e5ff" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
