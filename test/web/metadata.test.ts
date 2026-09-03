import { describe, expect, it } from "vitest";
import { buildCardMetadata, validateMintInput } from "@/lib/metadata";
import type { MintCardInput } from "@/lib/types";

const validInput: MintCardInput = {
  name: "Astral Keeper",
  description: "A moonbound guardian of the last celestial gate.",
  rarity: "Mythic",
  element: "Astral",
  attack: 87,
  defense: 74,
};

describe("mint metadata", () => {
  it("builds OpenSea-compatible IPFS metadata", () => {
    expect(buildCardMetadata(validInput, "bafy-image")).toEqual({
      name: "Astral Keeper",
      description: "A moonbound guardian of the last celestial gate.",
      image: "ipfs://bafy-image",
      attributes: [
        { trait_type: "Rarity", value: "Mythic" },
        { trait_type: "Element", value: "Astral" },
        { trait_type: "Attack", value: 87, display_type: "number" },
        { trait_type: "Defense", value: 74, display_type: "number" },
      ],
    });
  });

  it("accepts a valid image and rejects malformed fields", () => {
    expect(
      validateMintInput(validInput, { size: 500_000, type: "image/webp" }),
    ).toEqual({});

    const invalid = validateMintInput(
      { ...validInput, name: "x", description: "short", attack: 101 },
      { size: 12 * 1024 * 1024, type: "image/gif" },
    );
    expect(invalid.name).toBeDefined();
    expect(invalid.description).toBeDefined();
    expect(invalid.attack).toBeDefined();
    expect(invalid.image).toBeDefined();
  });
});
