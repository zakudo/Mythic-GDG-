import { isAddress, parseAbi, type Address } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function configuredAddress(value: string | undefined): Address {
  if (!value || !isAddress(value) || value.toLowerCase() === ZERO_ADDRESS) {
    return ZERO_ADDRESS;
  }
  return value;
}

export const NFT_ADDRESS = configuredAddress(
  process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS,
);
export const MARKETPLACE_ADDRESS = configuredAddress(
  process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS,
);

export const CONTRACTS_CONFIGURED =
  NFT_ADDRESS !== ZERO_ADDRESS && MARKETPLACE_ADDRESS !== ZERO_ADDRESS;

export const cardsAbi = parseAbi([
  "function mintCard(string tokenURI_) returns (uint256 tokenId)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function approve(address to, uint256 tokenId)",
  "event CardMinted(address indexed minter, uint256 indexed tokenId, string tokenURI)",
]);

export const marketplaceAbi = parseAbi([
  "function createListing(uint256 tokenId, uint256 price) returns (uint256 listingId)",
  "function cancelListing(uint256 listingId)",
  "function buyListing(uint256 listingId) payable",
  "function getListing(uint256 listingId) view returns ((uint256 id, uint256 tokenId, address seller, uint256 price, bool active))",
  "function getActiveListings() view returns ((uint256 id, uint256 tokenId, address seller, uint256 price, bool active)[] activeListings)",
  "function getListingsBySeller(address seller) view returns ((uint256 id, uint256 tokenId, address seller, uint256 price, bool active)[] sellerListings)",
  "event ListingCreated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller)",
  "event ListingPurchased(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price)",
]);

export function explorerTokenUrl(_tokenId: bigint) {
  return undefined;
}

export function explorerAddressUrl(_address: Address) {
  return undefined;
}
