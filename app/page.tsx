"use client";
import { useEffect, useState } from "react";

type SesiStat = {
  id: number;
  destinasi: string;
  tanggal: string;
  jam: string;
  kuota: number;
  sisaKuota: number;
  terjual: number;
  masuk: number;
  keluar: number;
  diDalam: number;
};

export default function Home() {
  const [data, setData] = useState<{ perSesi: SesiStat[]; total: { terjual: number; masuk: number; keluar: number; diDalam: number } } | null>(null);

  useEffect(() => {
    const muat = () => fetch("/api/dashboard").then((r) => r.json()).then(setData);
    muat();
    const t = setInterval(muat, 5000); // polling realtime
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Pengunjung</h1>
        <span className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Realtime (refresh 5 dtk)
        </span>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Tiket terjual", val: data.total.terjual, bg: "bg-blue-50 text-blue-800" },
            { label: "Sudah masuk", val: data.total.masuk, bg: "bg-emerald-50 text-emerald-800" },
            { label: "Sudah keluar", val: data.total.keluar, bg: "bg-amber-50 text-amber-800" },
            { label: "Di dalam area", val: data.total.diDalam, bg: "bg-violet-50 text-violet-800" },
          ].map((k) => (
            <div key={k.label} className={`rounded border p-4 ${k.bg}`}>
              <p className="text-sm">{k.label}</p>
              <p className="text-3xl font-bold">{k.val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Destinasi</th>
              <th className="p-2 text-left">Tanggal</th>
              <th className="p-2 text-left">Jam</th>
              <th className="p-2 text-right">Kuota</th>
              <th className="p-2 text-right">Terjual</th>
              <th className="p-2 text-right">Sisa</th>
              <th className="p-2 text-right">Masuk</th>
              <th className="p-2 text-right">Keluar</th>
              <th className="p-2 text-right font-bold">Di dalam</th>
            </tr>
          </thead>
          <tbody>
            {data?.perSesi.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.destinasi}</td>
                <td className="p-2">{s.tanggal}</td>
                <td className="p-2">{s.jam}</td>
                <td className="p-2 text-right">{s.kuota}</td>
                <td className="p-2 text-right">{s.terjual}</td>
                <td className="p-2 text-right">{s.sisaKuota}</td>
                <td className="p-2 text-right">{s.masuk}</td>
                <td className="p-2 text-right">{s.keluar}</td>
                <td className="p-2 text-right font-bold text-violet-700">{s.diDalam}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
