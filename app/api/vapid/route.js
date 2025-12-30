import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key não configurada" },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}
