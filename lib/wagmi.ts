import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { LOCAL_RPC_URL, localChain } from "@/lib/chain";

export const wagmiConfig = createConfig({
  chains: [localChain],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "Mythic Bazaar" }),
  ],
  transports: {
    [localChain.id]: http(LOCAL_RPC_URL),
  },
  ssr: true,
});
