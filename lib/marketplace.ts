import type { GameCardRecord, Rarity } from "@/lib/types";

export type PriceSort = "recent" | "low" | "high";

export function getAttribute(card: GameCardRecord, trait: string) {
  return card.metadata.attributes.find(
    (attribute) => attribute.trait_type.toLowerCase() === trait.toLowerCase(),
  )?.value;
}

export function filterAndSortCards(
  cards: GameCardRecord[],
  search: string,
  rarity: Rarity | "All",
  sort: PriceSort,
) {
  const query = search.trim().toLowerCase();
  const result = cards.filter((card) => {
    const cardRarity = String(getAttribute(card, "Rarity") ?? "Common");
    const matchesSearch =
      !query ||
      card.metadata.name.toLowerCase().includes(query) ||
      card.metadata.description.toLowerCase().includes(query) ||
      String(card.tokenId).includes(query);
    return matchesSearch && (rarity === "All" || cardRarity === rarity);
  });

  return result.sort((left, right) => {
    if (sort === "recent") {
      return Number((right.listing?.id ?? 0n) - (left.listing?.id ?? 0n));
    }
    const leftPrice = left.listing?.price ?? 0n;
    const rightPrice = right.listing?.price ?? 0n;
    return sort === "low"
      ? leftPrice < rightPrice
        ? -1
        : leftPrice > rightPrice
          ? 1
          : 0
      : leftPrice > rightPrice
        ? -1
        : leftPrice < rightPrice
          ? 1
          : 0;
  });
}
