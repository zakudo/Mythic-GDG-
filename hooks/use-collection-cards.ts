"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import {
  CONTRACTS_CONFIGURED,
  MARKETPLACE_ADDRESS,
  NFT_ADDRESS,
  cardsAbi,
  marketplaceAbi,
} from "@/lib/contracts";
import { fetchCardMetadata } from "@/lib/ipfs";
import type { ListingRecord } from "@/lib/types";

export function useCollectionCards(address?: Address) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["collection-cards", address],
    enabled: CONTRACTS_CONFIGURED && Boolean(address && publicClient),
    queryFn: async () => {
      const [balance, rawListings] = await Promise.all([
        publicClient!.readContract({
          address: NFT_ADDRESS,
          abi: cardsAbi,
          functionName: "balanceOf",
          args: [address!],
        }),
        publicClient!.readContract({
          address: MARKETPLACE_ADDRESS,
          abi: marketplaceAbi,
          functionName: "getListingsBySeller",
          args: [address!],
        }),
      ]);

      const tokenIds = await Promise.all(
        Array.from({ length: Number(balance) }, (_, index) =>
          publicClient!.readContract({
            address: NFT_ADDRESS,
            abi: cardsAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [address!, BigInt(index)],
          }),
        ),
      );
      const listings = rawListings as readonly ListingRecord[];
      const [owned, listed] = await Promise.all([
        Promise.all(
          tokenIds.map((tokenId) =>
            fetchCardMetadata(tokenId, publicClient!),
          ),
        ),
        Promise.all(
          listings.map((listing) =>
            fetchCardMetadata(listing.tokenId, publicClient!, listing),
          ),
        ),
      ]);

      return { owned, listed };
    },
  });
}
