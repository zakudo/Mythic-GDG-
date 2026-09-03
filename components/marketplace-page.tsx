"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Coins,
  Gem,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { localChain } from "@/lib/chain";
import { GameCard } from "@/components/game-card";
import { StatusPanel } from "@/components/status-panel";
import { useMarketplaceCards } from "@/hooks/use-marketplace-cards";
import {
  CONTRACTS_CONFIGURED,
  MARKETPLACE_ADDRESS,
  marketplaceAbi,
} from "@/lib/contracts";
import { readableWalletError } from "@/lib/errors";
import { filterAndSortCards, type PriceSort } from "@/lib/marketplace";
import { RARITIES, type GameCardRecord, type Rarity } from "@/lib/types";

export function MarketplacePage() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { cards, error, isLoading, refetch } = useMarketplaceCards();
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<Rarity | "All">("All");
  const [sort, setSort] = useState<PriceSort>("recent");
  const [pendingListing, setPendingListing] = useState<bigint | null>(null);
  const [message, setMessage] = useState<
    { tone: "success" | "error"; text: string } | undefined
  >();

  const visibleCards = useMemo(
    () => filterAndSortCards(cards, search, rarity, sort),
    [cards, search, rarity, sort],
  );

  async function buyCard(card: GameCardRecord) {
    if (!card.listing) return;
    if (!isConnected) {
      setMessage({ tone: "error", text: "Connect a wallet before purchasing." });
      return;
    }
    if (chainId !== localChain.id) {
      setMessage({ tone: "error", text: "Switch your wallet to Mythic Localhost first." });
      return;
    }

    setMessage(undefined);
    setPendingListing(card.listing.id);
    try {
      const hash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: marketplaceAbi,
        functionName: "buyListing",
        args: [card.listing.id],
        value: card.listing.price,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMessage({
        tone: "success",
        text: `${card.metadata.name} now belongs to your wallet.`,
      });
      await refetch();
    } catch (purchaseError) {
      setMessage({ tone: "error", text: readableWalletError(purchaseError) });
    } finally {
      setPendingListing(null);
    }
  }

  return (
    <>
      <section className="market-hero section-shell">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={14} /> Running on your local Ethereum chain
          </span>
          <h1>
            Claim the cards
            <br />
            <em>written in stars.</em>
          </h1>
          <p>
            Mint singular celestial game cards, trade them without intermediaries,
            and keep every arcana secured in your own wallet.
          </p>
          <div className="hero-actions">
            <a className="button button-gold" href="#marketplace">
              Explore cards <ArrowRight size={17} />
            </a>
            <Link className="button button-ghost" href="/mint">
              Forge a card
            </Link>
          </div>
          <div className="trust-row">
            <span>
              <ShieldCheck size={16} /> Auditable contracts
            </span>
            <span>
              <Coins size={16} /> 0% marketplace fee
            </span>
            <span>
              <Gem size={16} /> IPFS metadata
            </span>
          </div>
        </div>

        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-line orbit-line-one" />
          <span className="orbit-line orbit-line-two" />
          <div className="hero-card hero-card-back">
            <div className="hero-card-glyph">✦</div>
          </div>
          <div className="hero-card hero-card-front">
            <span className="hero-card-number">I</span>
            <div className="hero-card-moon">
              <span />
            </div>
            <div className="hero-card-label">
              <small>MYTHIC ARCANA</small>
              <strong>The Astral Keeper</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="market-section section-shell" id="marketplace">
        <div className="section-heading market-heading">
          <div>
            <span className="eyebrow">The grand exchange</span>
            <h2>Cards in the bazaar</h2>
          </div>
          <div className="market-count">
            <strong>{cards.length}</strong>
            <span>active {cards.length === 1 ? "listing" : "listings"}</span>
          </div>
        </div>

        <div className="market-toolbar">
          <label className="search-field">
            <Search size={18} />
            <span className="sr-only">Search cards</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or token ID"
            />
          </label>
          <label className="select-field">
            <span>Rarity</span>
            <select
              value={rarity}
              onChange={(event) => setRarity(event.target.value as Rarity | "All")}
            >
              <option value="All">All rarities</option>
              {RARITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="select-field">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as PriceSort)}
            >
              <option value="recent">Newest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
          <button
            className="toolbar-refresh"
            type="button"
            aria-label="Refresh marketplace"
            onClick={() => refetch()}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {message ? (
          <div className={`inline-message message-${message.tone}`} role="status">
            {message.text}
          </div>
        ) : null}

        {!CONTRACTS_CONFIGURED ? (
          <StatusPanel kind="config" title="Contracts awaiting deployment">
            <p>
              Run the local setup command and add its NFT and marketplace addresses
              to the local environment file.
            </p>
          </StatusPanel>
        ) : isLoading ? (
          <div className="card-grid" aria-label="Loading marketplace cards">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="card-skeleton" key={index}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : error ? (
          <StatusPanel
            kind="error"
            title="The chain could not be reached"
            action={
              <button className="button button-ghost" type="button" onClick={() => refetch()}>
                Try again
              </button>
            }
          >
            <p>Make sure the local Hardhat chain is running on port 8545.</p>
          </StatusPanel>
        ) : cards.length === 0 ? (
          <StatusPanel
            kind="empty"
            title="The bazaar awaits its first card"
            action={
              <Link className="button button-gold" href="/mint">
                Mint the first arcana
              </Link>
            }
          >
            <p>Every listing shown here comes directly from the marketplace contract.</p>
          </StatusPanel>
        ) : visibleCards.length === 0 ? (
          <StatusPanel kind="empty" title="No cards match those filters">
            <p>Try another name, token ID, or rarity.</p>
          </StatusPanel>
        ) : (
          <div className="card-grid">
            {visibleCards.map((card) => {
              const isSeller =
                Boolean(address && card.listing) &&
                address!.toLowerCase() === card.listing!.seller.toLowerCase();
              return (
                <GameCard
                  key={card.tokenId.toString()}
                  card={card}
                  mode="market"
                  actionLabel={isSeller ? "Your listing" : "Buy card"}
                  actionDisabled={isSeller}
                  pending={pendingListing === card.listing?.id}
                  onAction={buyCard}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="protocol-strip">
        <div className="section-shell protocol-strip-inner">
          <div>
            <span>01</span>
            <strong>Mint</strong>
            <p>Pin artwork and metadata to IPFS, then mint one unique token.</p>
          </div>
          <div>
            <span>02</span>
            <strong>List</strong>
            <p>Set an ETH price and place the card into protected escrow.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Collect</strong>
            <p>Purchase on-chain; ownership and payment settle together.</p>
          </div>
        </div>
      </section>
    </>
  );
}
