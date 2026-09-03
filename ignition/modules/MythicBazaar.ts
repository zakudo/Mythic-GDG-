import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MythicBazaar", (module) => {
  const cards = module.contract("MythicCards");
  const marketplace = module.contract("MythicMarketplace", [cards]);

  return { cards, marketplace };
});
