import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StatRow = { sesiId: number; terjual: number; masuk: number; keluar: number };

// Pengunjung di dalam area = scan MASUK − scan KELUAR.
export async function GET(req: NextRequest) {
  const tanggal = req.nextUrl.searchParams.get("tanggal");

  const sesi = await prisma.sesi.findMany({
    where: tanggal ? { tanggal } : undefined,
    include: { destinasi: { select: { nama: true } } },
    orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }],
  });

  const rows = await prisma.$queryRaw<StatRow[]>`
    SELECT "sesiId", COUNT(*) AS terjual,
      SUM(CASE WHEN "masukAt" IS NOT NULL THEN 1 ELSE 0 END) AS masuk,
      SUM(CASE WHEN "keluarAt" IS NOT NULL THEN 1 ELSE 0 END) AS keluar
    FROM "Tiket"
    GROUP BY "sesiId"
  `;
  const stat = new Map<number, { terjual: number; masuk: number; keluar: number }>();
  for (const r of rows) {
    stat.set(Number(r.sesiId), {
      terjual: Number(r.terjual),
      masuk: Number(r.masuk),
      keluar: Number(r.keluar),
    });
  }

  const perSesi = sesi.map((s) => {
    const st = stat.get(s.id) ?? { terjual: 0, masuk: 0, keluar: 0 };
    return {
      id: s.id,
      destinasi: s.destinasi.nama,
      tanggal: s.tanggal,
      jam: `${s.jamMulai}–${s.jamSelesai}`,
      kuota: s.kuota,
      sisaKuota: s.sisaKuota,
      terjual: st.terjual,
      masuk: st.masuk,
      keluar: st.keluar,
      diDalam: st.masuk - st.keluar,
    };
  });

  const total = perSesi.reduce(
    (a, s) => ({
      terjual: a.terjual + s.terjual,
      masuk: a.masuk + s.masuk,
      keluar: a.keluar + s.keluar,
      diDalam: a.diDalam + s.diDalam,
    }),
    { terjual: 0, masuk: 0, keluar: 0, diDalam: 0 }
  );

  return NextResponse.json({ perSesi, total });
}
