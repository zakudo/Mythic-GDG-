"use client";

import { Check, ChevronDown, LogOut, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const { connectors, connect, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-status-dot" aria-hidden="true" />
        <span>{shortenAddress(address)}</span>
        <button
          className="wallet-disconnect"
          type="button"
          aria-label="Disconnect wallet"
          onClick={() => disconnect()}
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        className="button button-gold wallet-trigger"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Wallet size={17} />
        Connect wallet
        <ChevronDown size={15} />
      </button>

      {isOpen ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div
            className="dialog wallet-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-dialog-title"
            ref={dialogRef}
          >
            <button
              className="dialog-close"
              type="button"
              aria-label="Close wallet dialog"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>
            <span className="eyebrow">Enter the bazaar</span>
            <h2 id="wallet-dialog-title">Choose your wallet</h2>
            <p>
              Mythic Bazaar never takes custody of your wallet. Every action is
              confirmed by you on your local Ethereum sandbox.
            </p>
            <div className="wallet-options">
              {connectors.map((connector) => (
                <button
                  className="wallet-option"
                  type="button"
                  key={connector.uid}
                  disabled={isPending}
                  onClick={() =>
                    connect(
                      { connector },
                      { onSuccess: () => setIsOpen(false) },
                    )
                  }
                >
                  <span className="wallet-option-icon">
                    <Wallet size={20} />
                  </span>
                  <span>
                    <strong>{connector.name}</strong>
                    <small>
                      {isPending ? "Waiting for wallet…" : "Browser wallet"}
                    </small>
                  </span>
                  <Check size={17} className="wallet-option-check" />
                </button>
              ))}
            </div>
            {error ? <p className="form-error wallet-error">{error.message}</p> : null}
            <p className="dialog-footnote">
              No wallet detected? Install MetaMask or Coinbase Wallet and refresh
              this page.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
