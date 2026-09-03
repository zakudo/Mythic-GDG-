import type { Metadata } from "next";
import { MintCardForm } from "@/components/mint-card-form";

export const metadata: Metadata = {
  title: "Mint a card",
  description: "Upload celestial artwork and mint a unique Mythic Bazaar card.",
};

export default function MintPage() {
  return <MintCardForm />;
}
