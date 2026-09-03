import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/metadata";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_LIMIT = 64 * 1024;
const alphabet = "abcdefghijklmnopqrstuvwxyz234567";

function base32(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let result = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

function rawCid(bytes: Uint8Array) {
  const digest = createHash("sha256").update(bytes).digest();
  const cidBytes = Buffer.concat([
    Buffer.from([0x01, 0x55, 0x12, 0x20]),
    digest,
  ]);
  return `b${base32(cidBytes)}`;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) {
      return NextResponse.json({ error: "Choose a file to store." }, { status: 400 });
    }

    const isJson = value.type === "application/json";
    const isImage = ALLOWED_IMAGE_TYPES.includes(
      value.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    );
    if (!isJson && !isImage) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP, and JSON files are supported." },
        { status: 415 },
      );
    }

    const sizeLimit = isJson ? JSON_LIMIT : MAX_IMAGE_SIZE;
    if (value.size > sizeLimit) {
      return NextResponse.json({ error: "The file is too large." }, { status: 413 });
    }

    const bytes = new Uint8Array(await value.arrayBuffer());
    if (isJson) JSON.parse(new TextDecoder().decode(bytes));

    const cid = rawCid(bytes);
    const storeDirectory = path.join(process.cwd(), ".mythic", "ipfs");
    await mkdir(storeDirectory, { recursive: true });
    await Promise.all([
      writeFile(path.join(storeDirectory, cid), bytes),
      writeFile(path.join(storeDirectory, `${cid}.type`), value.type, "utf8"),
    ]);

    return NextResponse.json(
      { cid, url: `/api/ipfs/${cid}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "The local IPFS block could not be stored." },
      { status: 500 },
    );
  }
}
