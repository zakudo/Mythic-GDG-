import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem, networkHelpers } = await network.create();

async function waitFor(hash: `0x${string}`) {
  const publicClient = await viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
}

async function deployFixture() {
  const [deployer, seller, buyer, stranger] = await viem.getWalletClients();
  const cards = await viem.deployContract("MythicCards");
  const marketplace = await viem.deployContract("MythicMarketplace", [
    cards.address,
  ]);

  return { cards, marketplace, deployer, seller, buyer, stranger };
}

async function mintAndList(
  fixture: Awaited<ReturnType<typeof deployFixture>>,
  price = parseEther("0.1"),
) {
  const { cards, marketplace, seller } = fixture;
  await waitFor(
    await cards.write.mintCard(["ipfs://metadata-one"], {
      account: seller.account,
    }),
  );
  await waitFor(
    await cards.write.approve([marketplace.address, 1n], {
      account: seller.account,
    }),
  );
  await waitFor(
    await marketplace.write.createListing([1n, price], {
      account: seller.account,
    }),
  );
  return { price };
}

describe("MythicCards", () => {
  it("mints sequential IDs with owner enumeration and token URIs", async () => {
    const { cards, seller } = await networkHelpers.loadFixture(deployFixture);

    await waitFor(
      await cards.write.mintCard(["ipfs://first"], {
        account: seller.account,
      }),
    );
    await waitFor(
      await cards.write.mintCard(["ipfs://second"], {
        account: seller.account,
      }),
    );

    assert.equal(
      (await cards.read.ownerOf([1n])).toLowerCase(),
      seller.account.address.toLowerCase(),
    );
    assert.equal(
      (await cards.read.ownerOf([2n])).toLowerCase(),
      seller.account.address.toLowerCase(),
    );
    assert.equal(await cards.read.tokenURI([1n]), "ipfs://first");
    assert.equal(await cards.read.tokenOfOwnerByIndex([seller.account.address, 1n]), 2n);
    assert.equal(await cards.read.nextTokenId(), 3n);
  });

  it("rejects an empty metadata URI", async () => {
    const { cards, seller } = await networkHelpers.loadFixture(deployFixture);
    await assert.rejects(
      cards.write.mintCard([""], { account: seller.account }),
    );
  });
});

describe("MythicMarketplace", () => {
  it("requires ownership, a positive price, and per-token approval", async () => {
    const { cards, marketplace, seller, stranger } =
      await networkHelpers.loadFixture(deployFixture);

    await waitFor(
      await cards.write.mintCard(["ipfs://first"], {
        account: seller.account,
      }),
    );

    await assert.rejects(
      marketplace.write.createListing([1n, parseEther("0.1")], {
        account: stranger.account,
      }),
    );
    await assert.rejects(
      marketplace.write.createListing([1n, 0n], {
        account: seller.account,
      }),
    );
    await assert.rejects(
      marketplace.write.createListing([1n, parseEther("0.1")], {
        account: seller.account,
      }),
    );

    await waitFor(
      await cards.write.approve([marketplace.address, 1n], {
        account: seller.account,
      }),
    );
    await waitFor(
      await marketplace.write.createListing([1n, parseEther("0.1")], {
        account: seller.account,
      }),
    );

    assert.equal(
      (await cards.read.ownerOf([1n])).toLowerCase(),
      marketplace.address.toLowerCase(),
    );
    assert.equal(await marketplace.read.tokenIsListed([1n]), true);
    const listings = await marketplace.read.getActiveListings();
    assert.equal(listings.length, 1);
    assert.equal(
      listings[0].seller.toLowerCase(),
      seller.account.address.toLowerCase(),
    );

    await assert.rejects(
      marketplace.write.createListing([1n, parseEther("0.2")], {
        account: seller.account,
      }),
    );
  });

  it("rejects unsolicited NFT transfers into escrow", async () => {
    const { cards, marketplace, seller } =
      await networkHelpers.loadFixture(deployFixture);
    await waitFor(
      await cards.write.mintCard(["ipfs://first"], {
        account: seller.account,
      }),
    );

    await assert.rejects(
      cards.write.safeTransferFrom(
        [seller.account.address, marketplace.address, 1n],
        { account: seller.account },
      ),
    );
    assert.equal(
      (await cards.read.ownerOf([1n])).toLowerCase(),
      seller.account.address.toLowerCase(),
    );
  });

  it("lets only the seller cancel and returns the card", async () => {
    const fixture = await networkHelpers.loadFixture(deployFixture);
    const { cards, marketplace, seller, stranger } = fixture;
    await mintAndList(fixture);

    await assert.rejects(
      marketplace.write.cancelListing([1n], { account: stranger.account }),
    );
    await waitFor(
      await marketplace.write.cancelListing([1n], {
        account: seller.account,
      }),
    );

    assert.equal(
      (await cards.read.ownerOf([1n])).toLowerCase(),
      seller.account.address.toLowerCase(),
    );
    assert.equal((await marketplace.read.getActiveListings()).length, 0);
    assert.equal(await marketplace.read.tokenIsListed([1n]), false);
    await assert.rejects(
      marketplace.write.cancelListing([1n], { account: seller.account }),
    );
  });

  it("requires an exact price and rejects seller self-purchases", async () => {
    const fixture = await networkHelpers.loadFixture(deployFixture);
    const { marketplace, seller, buyer } = fixture;
    const { price } = await mintAndList(fixture);

    await assert.rejects(
      marketplace.write.buyListing([1n], {
        account: buyer.account,
        value: price - 1n,
      }),
    );
    await assert.rejects(
      marketplace.write.buyListing([1n], {
        account: buyer.account,
        value: price + 1n,
      }),
    );
    await assert.rejects(
      marketplace.write.buyListing([1n], {
        account: seller.account,
        value: price,
      }),
    );
  });

  it("transfers the NFT, pays the seller in full, and deactivates the listing", async () => {
    const fixture = await networkHelpers.loadFixture(deployFixture);
    const { cards, marketplace, seller, buyer } = fixture;
    const { price } = await mintAndList(fixture);
    const publicClient = await viem.getPublicClient();
    const balanceBefore = await publicClient.getBalance({
      address: seller.account.address,
    });

    await waitFor(
      await marketplace.write.buyListing([1n], {
        account: buyer.account,
        value: price,
      }),
    );

    assert.equal(
      (await cards.read.ownerOf([1n])).toLowerCase(),
      buyer.account.address.toLowerCase(),
    );
    assert.equal(
      await publicClient.getBalance({ address: seller.account.address }),
      balanceBefore + price,
    );
    assert.equal((await marketplace.read.getActiveListings()).length, 0);
    assert.equal((await marketplace.read.getListing([1n])).active, false);
    await assert.rejects(
      marketplace.write.buyListing([1n], {
        account: buyer.account,
        value: price,
      }),
    );
  });

  it("blocks purchase reentrancy from an ERC-721 receiver", async () => {
    const fixture = await networkHelpers.loadFixture(deployFixture);
    const { cards, marketplace, buyer } = fixture;
    const { price } = await mintAndList(fixture);
    const attacker = await viem.deployContract("ReentrantBuyer", [
      marketplace.address,
    ]);

    await waitFor(
      await attacker.write.buy([1n], {
        account: buyer.account,
        value: price,
      }),
    );

    assert.equal(
      (await cards.read.ownerOf([1n])).toLowerCase(),
      attacker.address.toLowerCase(),
    );
    assert.equal(await attacker.read.reentrySucceeded(), false);
    assert.equal((await marketplace.read.getActiveListings()).length, 0);
  });
});


