import { NextRequest, NextResponse } from "next/server";
import { scanTiket, AppError } from "@/lib/tiket";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) throw new AppError(400, "Body JSON wajib");
    const hasil = await scanTiket(body);
    return NextResponse.json(hasil, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
