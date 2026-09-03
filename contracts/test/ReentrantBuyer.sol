// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IMythicMarketplace {
    function buyListing(uint256 listingId) external payable;
}

/// @dev Test helper proving that an ERC-721 receiver cannot re-enter a purchase.
contract ReentrantBuyer is IERC721Receiver {
    IMythicMarketplace public immutable marketplace;
    uint256 private _listingId;
    bool public reentrySucceeded;

    constructor(address marketplaceAddress) {
        marketplace = IMythicMarketplace(marketplaceAddress);
    }

    function buy(uint256 listingId) external payable {
        _listingId = listingId;
        marketplace.buyListing{value: msg.value}(listingId);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        returns (bytes4)
    {
        (reentrySucceeded,) = address(marketplace).call(
            abi.encodeCall(IMythicMarketplace.buyListing, (_listingId))
        );
        return IERC721Receiver.onERC721Received.selector;
    }
}
