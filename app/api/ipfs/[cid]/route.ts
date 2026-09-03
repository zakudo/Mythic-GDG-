import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CID_PATTERN = /^b[a-z2-7]{58}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cid: string }> },
) {
  const { cid } = await params;
  if (!CID_PATTERN.test(cid)) {
    return NextResponse.json({ error: "Invalid local IPFS CID." }, { status: 400 });
  }

  try {
    const storeDirectory = path.join(process.cwd(), ".mythic", "ipfs");
    const [bytes, contentType] = await Promise.all([
      readFile(path.join(storeDirectory, cid)),
      readFile(path.join(storeDirectory, `${cid}.type`), "utf8"),
    ]);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Local IPFS block not found." }, { status: 404 });
  }
}
