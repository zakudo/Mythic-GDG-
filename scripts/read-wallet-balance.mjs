import { createPublicClient, formatEther, http } from "viem";

const [address, rpcUrl] = process.argv.slice(2);
const client = createPublicClient({
  transport: http(rpcUrl),
});
const balance = await client.getBalance({ address });

process.stdout.write(`${formatEther(balance)} local ETH`);
