import type { CardMetadata, GameCardRecord, ListingRecord } from "@/lib/types";
import type { PublicClient } from "viem";
import { cardsAbi, NFT_ADDRESS } from "@/lib/contracts";

const configuredGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

export const IPFS_GATEWAY =
  configuredGateway && !configuredGateway.startsWith("your-")
    ? configuredGateway.startsWith("/")
      ? configuredGateway
      : `https://${configuredGateway}`
    : "/api/ipfs";

function cidUrl(cid: string, gateway: string) {
  return gateway.startsWith("/")
    ? `${gateway}/${cid}`
    : `${gateway}/ipfs/${cid}`;
}

export function ipfsToHttp(uri: string, gateway = IPFS_GATEWAY): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://ipfs/")) {
    return cidUrl(uri.slice("ipfs://ipfs/".length), gateway);
  }
  if (uri.startsWith("ipfs://")) {
    return cidUrl(uri.slice("ipfs://".length), gateway);
  }
  return uri;
}

export function normalizeMetadata(value: unknown): CardMetadata {
  const source = (value ?? {}) as Partial<CardMetadata>;
  return {
    name:
      typeof source.name === "string" && source.name.trim()
        ? source.name.trim()
        : "Unnamed Arcana",
    description:
      typeof source.description === "string" ? source.description : "",
    image: typeof source.image === "string" ? source.image : "",
    attributes: Array.isArray(source.attributes)
      ? source.attributes.filter(
          (attribute): attribute is CardMetadata["attributes"][number] =>
            Boolean(
              attribute &&
                typeof attribute === "object" &&
                "trait_type" in attribute &&
                "value" in attribute,
            ),
        )
      : [],
  };
}

export async function fetchCardMetadata(
  tokenId: bigint,
  publicClient: PublicClient,
  listing?: ListingRecord,
): Promise<GameCardRecord> {
  const tokenUri = await publicClient.readContract({
    address: NFT_ADDRESS,
    abi: cardsAbi,
    functionName: "tokenURI",
    args: [tokenId],
  });

  try {
    const response = await fetch(ipfsToHttp(tokenUri), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`IPFS gateway returned ${response.status}`);
    const metadata = normalizeMetadata(await response.json());
    return {
      tokenId,
      tokenUri,
      metadata,
      imageUrl: ipfsToHttp(metadata.image),
      metadataError: false,
      listing,
    };
  } catch {
    return {
      tokenId,
      tokenUri,
      metadata: {
        name: `Arcana #${tokenId}`,
        description: "This card's IPFS metadata is temporarily unavailable.",
        image: "",
        attributes: [],
      },
      imageUrl: "",
      metadataError: true,
      listing,
    };
  }
}

export async function uploadToLocalIpfs(file: File) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/ipfs", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { cid?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "The local IPFS store rejected the upload.");
  }

  const cid = payload?.cid;
  if (!cid) throw new Error("The local IPFS store did not return a CID.");
  return cid;
}
