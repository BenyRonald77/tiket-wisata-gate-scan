"use client";
import { useEffect, useState } from "react";
import { tambahAntre, bacaAntre, syncAntre } from "@/lib/client/outbox";

export default function ScanPage() {
  const [kode, setKode] = useState("");
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">("MASUK");
  const [hasil, setHasil] = useState("");
  const [antre, setAntre] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Daftarkan service worker (PWA petugas gerbang).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const cek = async () => {
      setOnline(navigator.onLine);
      setAntre((await bacaAntre()).length);
    };
    cek();
    const onOnline = async () => {
      setOnline(true);
      const r = await syncAntre().catch(() => null);
      if (r && r.dikirim > 0) setHasil(`📶 Sync offline: ${r.dikirim} scan terkirim`);
      setAntre((await bacaAntre()).length);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const syncManual = async () => {
    const r = await syncAntre().catch(() => null);
    if (!r) {
      setHasil("⚠️ Sync gagal: server tidak terjangkau");
      return;
    }
    setHasil(`📶 Sync: ${r.dikirim} terkirim, ${r.gagal} gagal`);
    setAntre((await bacaAntre()).length);
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasil("");
    const payload = { kode: kode.trim(), jenis, waktu: new Date().toISOString() };
    try {
      const r = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (r.ok) {
        setHasil(`✅ ${jenis} tercatat: ${j.tiket.namaPembeli} (${j.tiket.kode})`);
        setKode("");
      } else {
        setHasil(`❌ ${j.error}`);
      }
    } catch {
      // Offline / sinyal lemah: simpan ke antrean IndexedDB, sync nanti.
      await tambahAntre({ kode: payload.kode, jenis: payload.jenis, waktu: payload.waktu });
      setHasil(`📥 Disimpan ke antrean offline (akan disync otomatis saat online)`);
      setKode("");
      setAntre((await bacaAntre()).length);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gate Scan</h1>
        <span className={`rounded px-2 py-1 text-xs font-bold ${online ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
          {online ? "● ONLINE" : "● OFFLINE"}
        </span>
      </div>
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
      {antre > 0 && (
        <div className="space-y-2 rounded bg-amber-100 p-3 text-sm">
          <p>📶 {antre} scan menunggu sync (offline)</p>
          <button onClick={syncManual} className="rounded bg-amber-600 px-4 py-2 font-bold text-white">
            Sync Sekarang
          </button>
        </div>
      )}
    </div>
  );
}
