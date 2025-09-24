"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Address,
  formatEther,
  formatUnits,
  isAddress,
  parseUnits,
  parseEther,
} from "viem";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { erc20Abi } from "viem";
import toast from "react-hot-toast";

import { tokenVaultAbi } from "@/lib/abis";
import { estimateCcipFee } from "@/lib/ccipFee";
import { getDestName } from "@/lib/dest";
import { txUrl } from "../lib/explorer";
import { erc20DecimalsFn, erc20SymbolFn } from "@/lib/tokenMeta";

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
  const chainId = useChainId();

  const [token, setToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [fee, setFee] = useState<string>("");
  const [autoFee, setAutoFee] = useState<boolean>(false);

  const {
    writeContractAsync,
    data: txHash,
    isPending,
    error,
  } = useWriteContract();
  const {
    data: receipt,
    isLoading: isWaiting,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // ---- Token metadata (decimals & symbol) ----
  const decimalsRead = useReadContract({
    ...erc20DecimalsFn,
    address: isAddress(token) ? (token as Address) : undefined,
    query: { enabled: isAddress(token) },
  });

  const symbolRead = useReadContract({
    ...erc20SymbolFn,
    address: isAddress(token) ? (token as Address) : undefined,
    query: { enabled: isAddress(token) },
  });

  const decimals = useMemo(() => {
    const v = decimalsRead.data as number | undefined;
    return typeof v === "number" ? v : 18; // fallback
  }, [decimalsRead.data]);

  const symbol = useMemo(() => {
    const v = symbolRead.data as string | undefined;
    return v ?? "TOKEN";
  }, [symbolRead.data]);

  // ---- Reads: balance & allowance ----
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
    const v = (balanceRead.data as bigint | undefined) ?? 0n;
    return formatUnits(v, decimals);
  }, [balanceRead.data, decimals]);

  const allowance = useMemo(() => {
    const v = (allowanceRead.data as bigint | undefined) ?? 0n;
    return formatUnits(v, decimals);
  }, [allowanceRead.data, decimals]);

  const amountUnits = useMemo(() => {
    try {
      return parseUnits(amount || "0", decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const allowanceOk = useMemo(() => {
    const a = (allowanceRead.data as bigint | undefined) ?? 0n;
    return a >= amountUnits;
  }, [allowanceRead.data, amountUnits]);

  // ---- Auto-estimate CCIP fee ----
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
          setFee(formatEther(est));
          setAutoFee(true);
        } else {
          setAutoFee(false);
        }
      } catch {
        setAutoFee(false);
      }
    })();
  }, [token, to, amount, decimals]);

  // ---- Toasts (no inline any types) ----
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

  // ---- Actions ----
  const onApprove = async () => {
    if (!address || !amount || !token || !VAULT) return;
    const value = parseUnits(amount, decimals);
    toast.loading("Approving…", { id: "approve" });
    try {
      const hash = writeContractAsync({
        address: token as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [VAULT, value],
      });
      toast.success(`Bridge transaction sent tx:${hash}`, {
        id: "bridge",
      });
    } finally {
      toast.dismiss("approve");
    }
  };

  const onBridge = async () => {
    if (!address || !token || !amount || !to || !VAULT) return;

    if (!allowanceOk) {
      toast.error("Allowance too low. Approve first.");
      return;
    }

    // amount in token units -> bigint
    let value: bigint;
    try {
      value = parseUnits(amount, decimals); // e.g. "50" @ 18 -> 50000000000000000000n
    } catch {
      toast.error("Invalid amount");
      return;
    }

    // fee in ETH string -> wei bigint (supports decimals like "0.002")
    let feeWei: bigint = 0n;

    try {
      const feeStr = (fee ?? "").trim();
      if (feeStr !== "") {
        feeWei = parseEther(feeStr);
      }
    } catch {
      toast.error("Invalid CCIP fee (ETH, e.g. 0.002)");
      return;
    }

    // make sure selector is bigint
    const selector =
      typeof DST_SELECTOR === "bigint"
        ? DST_SELECTOR
        : BigInt(String(DST_SELECTOR));

    const id = "bridge";
    toast.loading("Locking & bridging…", { id });

    try {
      const tx = await writeContractAsync({
        address: VAULT,
        abi: tokenVaultAbi,
        functionName: "lockAndBridge",
        args: [token as Address, value, to as Address, selector],
        value: feeWei,
      });
      toast.success(`Bridge tx sent: ${tx}`, { id });
    } catch (err: any) {
      alert("Error on the WriteContractAsync");
      console.error(err);
      toast.error(err?.shortMessage ?? err?.message ?? "Bridge failed", { id });
    }
  };

  const disabled = !VAULT || !token || !amount || !to || isPending || isWaiting;

  return (
    <div
      style={{
        border: "1px solid #2a2a3a",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <h2 style={{ marginBottom: 8 }}>Bridge (Sepolia → {getDestName()})</h2>
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
          style={{
            display: "flex",
            gap: 16,
            fontSize: 13,
            opacity: 0.85,
          }}
        >
          <span>Balance: {balance}</span>
          <span>Allowance → Vault: {allowance}</span>
        </div>

        <label>
          Amount {symbol ? `(${symbol})` : ""}
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
          CCIP Fee (ETH) {autoFee ? "— auto" : "— manual"}
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

        {chainId && txHash && (
          <a
            href={txUrl(chainId, txHash as `0x${string}`)}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, opacity: 0.85 }}
          >
            View on explorer ↗
          </a>
        )}
      </div>
    </div>
  );
}
