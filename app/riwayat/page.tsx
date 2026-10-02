"use client";
import { useEffect, useState } from "react";

type Log = {
  id: number;
  jenis: string;
  waktu: string;
  channel: string;
  tiket: { kode: string; namaPembeli: string; sesi: { tanggal: string; jamMulai: string } };
};

export default function RiwayatPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [jenis, setJenis] = useState("");
  const [tanggal, setTanggal] = useState("");

  const muat = () => {
    const p = new URLSearchParams();
    if (jenis) p.set("jenis", jenis);
    if (tanggal) p.set("tanggal", tanggal);
    fetch(`/api/scan/riwayat?${p.toString()}`).then((r) => r.json()).then(setRows);
  };
  useEffect(muat, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Riwayat Scan</h1>
      <div className="flex gap-2">
        <select value={jenis} onChange={(e) => setJenis(e.target.value)} className="rounded border p-2">
          <option value="">Semua jenis</option>
          <option value="MASUK">MASUK</option>
          <option value="KELUAR">KELUAR</option>
        </select>
        <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="rounded border p-2" />
        <button onClick={muat} className="rounded bg-emerald-700 px-4 py-2 text-white">Filter</button>
      </div>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Waktu</th>
              <th className="p-2 text-left">Jenis</th>
              <th className="p-2 text-left">Kode</th>
              <th className="p-2 text-left">Pembeli</th>
              <th className="p-2 text-left">Sesi</th>
              <th className="p-2 text-left">Channel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2 font-mono text-xs">{l.waktu.replace("T", " ").slice(0, 19)}</td>
                <td className="p-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${l.jenis === "MASUK" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{l.jenis}</span>
                </td>
                <td className="p-2 font-mono text-xs">{l.tiket.kode}</td>
                <td className="p-2">{l.tiket.namaPembeli}</td>
                <td className="p-2">{l.tiket.sesi.tanggal} {l.tiket.sesi.jamMulai}</td>
                <td className="p-2 text-xs">{l.channel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
