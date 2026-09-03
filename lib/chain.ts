import { defineChain } from "viem";

export const LOCAL_RPC_URL =
  process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:8545";

export const localChain = defineChain({
  id: 31337,
  name: "Mythic Localhost",
  nativeCurrency: {
    name: "Local Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [LOCAL_RPC_URL],
    },
  },
  testnet: true,
});
