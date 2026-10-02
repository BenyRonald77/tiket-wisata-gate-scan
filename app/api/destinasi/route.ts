import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buatDestinasi, AppError } from "@/lib/tiket";

export async function GET() {
  const rows = await prisma.destinasi.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) throw new AppError(400, "Body JSON wajib");
    const created = await buatDestinasi(body);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
