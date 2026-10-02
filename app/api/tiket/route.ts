import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const where: { sesiId?: number; OR?: object[] } = {};
  const sesiId = q.get("sesiId");
  if (sesiId) where.sesiId = Number(sesiId);
  const cari = q.get("q");
  if (cari) {
    where.OR = [
      { kode: { contains: cari } },
      { namaPembeli: { contains: cari } },
    ];
  }
  const rows = await prisma.tiket.findMany({
    where,
    include: { sesi: { select: { tanggal: true, jamMulai: true, destinasi: { select: { nama: true } } } } },
    orderBy: { id: "desc" },
    take: 100,
  });
  return NextResponse.json(rows);
}
