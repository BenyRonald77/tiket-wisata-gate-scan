import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(_req: NextRequest, { params }: { params: { kode: string } }) {
  const tiket = await prisma.tiket.findUnique({
    where: { kode: decodeURIComponent(params.kode) },
    include: { sesi: { include: { destinasi: true } } },
  });
  if (!tiket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  const qrSvg = await QRCode.toString(tiket.kode, { type: "svg", margin: 1, width: 220 });
  return NextResponse.json({ ...tiket, qrSvg });
}
