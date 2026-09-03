"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useReadContract } from "wagmi";
import {
  CONTRACTS_CONFIGURED,
  MARKETPLACE_ADDRESS,
  marketplaceAbi,
} from "@/lib/contracts";
import { fetchCardMetadata } from "@/lib/ipfs";
import type { ListingRecord } from "@/lib/types";

export function useMarketplaceCards() {
  const publicClient = usePublicClient();
  const listingsQuery = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: marketplaceAbi,
    functionName: "getActiveListings",
    query: { enabled: CONTRACTS_CONFIGURED },
  });
  const listings = (listingsQuery.data ?? []) as readonly ListingRecord[];
  const listingKey = listings
    .map((listing) => `${listing.id}:${listing.tokenId}:${listing.price}`)
    .join("|");

  const cardsQuery = useQuery({
    queryKey: ["marketplace-cards", listingKey],
    enabled: CONTRACTS_CONFIGURED && Boolean(publicClient),
    queryFn: async () =>
      Promise.all(
        listings.map((listing) =>
          fetchCardMetadata(listing.tokenId, publicClient!, listing),
        ),
      ),
  });

  async function refetch() {
    await listingsQuery.refetch();
    await cardsQuery.refetch();
  }

  return {
    cards: cardsQuery.data ?? [],
    listings,
    error: listingsQuery.error ?? cardsQuery.error,
    isLoading:
      listingsQuery.isLoading ||
      (listings.length > 0 && cardsQuery.isLoading),
    refetch,
  };
}
