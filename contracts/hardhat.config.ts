require("dotenv").config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  paths: {
    sources: "src",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
  networks: {
    sepolia: { url: process.env.SEPOLIA_RPC, accounts: [process.env.PK || ""] },
    amoy: { url: process.env.AMOY_RPC, accounts: [process.env.PK || ""] },
    arbsepolia: { url: process.env.ARBSEPOLIA_RPC, accounts: [process.env.PK || ""] },
  },
};

export default config;