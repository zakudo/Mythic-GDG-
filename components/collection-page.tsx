"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  PackageOpen,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { getAddress, parseEther } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { localChain } from "@/lib/chain";
import { GameCard } from "@/components/game-card";
import { StatusPanel } from "@/components/status-panel";
import { useCollectionCards } from "@/hooks/use-collection-cards";
import {
  CONTRACTS_CONFIGURED,
  MARKETPLACE_ADDRESS,
  NFT_ADDRESS,
  cardsAbi,
  marketplaceAbi,
} from "@/lib/contracts";
import { readableWalletError } from "@/lib/errors";
import type { GameCardRecord } from "@/lib/types";

type CollectionTab = "owned" | "listed";
type ListingStage = "idle" | "approval" | "listing";

function ListingDialog({
  card,
  stage,
  error,
  onClose,
  onSubmit,
}: {
  card: GameCardRecord;
  stage: ListingStage;
  error: string;
  onClose: () => void;
  onSubmit: (price: string) => void;
}) {
  const [price, setPrice] = useState("0.01");
  const busy = stage !== "idle";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  return (
    <div className="dialog-backdrop" role="presentation">
      <form
        className="dialog listing-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-dialog-title"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(price);
        }}
      >
        <button
          className="dialog-close"
          type="button"
          aria-label="Close listing dialog"
          onClick={onClose}
          disabled={busy}
        >
          <X size={18} />
        </button>
        <span className="eyebrow">Protected escrow</span>
        <h2 id="listing-dialog-title">List {card.metadata.name}</h2>
        <p>
          The card will move into the marketplace contract until it sells or you
          cancel the listing. You receive the full sale price.
        </p>
        <label className="form-field listing-price-input">
          <span>Price in local test ETH</span>
          <div>
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={busy}
              autoFocus
            />
            <strong>ETH</strong>
          </div>
        </label>
        <div className="listing-steps">
          <span className={stage === "approval" ? "is-active" : undefined}>
            {stage === "listing" ? <Check size={14} /> : <i>1</i>}
            Approve this card
          </span>
          <span className={stage === "listing" ? "is-active" : undefined}>
            <i>2</i> Create listing
          </span>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button button-gold" type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={17} /> : <Tag size={17} />}
          {stage === "approval"
            ? "Confirm approval…"
            : stage === "listing"
              ? "Confirm listing…"
              : "List card"}
        </button>
      </form>
    </div>
  );
}

export function CollectionPage() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const collection = useCollectionCards(address);
  const [tab, setTab] = useState<CollectionTab>("owned");
  const [selectedCard, setSelectedCard] = useState<GameCardRecord>();
  const [listingStage, setListingStage] = useState<ListingStage>("idle");
  const [pendingCancel, setPendingCancel] = useState<bigint>();
  const [dialogError, setDialogError] = useState("");
  const [message, setMessage] = useState<
    { tone: "success" | "error"; text: string } | undefined
  >();
  const owned = collection.data?.owned ?? [];
  const listed = collection.data?.listed ?? [];

  async function listCard(priceInput: string) {
    if (!selectedCard || !address) return;
    if (chainId !== localChain.id) {
      setDialogError("Switch your wallet to Mythic Localhost before listing.");
      return;
    }

    let price: bigint;
    try {
      price = parseEther(priceInput);
      if (price <= 0n) throw new Error();
    } catch {
      setDialogError("Enter a valid ETH price greater than zero.");
      return;
    }

    setDialogError("");
    try {
      const approvedAddress = await publicClient!.readContract({
        address: NFT_ADDRESS,
        abi: cardsAbi,
        functionName: "getApproved",
        args: [selectedCard.tokenId],
      });

      if (getAddress(approvedAddress) !== getAddress(MARKETPLACE_ADDRESS)) {
        setListingStage("approval");
        const approvalHash = await writeContractAsync({
          address: NFT_ADDRESS,
          abi: cardsAbi,
          functionName: "approve",
          args: [MARKETPLACE_ADDRESS, selectedCard.tokenId],
        });
        await publicClient!.waitForTransactionReceipt({ hash: approvalHash });
      }

      setListingStage("listing");
      const listingHash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: marketplaceAbi,
        functionName: "createListing",
        args: [selectedCard.tokenId, price],
      });
      await publicClient!.waitForTransactionReceipt({ hash: listingHash });
      setSelectedCard(undefined);
      setListingStage("idle");
      setMessage({
        tone: "success",
        text: `${selectedCard.metadata.name} is now listed in protected escrow.`,
      });
      setTab("listed");
      await collection.refetch();
    } catch (listingError) {
      setListingStage("idle");
      setDialogError(readableWalletError(listingError));
    }
  }

  async function cancelListing(card: GameCardRecord) {
    if (!card.listing) return;
    if (chainId !== localChain.id) {
      setMessage({ tone: "error", text: "Switch your wallet to Mythic Localhost first." });
      return;
    }

    setPendingCancel(card.listing.id);
    setMessage(undefined);
    try {
      const hash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: marketplaceAbi,
        functionName: "cancelListing",
        args: [card.listing.id],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMessage({
        tone: "success",
        text: `${card.metadata.name} has returned to your wallet.`,
      });
      await collection.refetch();
    } catch (cancelError) {
      setMessage({ tone: "error", text: readableWalletError(cancelError) });
    } finally {
      setPendingCancel(undefined);
    }
  }

  return (
    <section className="collection-section section-shell">
      <div className="page-heading collection-heading">
        <span className="eyebrow">
          <Sparkles size={14} /> Your celestial vault
        </span>
        <h1>My collection</h1>
        <p>
          Cards in your wallet and cards you have entrusted to marketplace escrow,
          read directly from your local Ethereum chain.
        </p>
      </div>

      {!CONTRACTS_CONFIGURED ? (
        <StatusPanel kind="config" title="Contracts awaiting deployment">
          <p>Run the local contract setup and configure its deployed addresses.</p>
        </StatusPanel>
      ) : !isConnected ? (
        <StatusPanel kind="wallet" title="Connect your wallet to open the vault">
          <p>The connected address determines which cards appear in this collection.</p>
        </StatusPanel>
      ) : collection.isLoading ? (
        <StatusPanel kind="loading" title="Opening your celestial vault">
          <p>Reading owned tokens, active listings, and IPFS metadata.</p>
        </StatusPanel>
      ) : collection.error ? (
        <StatusPanel
          kind="error"
          title="Your collection could not be loaded"
          action={
            <button className="button button-ghost" type="button" onClick={() => collection.refetch()}>
              Try again
            </button>
          }
        >
          <p>Check that the local Hardhat chain is running, then retry.</p>
        </StatusPanel>
      ) : (
        <>
          <div className="collection-tabs" role="tablist" aria-label="Collection views">
            <button
              role="tab"
              type="button"
              aria-selected={tab === "owned"}
              className={tab === "owned" ? "is-active" : undefined}
              onClick={() => setTab("owned")}
            >
              <PackageOpen size={17} /> Owned
              <span>{owned.length}</span>
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={tab === "listed"}
              className={tab === "listed" ? "is-active" : undefined}
              onClick={() => setTab("listed")}
            >
              <Tag size={17} /> Listed in escrow
              <span>{listed.length}</span>
            </button>
          </div>

          {message ? (
            <div className={`inline-message message-${message.tone}`} role="status">
              {message.text}
            </div>
          ) : null}

          {tab === "owned" ? (
            owned.length ? (
              <div className="card-grid">
                {owned.map((card) => (
                  <GameCard
                    key={card.tokenId.toString()}
                    card={card}
                    mode="owned"
                    actionLabel="List for sale"
                    onAction={setSelectedCard}
                  />
                ))}
              </div>
            ) : (
              <StatusPanel
                kind="empty"
                title="No cards in this wallet yet"
                action={
                  <Link className="button button-gold" href="/mint">
                    Mint your first card <ArrowRight size={16} />
                  </Link>
                }
              >
                <p>Mint an original arcana or purchase one from the marketplace.</p>
              </StatusPanel>
            )
          ) : listed.length ? (
            <div className="card-grid">
              {listed.map((card) => (
                <GameCard
                  key={card.listing!.id.toString()}
                  card={card}
                  mode="listed"
                  actionLabel="Cancel listing"
                  pending={pendingCancel === card.listing?.id}
                  onAction={cancelListing}
                />
              ))}
            </div>
          ) : (
            <StatusPanel kind="empty" title="No cards currently in escrow">
              <p>Choose an owned card and set a price to list it in the bazaar.</p>
            </StatusPanel>
          )}
        </>
      )}

      {selectedCard ? (
        <ListingDialog
          card={selectedCard}
          stage={listingStage}
          error={dialogError}
          onClose={() => {
            setSelectedCard(undefined);
            setDialogError("");
          }}
          onSubmit={listCard}
        />
      ) : null}
    </section>
  );
}
