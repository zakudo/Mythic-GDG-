import { describe, expect, it } from "vitest";
import { filterAndSortCards } from "@/lib/marketplace";
import { ipfsToHttp, normalizeMetadata } from "@/lib/ipfs";
import type { GameCardRecord } from "@/lib/types";

function card(
  tokenId: bigint,
  name: string,
  rarity: string,
  price: bigint,
  listingId: bigint,
): GameCardRecord {
  return {
    tokenId,
    tokenUri: `ipfs://metadata-${tokenId}`,
    metadataError: false,
    imageUrl: `https://gateway.test/ipfs/image-${tokenId}`,
    metadata: {
      name,
      description: `${name} card lore`,
      image: `ipfs://image-${tokenId}`,
      attributes: [{ trait_type: "Rarity", value: rarity }],
    },
    listing: {
      id: listingId,
      tokenId,
      seller: "0x1111111111111111111111111111111111111111",
      price,
      active: true,
    },
  };
}

describe("marketplace data helpers", () => {
  const cards = [
    card(1n, "Moon Warden", "Rare", 9n, 1n),
    card(2n, "Void Herald", "Mythic", 3n, 3n),
    card(3n, "Solar Finch", "Rare", 7n, 2n),
  ];

  it("resolves IPFS URIs through a gateway", () => {
    expect(ipfsToHttp("ipfs://bafy123", "https://gateway.test")).toBe(
      "https://gateway.test/ipfs/bafy123",
    );
    expect(ipfsToHttp("https://example.test/card.png")).toBe(
      "https://example.test/card.png",
    );
  });

  it("normalizes incomplete metadata safely", () => {
    expect(normalizeMetadata({ name: "", attributes: "bad" })).toEqual({
      name: "Unnamed Arcana",
      description: "",
      image: "",
      attributes: [],
    });
  });

  it("filters by search and rarity and sorts by price", () => {
    expect(filterAndSortCards(cards, "void", "All", "recent")).toHaveLength(1);
    expect(filterAndSortCards(cards, "", "Rare", "recent")).toHaveLength(2);
    expect(filterAndSortCards(cards, "", "All", "low").map((item) => item.tokenId)).toEqual([
      2n,
      3n,
      1n,
    ]);
    expect(filterAndSortCards(cards, "", "All", "recent")[0].tokenId).toBe(2n);
  });
});
