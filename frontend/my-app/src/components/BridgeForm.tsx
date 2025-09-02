"use client";

import { useEffect, useMemo, useState } from "react";
import { Address, formatUnits, isAddress, parseUnits } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { erc20Abi } from "viem";
import { tokenVaultAbi } from "@/lib/abis";
import { estimateCcipFee } from "@/lib/ccipFee";
import { getDestName } from "@/lib/dest";
import toast from "react-hot-toast";

const VAULT = process.env.NEXT_PUBLIC_SEPOLIA_VAULT as Address | undefined;
const DST_SELECTOR = BigInt(process.env.NEXT_PUBLIC_DST_SELECTOR || "0");

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  border: "1px solid #333",
  background: "#131324",
  color: "white",
};
const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #333",
  background: "#1f1f39",
  color: "white",
  cursor: "pointer",
};
const sub: React.CSSProperties = { opacity: 0.8, fontSize: 12 };

export default function BridgeForm() {
  const { address } = useAccount();
  const [token, setToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [fee, setFee] = useState<string>("");
  const [autoFee, setAutoFee] = useState<boolean>(false);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const {
    data: receipt,
    isLoading: isWaiting,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // --- Reads: balance & allowance (assume 18 decimals for now) ---
  const decimals = 18;

  const balanceRead = useReadContract({
    address: isAddress(token) ? (token as Address) : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isAddress(token) && !!address },
  });

  const allowanceRead = useReadContract({
    address: isAddress(token) ? (token as Address) : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && VAULT ? [address, VAULT] : undefined,
    query: { enabled: isAddress(token) && !!address && !!VAULT },
  });

  const balance = useMemo(() => {
    const v = (balanceRead.data as bigint | undefined) ?? BigInt(0);
    return formatUnits(v, decimals);
  }, [balanceRead.data]);

  const allowance = useMemo(() => {
    const v = (allowanceRead.data as bigint | undefined) ?? BigInt(0);
    return formatUnits(v, decimals);
  }, [allowanceRead.data]);

  const amountUnits = useMemo(() => {
    try {
      return parseUnits(amount || "0", decimals);
    } catch {
      return BigInt(0);
    }
  }, [amount]);

  const allowanceOk = useMemo(() => {
    const a = (allowanceRead.data as bigint | undefined) ?? BigInt(0);
    return a >= amountUnits;
  }, [allowanceRead.data, amountUnits]);

  // --- Auto-estimate CCIP fee ---
  useEffect(() => {
    (async () => {
      try {
        if (!VAULT || !isAddress(token) || !isAddress(to) || !amount) {
          setAutoFee(false);
          return;
        }
        const amt = parseUnits(amount, decimals);
        const est = await estimateCcipFee(
          VAULT,
          token as Address,
          to as Address,
          amt
        );
        if (est > 0n) {
          setFee(est.toString());
          setAutoFee(true);
        } else {
          setAutoFee(false);
        }
      } catch {
        setAutoFee(false);
      }
    })();
  }, [token, to, amount]);

  // --- Toasts based on hook state (no inline callbacks) ---
  useEffect(() => {
    if (error) toast.error(`Tx error: ${error.message}`);
  }, [error]);

  useEffect(() => {
    if (txHash) toast.success(`Tx sent: ${txHash.slice(0, 10)}…`);
  }, [txHash]);

  useEffect(() => {
    if (!receipt) return;
    if (receipt.status === "reverted") {
      toast.error("❌ Transaction reverted");
    } else if (isSuccess) {
      toast.success("✅ Transaction confirmed");
    }
  }, [receipt, isSuccess]);

  // --- Actions ---
  const onApprove = () => {
    if (!address || !amount || !token || !VAULT) return;
    const value = parseUnits(amount, decimals);
    toast.loading("Approving…", { id: "approve" });
    try {
      writeContract({
        address: token as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [VAULT, value],
      });
    } finally {
      toast.dismiss("approve");
    }
  };

  const onBridge = () => {
    if (!address || !token || !amount || !to || !VAULT) return;
    if (!allowanceOk) {
      toast.error("Allowance too low. Approve first.");
      return;
    }
    const value = parseUnits(amount, decimals);
    toast.loading("Locking & bridging…", { id: "bridge" });
    try {
      writeContract({
        address: VAULT,
        abi: tokenVaultAbi,
        functionName: "lockAndBridge",
        args: [token as Address, value, to as Address, DST_SELECTOR],
        value: BigInt(fee || "0"),
      });
    } finally {
      toast.dismiss("bridge");
    }
  };

  const disabled =
    !VAULT || !token || !amount || !to || isPending || isWaiting;

  return (
    <div
      style={{
        border: "1px solid #2a2a3a",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <h2 style={{ marginBottom: 8 }}>
        Bridge (Sepolia → {getDestName()})
      </h2>
      <p style={sub}>Vault: {VAULT ?? "-"}</p>

      <div style={{ display: "grid", gap: 12 }}>
        <label>
          Canonical Token (Sepolia)
          <input
            placeholder="0xToken"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={inputStyle}
          />
        </label>

        <div
          style={{ display: "flex", gap: 16, fontSize: 13, opacity: 0.85 }}
        >
          <span>Balance: {balance}</span>
          <span>Allowance → Vault: {allowance}</span>
        </div>

        <label>
          Amount
          <input
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          Recipient ({getDestName()})
          <input
            placeholder="0xRecipient"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          CCIP Fee (wei) {autoFee ? "— auto" : "— manual"}
          <input
            placeholder={autoFee ? "auto" : "0"}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            style={inputStyle}
            disabled={autoFee}
          />
        </label>

        {!allowanceOk && !!amount && (
          <p style={{ color: "#ffb86b", margin: 0 }}>
            ⚠️ Allowance is below amount — click Approve first.
          </p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onApprove} style={btn}>
            Approve
          </button>
          <button
            onClick={onBridge}
            disabled={disabled || !allowanceOk}
            style={{
              ...btn,
              opacity: disabled || !allowanceOk ? 0.6 : 1,
            }}
          >
            Lock & Bridge
          </button>
        </div>
      </div>
    </div>
  );
}
