import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buatSesi, AppError } from "@/lib/tiket";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const where: { destinasiId?: number; tanggal?: string } = {};
  const dest = q.get("destinasiId");
  if (dest) where.destinasiId = Number(dest);
  const tgl = q.get("tanggal");
  if (tgl) where.tanggal = tgl;
  const rows = await prisma.sesi.findMany({
    where,
    include: { destinasi: { select: { nama: true } } },
    orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) throw new AppError(400, "Body JSON wajib");
    const created = await buatSesi(body);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
