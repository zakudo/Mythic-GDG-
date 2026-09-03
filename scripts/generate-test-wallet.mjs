import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const address = privateKeyToAccount(privateKey).address;

process.stdout.write(JSON.stringify({ privateKey, address }));
