import { Address } from "viem";
import { erc20Abi } from "viem";

export const erc20DecimalsFn = {
  address: "" as Address,
  abi: erc20Abi,
  functionName: "decimals" as const,
  args: [] as const
};

export const erc20SymbolFn = {
  address: "" as Address,
  abi: erc20Abi,
  functionName: "symbol" as const,
  args: [] as const
};