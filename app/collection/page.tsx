import type { Metadata } from "next";
import { CollectionPage } from "@/components/collection-page";

export const metadata: Metadata = {
  title: "My collection",
  description: "View cards in your wallet and your active escrow listings.",
};

export default function CollectionRoute() {
  return <CollectionPage />;
}
