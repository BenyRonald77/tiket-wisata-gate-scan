import { NextRequest, NextResponse } from "next/server";
import { beliTiket, AppError } from "@/lib/tiket";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) throw new AppError(400, "Body JSON wajib");
    const tiket = await beliTiket(body);
    return NextResponse.json({ tiket, jumlah: tiket.length }, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
