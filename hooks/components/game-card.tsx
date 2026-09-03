"use client";

import { useState } from "react";
import {
  ExternalLink,
  ImageOff,
  LoaderCircle,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import { formatEther } from "viem";
import { explorerTokenUrl } from "@/lib/contracts";
import { getAttribute } from "@/lib/marketplace";
import type { GameCardRecord } from "@/lib/types";

type CardMode = "market" | "owned" | "listed";

interface GameCardProps {
  card: GameCardRecord;
  mode: CardMode;
  actionLabel?: string;
  actionDisabled?: boolean;
  pending?: boolean;
  onAction?: (card: GameCardRecord) => void;
}

export function GameCard({
  card,
  mode,
  actionLabel,
  actionDisabled,
  pending,
  onAction,
}: GameCardProps) {
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const rarity = String(getAttribute(card, "Rarity") ?? "Common");
  const element = String(getAttribute(card, "Element") ?? "Astral");
  const attack = String(getAttribute(card, "Attack") ?? "—");
  const defense = String(getAttribute(card, "Defense") ?? "—");
  const rarityClass = rarity.toLowerCase().replace(/[^a-z]/g, "");

  const imageFailed = failedImageUrl === card.imageUrl;
  const tokenExplorerUrl = explorerTokenUrl(card.tokenId);

  return (
    <article className={`game-card rarity-${rarityClass}`}>
      <div className="game-card-frame">
        <div className="game-card-foil" aria-hidden="true" />
        <div className="game-card-image-wrap">
          {card.imageUrl && !imageFailed ? (
            // IPFS gateways are runtime-configurable, so a native image avoids a
            // hard-coded Next Image hostname allowlist.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="game-card-image"
              src={card.imageUrl}
              alt={card.metadata.name}
              loading="lazy"
              onError={() => setFailedImageUrl(card.imageUrl)}
            />
          ) : (
            <div className="game-card-image-fallback">
              <ImageOff size={28} />
              <span>{card.metadataError ? "Metadata unavailable" : "Image unavailable"}</span>
            </div>
          )}
          <span className="rarity-pill">
            <Sparkles size={12} /> {rarity}
          </span>
          <span className="token-pill">#{card.tokenId.toString()}</span>
        </div>

        <div className="game-card-body">
          <div className="game-card-title-row">
            <div>
              <span className="card-element">{element} arcana</span>
              <h3>{card.metadata.name}</h3>
            </div>
            {tokenExplorerUrl ? (
              <a
                className="icon-link"
                href={tokenExplorerUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${card.metadata.name} in the block explorer`}
              >
                <ExternalLink size={16} />
              </a>
            ) : null}
          </div>
          <p className="game-card-description">{card.metadata.description}</p>
          <div className="card-stats">
            <span>
              <Swords size={15} />
              <small>Attack</small>
              <strong>{attack}</strong>
            </span>
            <span>
              <Shield size={15} />
              <small>Defense</small>
              <strong>{defense}</strong>
            </span>
          </div>

          {card.listing ? (
            <div className="listing-price">
              <span>
                {mode === "listed" ? "Your asking price" : "Current price"}
              </span>
              <strong>{formatEther(card.listing.price)} ETH</strong>
            </div>
          ) : null}

          {onAction && actionLabel ? (
            <button
              className={`button card-action ${mode === "listed" ? "button-ghost" : "button-gold"}`}
              type="button"
              disabled={actionDisabled || pending}
              onClick={() => onAction(card)}
            >
              {pending ? <LoaderCircle className="spin" size={17} /> : null}
              {pending ? "Confirming…" : actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
