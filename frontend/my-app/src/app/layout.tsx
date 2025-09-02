import "@rainbow-me/rainbowkit/styles.css";
import { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cross-Chain Bridge",
  description: "Lock on Sepolia, mint on destination via CCIP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{ background: "#0f0f1b", color: "white", minHeight: "100vh" }}
      >
        <Providers>
          <main style={{ maxWidth: 920, margin: "0 auto", padding: 24 }}>
            {children}
          </main>
        </Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
