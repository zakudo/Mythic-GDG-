// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Mythic Bazaar Marketplace
/// @notice A fee-free, escrow-based fixed-price marketplace for Mythic Bazaar cards.
contract MythicMarketplace is IERC721Receiver, ReentrancyGuard {
    struct Listing {
        uint256 id;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    error DirectPaymentNotAllowed();
    error ExactPriceRequired(uint256 expected, uint256 received);
    error InvalidPrice();
    error ListingInactive(uint256 listingId);
    error ListingNotFound(uint256 listingId);
    error NotSeller();
    error NotTokenOwner();
    error PaymentFailed();
    error SelfPurchase();
    error TokenAlreadyListed(uint256 tokenId);
    error UnexpectedNFTTransfer();
    error UnsupportedCollection();

    IERC721 public immutable cards;

    uint256 private _nextListingId = 1;
    uint256 private _expectedEscrowTokenPlusOne;
    uint256[] private _activeListingIds;

    mapping(uint256 listingId => Listing listing) private _listings;
    mapping(uint256 listingId => uint256 indexPlusOne) private _activeIndexPlusOne;
    mapping(address seller => uint256[] listingIds) private _sellerListingIds;
    mapping(uint256 tokenId => bool listed) public tokenIsListed;

    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller);
    event ListingPurchased(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );

    constructor(address cardsAddress) {
        if (cardsAddress == address(0)) revert UnsupportedCollection();
        cards = IERC721(cardsAddress);
    }

    receive() external payable {
        revert DirectPaymentNotAllowed();
    }

    function createListing(uint256 tokenId, uint256 price)
        external
        nonReentrant
        returns (uint256 listingId)
    {
        if (price == 0) revert InvalidPrice();
        if (cards.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (tokenIsListed[tokenId]) revert TokenAlreadyListed(tokenId);

        listingId = _nextListingId;
        unchecked {
            _nextListingId = listingId + 1;
        }

        _listings[listingId] = Listing({
            id: listingId,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });
        tokenIsListed[tokenId] = true;
        _activeIndexPlusOne[listingId] = _activeListingIds.length + 1;
        _activeListingIds.push(listingId);
        _sellerListingIds[msg.sender].push(listingId);

        // The receiver gate rejects NFTs sent outside this exact escrow operation.
        _expectedEscrowTokenPlusOne = tokenId + 1;
        cards.safeTransferFrom(msg.sender, address(this), tokenId);
        _expectedEscrowTokenPlusOne = 0;

        emit ListingCreated(listingId, tokenId, msg.sender, price);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = _getActiveListing(listingId);
        if (listing.seller != msg.sender) revert NotSeller();

        uint256 tokenId = listing.tokenId;
        address seller = listing.seller;
        _deactivate(listing);

        cards.safeTransferFrom(address(this), seller, tokenId);
        emit ListingCancelled(listingId, tokenId, seller);
    }

    function buyListing(uint256 listingId) external payable nonReentrant {
        Listing storage listing = _getActiveListing(listingId);
        if (msg.sender == listing.seller) revert SelfPurchase();
        if (msg.value != listing.price) revert ExactPriceRequired(listing.price, msg.value);

        uint256 tokenId = listing.tokenId;
        uint256 price = listing.price;
        address seller = listing.seller;
        _deactivate(listing);

        cards.safeTransferFrom(address(this), msg.sender, tokenId);
        (bool paid,) = payable(seller).call{value: price}("");
        if (!paid) revert PaymentFailed();

        emit ListingPurchased(listingId, tokenId, msg.sender, seller, price);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        Listing memory listing = _listings[listingId];
        if (listing.id == 0) revert ListingNotFound(listingId);
        return listing;
    }

    function getActiveListings() external view returns (Listing[] memory activeListings) {
        uint256 length = _activeListingIds.length;
        activeListings = new Listing[](length);
        for (uint256 i; i < length; ++i) {
            activeListings[i] = _listings[_activeListingIds[i]];
        }
    }

    function getListingsBySeller(address seller)
        external
        view
        returns (Listing[] memory sellerListings)
    {
        uint256[] storage listingIds = _sellerListingIds[seller];
        uint256 activeCount;
        uint256 length = listingIds.length;

        for (uint256 i; i < length; ++i) {
            if (_listings[listingIds[i]].active) ++activeCount;
        }

        sellerListings = new Listing[](activeCount);
        uint256 outputIndex;
        for (uint256 i; i < length; ++i) {
            Listing storage listing = _listings[listingIds[i]];
            if (listing.active) {
                sellerListings[outputIndex] = listing;
                ++outputIndex;
            }
        }
    }

    function nextListingId() external view returns (uint256) {
        return _nextListingId;
    }

    function onERC721Received(address operator, address, uint256 tokenId, bytes calldata)
        external
        view
        returns (bytes4)
    {
        if (msg.sender != address(cards)) revert UnsupportedCollection();
        if (operator != address(this) || _expectedEscrowTokenPlusOne != tokenId + 1) {
            revert UnexpectedNFTTransfer();
        }
        return IERC721Receiver.onERC721Received.selector;
    }

    function _getActiveListing(uint256 listingId) private view returns (Listing storage listing) {
        listing = _listings[listingId];
        if (listing.id == 0) revert ListingNotFound(listingId);
        if (!listing.active) revert ListingInactive(listingId);
    }

    function _deactivate(Listing storage listing) private {
        listing.active = false;
        tokenIsListed[listing.tokenId] = false;

        uint256 activeIndex = _activeIndexPlusOne[listing.id] - 1;
        uint256 finalIndex = _activeListingIds.length - 1;

        if (activeIndex != finalIndex) {
            uint256 movedListingId = _activeListingIds[finalIndex];
            _activeListingIds[activeIndex] = movedListingId;
            _activeIndexPlusOne[movedListingId] = activeIndex + 1;
        }

        _activeListingIds.pop();
        delete _activeIndexPlusOne[listing.id];
    }
}
