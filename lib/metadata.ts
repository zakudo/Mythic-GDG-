import {
  ELEMENTS,
  RARITIES,
  type CardMetadata,
  type MintCardInput,
} from "@/lib/types";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function buildCardMetadata(
  input: MintCardInput,
  imageCid: string,
): CardMetadata {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    image: `ipfs://${imageCid}`,
    attributes: [
      { trait_type: "Rarity", value: input.rarity },
      { trait_type: "Element", value: input.element },
      { trait_type: "Attack", value: input.attack, display_type: "number" },
      { trait_type: "Defense", value: input.defense, display_type: "number" },
    ],
  };
}

export function validateMintInput(
  input: MintCardInput,
  file?: Pick<File, "size" | "type"> | null,
) {
  const errors: Partial<Record<keyof MintCardInput | "image", string>> = {};
  const nameLength = input.name.trim().length;
  const descriptionLength = input.description.trim().length;

  if (nameLength < 3 || nameLength > 50) {
    errors.name = "Use a name between 3 and 50 characters.";
  }
  if (descriptionLength < 10 || descriptionLength > 500) {
    errors.description = "Use a description between 10 and 500 characters.";
  }
  if (!RARITIES.includes(input.rarity)) {
    errors.rarity = "Choose a valid rarity.";
  }
  if (!ELEMENTS.includes(input.element)) {
    errors.element = "Choose a valid element.";
  }
  if (!Number.isInteger(input.attack) || input.attack < 1 || input.attack > 100) {
    errors.attack = "Attack must be a whole number from 1 to 100.";
  }
  if (
    !Number.isInteger(input.defense) ||
    input.defense < 1 ||
    input.defense > 100
  ) {
    errors.defense = "Defense must be a whole number from 1 to 100.";
  }
  if (!file) {
    errors.image = "Choose a JPG, PNG, or WebP card image.";
  } else if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.image = "Only JPG, PNG, and WebP images are supported.";
  } else if (file.size > MAX_IMAGE_SIZE) {
    errors.image = "The image must be 10 MB or smaller.";
  }

  return errors;
}
