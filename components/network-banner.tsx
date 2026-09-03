"use client";

import { AlertTriangle } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { localChain } from "@/lib/chain";

export function NetworkBanner() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === localChain.id) return null;

  return (
    <div className="network-banner" role="alert">
      <AlertTriangle size={18} />
      <span>Your wallet is on the wrong network.</span>
      <button
        type="button"
        onClick={() => switchChain({ chainId: localChain.id })}
        disabled={isPending}
      >
        {isPending ? "Switching…" : "Switch to Localhost"}
      </button>
    </div>
  );
}
