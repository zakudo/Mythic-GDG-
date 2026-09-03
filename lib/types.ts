import type { Address } from "viem";

export const RARITIES = [
  "Common",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
] as const;

export const ELEMENTS = [
  "Astral",
  "Ember",
  "Tide",
  "Gale",
  "Verdant",
  "Void",
] as const;

export type Rarity = (typeof RARITIES)[number];
export type Element = (typeof ELEMENTS)[number];

export interface CardAttribute {
  trait_type: string;
  value: string | number;
  display_type?: "number";
}

export interface CardMetadata {
  name: string;
  description: string;
  image: string;
  attributes: CardAttribute[];
}

export interface ListingRecord {
  id: bigint;
  tokenId: bigint;
  seller: Address;
  price: bigint;
  active: boolean;
}

export interface GameCardRecord {
  tokenId: bigint;
  tokenUri: string;
  metadata: CardMetadata;
  imageUrl: string;
  metadataError: boolean;
  listing?: ListingRecord;
}

export interface MintCardInput {
  name: string;
  description: string;
  rarity: Rarity;
  element: Element;
  attack: number;
  defense: number;
}
