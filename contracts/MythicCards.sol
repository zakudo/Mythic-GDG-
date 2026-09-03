// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title Mythic Bazaar Cards
/// @notice A public-mint collection whose metadata is stored at immutable IPFS URIs.
contract MythicCards is ERC721Enumerable, ERC721URIStorage {
    error EmptyTokenURI();

    uint256 private _nextTokenId = 1;

    event CardMinted(address indexed minter, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("Mythic Bazaar Cards", "MYTHIC") {}

    function mintCard(string calldata tokenURI_) external returns (uint256 tokenId) {
        if (bytes(tokenURI_).length == 0) revert EmptyTokenURI();

        tokenId = _nextTokenId;
        unchecked {
            _nextTokenId = tokenId + 1;
        }

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit CardMinted(msg.sender, tokenId, tokenURI_);
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}
