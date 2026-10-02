"use client";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";

type Destinasi = { id: number; nama: string; lokasi: string; hargaDasar: number };
type Sesi = {
  id: number;
  destinasiId: number;
  destinasi: { nama: string };
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  kuota: number;
  sisaKuota: number;
  hargaTiket: number;
};

export default function SesiPage() {
  const [dest, setDest] = useState<Destinasi[]>([]);
  const [sesi, setSesi] = useState<Sesi[]>([]);
  const [msg, setMsg] = useState("");
  const [formS, setFormS] = useState({ destinasiId: "", tanggal: "", jamMulai: "", jamSelesai: "", kuota: "", hargaTiket: "" });
  const [formD, setFormD] = useState({ nama: "", lokasi: "", hargaDasar: "0" });

  const [formB, setFormB] = useState({ sesiId: "", jumlah: "1", namaPembeli: "", kontak: "" });
  const [hasilBeli, setHasilBeli] = useState<string[]>([]);

  const muat = () => {
    fetch("/api/destinasi").then((r) => r.json()).then(setDest);
    fetch("/api/sesi").then((r) => r.json()).then(setSesi);
  };
  useEffect(muat, []);

  const tambahDestinasi = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/destinasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formD, hargaDasar: Number(formD.hargaDasar) }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Destinasi ditambahkan" : `Gagal: ${j.error}`);
    setFormD({ nama: "", lokasi: "", hargaDasar: "0" });
    muat();
  };

  const tambahSesi = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/sesi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinasiId: Number(formS.destinasiId),
        tanggal: formS.tanggal,
        jamMulai: formS.jamMulai,
        jamSelesai: formS.jamSelesai,
        kuota: Number(formS.kuota),
        hargaTiket: Number(formS.hargaTiket),
      }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Sesi ditambahkan" : `Gagal: ${j.error}`);
    setFormS({ destinasiId: "", tanggal: "", jamMulai: "", jamSelesai: "", kuota: "", hargaTiket: "" });
    muat();
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Sesi Kunjungan</h1>
      {msg && <p className="rounded bg-slate-100 px-3 py-2 text-sm">{msg}</p>}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Daftar Sesi</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Destinasi</th>
                <th className="p-2 text-left">Tanggal</th>
                <th className="p-2 text-left">Jam</th>
                <th className="p-2 text-right">Kuota</th>
                <th className="p-2 text-right">Sisa</th>
                <th className="p-2 text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              {sesi.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.destinasi.nama}</td>
                  <td className="p-2">{s.tanggal}</td>
                  <td className="p-2">{s.jamMulai}–{s.jamSelesai}</td>
                  <td className="p-2 text-right">{s.kuota}</td>
                  <td className="p-2 text-right font-semibold">{s.sisaKuota}</td>
                  <td className="p-2 text-right">{rupiah(s.hargaTiket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Beli Tiket</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await fetch("/api/tiket/beli", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sesiId: Number(formB.sesiId),
                jumlah: Number(formB.jumlah),
                namaPembeli: formB.namaPembeli,
                kontak: formB.kontak,
              }),
            });
            const j = await r.json();
            if (r.ok) {
              setHasilBeli(j.tiket.map((t: { kode: string }) => t.kode));
              setMsg(`Berhasil beli ${j.jumlah} tiket`);
              setFormB({ sesiId: "", jumlah: "1", namaPembeli: "", kontak: "" });
            } else {
              setHasilBeli([]);
              setMsg(`Gagal: ${j.error}`);
            }
            muat();
          }}
          className="grid grid-cols-2 gap-2 md:grid-cols-5"
        >
          <select required value={formB.sesiId} onChange={(e) => setFormB({ ...formB, sesiId: e.target.value })} className="rounded border p-2">
            <option value="">— Pilih sesi —</option>
            {sesi.filter((s) => s.sisaKuota > 0).map((s) => (
              <option key={s.id} value={s.id}>
                {s.tanggal} {s.jamMulai}–{s.jamSelesai} (sisa {s.sisaKuota})
              </option>
            ))}
          </select>
          <input required type="number" min={1} max={100} placeholder="Jumlah" value={formB.jumlah} onChange={(e) => setFormB({ ...formB, jumlah: e.target.value })} className="rounded border p-2" />
          <input required placeholder="Nama pembeli" value={formB.namaPembeli} onChange={(e) => setFormB({ ...formB, namaPembeli: e.target.value })} className="rounded border p-2" />
          <input placeholder="Kontak (opsional)" value={formB.kontak} onChange={(e) => setFormB({ ...formB, kontak: e.target.value })} className="rounded border p-2" />
          <button className="rounded bg-blue-700 px-4 py-2 text-white">Beli Tiket</button>
        </form>
        {hasilBeli.length > 0 && (
          <div className="mt-3 rounded bg-emerald-50 p-3 text-sm">
            <p className="font-semibold">Kode tiket:</p>
            <ul className="list-disc pl-5 font-mono">{hasilBeli.map((k) => <li key={k}>{k}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Tambah Sesi</h2>
        <form onSubmit={tambahSesi} className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <select required value={formS.destinasiId} onChange={(e) => setFormS({ ...formS, destinasiId: e.target.value })} className="rounded border p-2">
            <option value="">— Destinasi —</option>
            {dest.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
          <input required type="date" value={formS.tanggal} onChange={(e) => setFormS({ ...formS, tanggal: e.target.value })} className="rounded border p-2" />
          <input required type="time" value={formS.jamMulai} onChange={(e) => setFormS({ ...formS, jamMulai: e.target.value })} className="rounded border p-2" />
          <input required type="time" value={formS.jamSelesai} onChange={(e) => setFormS({ ...formS, jamSelesai: e.target.value })} className="rounded border p-2" />
          <input required type="number" min={1} placeholder="Kuota" value={formS.kuota} onChange={(e) => setFormS({ ...formS, kuota: e.target.value })} className="rounded border p-2" />
          <input required type="number" min={0} placeholder="Harga tiket" value={formS.hargaTiket} onChange={(e) => setFormS({ ...formS, hargaTiket: e.target.value })} className="rounded border p-2" />
          <button className="rounded bg-emerald-700 px-4 py-2 text-white">Simpan Sesi</button>
        </form>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Tambah Destinasi</h2>
        <form onSubmit={tambahDestinasi} className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <input required placeholder="Nama destinasi" value={formD.nama} onChange={(e) => setFormD({ ...formD, nama: e.target.value })} className="rounded border p-2" />
          <input required placeholder="Lokasi" value={formD.lokasi} onChange={(e) => setFormD({ ...formD, lokasi: e.target.value })} className="rounded border p-2" />
          <input type="number" min={0} placeholder="Harga dasar" value={formD.hargaDasar} onChange={(e) => setFormD({ ...formD, hargaDasar: e.target.value })} className="rounded border p-2" />
          <button className="rounded bg-emerald-700 px-4 py-2 text-white">Simpan</button>
        </form>
      </section>
    </div>
  );
}
