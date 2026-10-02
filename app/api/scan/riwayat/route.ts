import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const where: { jenis?: string; tiket?: { sesiId?: number }; waktu?: { startsWith: string } } = {};
  const jenis = q.get("jenis");
  if (jenis === "MASUK" || jenis === "KELUAR") where.jenis = jenis;
  const sesiId = q.get("sesiId");
  if (sesiId) where.tiket = { sesiId: Number(sesiId) };
  const tanggal = q.get("tanggal");
  if (tanggal) where.waktu = { startsWith: tanggal };

  const rows = await prisma.scanLog.findMany({
    where,
    include: {
      tiket: { select: { kode: true, namaPembeli: true, sesi: { select: { tanggal: true, jamMulai: true } } } },
    },
    orderBy: { id: "desc" },
    take: 200,
  });
  return NextResponse.json(rows);
}
