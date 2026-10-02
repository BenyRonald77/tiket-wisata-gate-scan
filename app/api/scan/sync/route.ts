import { NextRequest, NextResponse } from "next/server";
import { scanTiket, AppError, ScanInput } from "@/lib/tiket";

type SyncItem = ScanInput & { idempotencyKey: string };

// Batch scan idempoten untuk sync offline PWA petugas.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.scans) || body.scans.length === 0)
    return NextResponse.json({ error: "scans (array) wajib diisi" }, { status: 400 });
  if (body.scans.length > 500)
    return NextResponse.json({ error: "maksimal 500 scan per batch" }, { status: 400 });

  const hasil: { idempotencyKey: string; ok: boolean; duplikat?: boolean; error?: string; status?: number }[] = [];
  for (const item of body.scans as SyncItem[]) {
    if (!item || !item.idempotencyKey || !item.kode || (item.jenis !== "MASUK" && item.jenis !== "KELUAR")) {
      hasil.push({ idempotencyKey: String(item?.idempotencyKey ?? ""), ok: false, error: "item tidak valid", status: 400 });
      continue;
    }
    try {
      const r = await scanTiket({ ...item, channel: item.channel || "OFFLINE" });
      hasil.push({ idempotencyKey: item.idempotencyKey, ok: true, duplikat: r.duplikat || false });
    } catch (e) {
      if (e instanceof AppError) hasil.push({ idempotencyKey: item.idempotencyKey, ok: false, error: e.message, status: e.status });
      else hasil.push({ idempotencyKey: item.idempotencyKey, ok: false, error: "Kesalahan server", status: 500 });
    }
  }
  const sukses = hasil.filter((h) => h.ok).length;
  return NextResponse.json({ total: hasil.length, sukses, hasil });
}
