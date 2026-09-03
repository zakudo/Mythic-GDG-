import { privateKeyToAccount } from "viem/accounts";

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const privateKey = Buffer.concat(chunks).toString("utf8").trim();
process.stdout.write(privateKeyToAccount(privateKey).address);
