"use client";
import { useState } from "react";

export default function ScanPage() {
  const [kode, setKode] = useState("");
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">("MASUK");
  const [hasil, setHasil] = useState("");

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasil("");
    const r = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode: kode.trim(), jenis }),
    });
    const j = await r.json();
    if (r.ok) {
      setHasil(`\u2705 ${jenis} tercatat: ${j.tiket.namaPembeli} (${j.tiket.kode})`);
      setKode("");
    } else {
      setHasil(`\u274c ${j.error}`);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Gate Scan</h1>
      <div className="flex gap-2">
        {(["MASUK", "KELUAR"] as const).map((j) => (
          <button
            key={j}
            onClick={() => setJenis(j)}
            className={`flex-1 rounded px-4 py-3 font-bold ${jenis === j ? (j === "MASUK" ? "bg-emerald-700 text-white" : "bg-amber-600 text-white") : "bg-slate-200"}`}
          >
            {j}
          </button>
        ))}
      </div>
      <form onSubmit={kirim} className="space-y-2">
        <input
          autoFocus
          placeholder="Kode tiket (hasil pindai QR)"
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          className="w-full rounded border p-3 font-mono text-lg"
        />
        <button className="w-full rounded bg-slate-900 px-4 py-3 font-bold text-white">
          Catat {jenis}
        </button>
      </form>
      {hasil && <p className="rounded bg-slate-100 p-3 text-sm">{hasil}</p>}
    </div>
  );
}
