"use client";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";

type Tiket = {
  id: number;
  kode: string;
  namaPembeli: string;
  hargaBeli: number;
  masukAt: string | null;
  keluarAt: string | null;
  sesi: { tanggal: string; jamMulai: string; destinasi: { nama: string } };
  qrSvg?: string;
};

export default function TiketPage() {
  const [rows, setRows] = useState<Tiket[]>([]);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Tiket | null>(null);

  const muat = (cari = "") => {
    fetch(`/api/tiket${cari ? `?q=${encodeURIComponent(cari)}` : ""}`)
      .then((r) => r.json())
      .then(setRows);
  };
  useEffect(() => muat(), []);

  const lihat = async (kode: string) => {
    const r = await fetch(`/api/tiket/${encodeURIComponent(kode)}`);
    setDetail(await r.json());
  };

  const status = (t: Tiket) =>
    t.keluarAt ? "Sudah keluar" : t.masukAt ? "Di dalam area" : "Belum dipakai";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Data Tiket</h1>
      <form
        onSubmit={(e) => { e.preventDefault(); muat(q); }}
        className="flex gap-2"
      >
        <input
          placeholder="Cari kode / nama pembeli…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded border p-2"
        />
        <button className="rounded bg-emerald-700 px-4 py-2 text-white">Cari</button>
      </form>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Kode</th>
              <th className="p-2 text-left">Pembeli</th>
              <th className="p-2 text-left">Sesi</th>
              <th className="p-2 text-right">Harga</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 font-mono text-xs">{t.kode}</td>
                <td className="p-2">{t.namaPembeli}</td>
                <td className="p-2">{t.sesi.destinasi.nama} · {t.sesi.tanggal} {t.sesi.jamMulai}</td>
                <td className="p-2 text-right">{rupiah(t.hargaBeli)}</td>
                <td className="p-2">{status(t)}</td>
                <td className="p-2 text-right">
                  <button onClick={() => lihat(t.kode)} className="rounded bg-slate-200 px-3 py-1 text-xs">QR</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="rounded bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-bold">{detail.namaPembeli}</h2>
            <p className="mb-3 font-mono text-sm text-slate-600">{detail.kode}</p>
            {detail.qrSvg && <div dangerouslySetInnerHTML={{ __html: detail.qrSvg }} className="mx-auto w-fit" />}
            <p className="mt-3 text-sm text-slate-600">{status(detail)} · {rupiah(detail.hargaBeli)}</p>
            <button onClick={() => setDetail(null)} className="mt-4 rounded bg-slate-200 px-4 py-2">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
