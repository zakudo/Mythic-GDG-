import { readFile } from "node:fs/promises";
import path from "node:path";

const rpcUrl = process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:8545";
const addressPath = path.join(
  process.cwd(),
  ".mythic",
  "sepolia-wallet.address",
);
const address = (await readFile(addressPath, "utf8")).trim();

const response = await fetch(rpcUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "hardhat_setBalance",
    params: [address, "0x3635c9adc5dea00000"],
  }),
});
const payload = await response.json();

if (!response.ok || payload.error) {
  throw new Error(payload.error?.message || "Could not fund the local wallet.");
}

process.stdout.write(`Funded ${address} with 1000 local ETH.\n`);
