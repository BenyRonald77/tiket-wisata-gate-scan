import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { nowIso } from "@/lib/format";

export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const bad = (msg: string) => new AppError(400, msg);
export const notFound = (msg: string) => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);
export const unprocessable = (msg: string) => new AppError(422, msg);

const isTanggal = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isJam = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function buatKodeTiket(sesiId: number): string {
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `TWG-${sesiId}-${Date.now().toString(36).toUpperCase()}${rand}`;
}

// ---------- Pembelian tiket (atomik terhadap kuota) ----------
export type BeliInput = { sesiId: number; jumlah: number; namaPembeli: string; kontak?: string };

export async function beliTiket(input: BeliInput) {
  const { sesiId, jumlah, namaPembeli, kontak } = input;
  if (!Number.isInteger(sesiId) || sesiId <= 0) throw bad("sesiId tidak valid");
  if (!Number.isInteger(jumlah) || jumlah <= 0 || jumlah > 100) throw bad("jumlah harus 1..100");
  if (!namaPembeli || !namaPembeli.trim()) throw bad("namaPembeli wajib diisi");

  const sesi = await prisma.sesi.findUnique({ where: { id: sesiId } });
  if (!sesi) throw notFound("Sesi tidak ditemukan");

  // Atomik: satu statement SQL. 0 baris = kuota tidak cukup (kalah race / habis).
  const upd = await prisma.sesi.updateMany({
    where: { id: sesiId, sisaKuota: { gte: jumlah } },
    data: { sisaKuota: { decrement: jumlah } },
  });
  if (upd.count === 0) throw conflict("Kuota sesi sudah habis / tidak cukup");

  // Buat tiket satu per satu; jika gagal di tengah, kembalikan kuota.
  const dibuat: { id: number; kode: string }[] = [];
  try {
    for (let i = 0; i < jumlah; i++) {
      const t = await prisma.tiket.create({
        data: {
          kode: buatKodeTiket(sesiId),
          sesiId,
          namaPembeli: namaPembeli.trim(),
          kontak: kontak?.trim() || null,
          hargaBeli: sesi.hargaTiket,
        },
        select: { id: true, kode: true },
      });
      dibuat.push(t);
    }
  } catch (e) {
    await prisma.tiket.deleteMany({ where: { id: { in: dibuat.map((t) => t.id) } } });
    await prisma.sesi.updateMany({ where: { id: sesiId }, data: { sisaKuota: { increment: jumlah } } });
    throw e;
  }
  return dibuat;
}

// ---------- Gate scan (atomik, conditional updateMany) ----------
export type ScanJenis = "MASUK" | "KELUAR";
export type ScanInput = {
  kode: string;
  jenis: ScanJenis;
  sesiId?: number;
  waktu?: string;
  idempotencyKey?: string;
  channel?: string;
};

export async function scanTiket(input: ScanInput) {
  const { kode, jenis, sesiId, waktu, idempotencyKey, channel } = input;
  if (!kode || !kode.trim()) throw bad("kode tiket wajib diisi");
  if (jenis !== "MASUK" && jenis !== "KELUAR") throw bad("jenis harus MASUK atau KELUAR");
  const waktuScan = waktu && /^\d{4}-\d{2}-\d{2}T/.test(waktu) ? waktu : nowIso();

  // Idempotency: kunci yang sama → kembalikan hasil sebelumnya tanpa scan ulang.
  const key = idempotencyKey?.trim();
  if (key) {
    const sudah = await prisma.scanLog.findUnique({
      where: { idempotencyKey: key },
      include: { tiket: true },
    });
    if (sudah) return { tiket: sudah.tiket, jenis: sudah.jenis, waktu: sudah.waktu, duplikat: true };
  }

  const tiket = await prisma.tiket.findUnique({ where: { kode: kode.trim() } });
  if (!tiket) throw notFound("Tiket tidak dikenal");
  if (sesiId && tiket.sesiId !== sesiId) throw unprocessable("Tiket ini untuk sesi lain");

  let terpakai: number;
  if (jenis === "MASUK") {
    if (tiket.masukAt) throw conflict("Tiket sudah dipakai masuk");
    terpakai = (
      await prisma.tiket.updateMany({
        where: { kode: tiket.kode, masukAt: null },
        data: { masukAt: waktuScan },
      })
    ).count;
    if (terpakai === 0) throw conflict("Tiket sudah dipakai masuk");
  } else {
    if (!tiket.masukAt) throw unprocessable("Tiket belum dipakai masuk");
    if (tiket.keluarAt) throw conflict("Tiket sudah tercatat keluar");
    terpakai = (
      await prisma.tiket.updateMany({
        where: { kode: tiket.kode, masukAt: { not: null }, keluarAt: null },
        data: { keluarAt: waktuScan },
      })
    ).count;
    if (terpakai === 0) {
      const segar = await prisma.tiket.findUnique({ where: { kode: tiket.kode } });
      if (segar?.keluarAt) throw conflict("Tiket sudah tercatat keluar");
      throw unprocessable("Tiket belum dipakai masuk");
    }
  }

  const logKey = key || `ONL-${randomBytes(8).toString("hex")}`;
  try {
    await prisma.scanLog.create({
      data: {
        tiketId: tiket.id,
        jenis,
        waktu: waktuScan,
        idempotencyKey: logKey,
        channel: channel || "ONLINE",
      },
    });
  } catch {
    // Kunci ganda dari race → anggap duplikat, status tiket sudah benar.
  }

  const hasil = await prisma.tiket.findUnique({ where: { kode: tiket.kode } });
  return { tiket: hasil, jenis, waktu: waktuScan, duplikat: false };
}

// ---------- Validasi master ----------
export type SesiInput = {
  destinasiId: number;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  kuota: number;
  hargaTiket: number;
};

export async function buatSesi(input: SesiInput) {
  const { destinasiId, tanggal, jamMulai, jamSelesai, kuota, hargaTiket } = input;
  if (!Number.isInteger(destinasiId) || destinasiId <= 0) throw bad("destinasiId tidak valid");
  if (!isTanggal(tanggal)) throw bad("tanggal harus YYYY-MM-DD");
  if (!isJam(jamMulai) || !isJam(jamSelesai)) throw bad("jam harus HH:MM");
  if (jamMulai >= jamSelesai) throw bad("jamMulai harus sebelum jamSelesai");
  if (!Number.isInteger(kuota) || kuota <= 0) throw bad("kuota harus > 0");
  if (!Number.isInteger(hargaTiket) || hargaTiket < 0) throw bad("hargaTiket tidak valid");
  const dest = await prisma.destinasi.findUnique({ where: { id: destinasiId } });
  if (!dest) throw notFound("Destinasi tidak ditemukan");
  return prisma.sesi.create({
    data: { destinasiId, tanggal, jamMulai, jamSelesai, kuota, sisaKuota: kuota, hargaTiket },
  });
}

export async function buatDestinasi(input: { nama: string; lokasi: string; deskripsi?: string; hargaDasar?: number }) {
  const { nama, lokasi, deskripsi, hargaDasar } = input;
  if (!nama?.trim()) throw bad("nama wajib diisi");
  if (!lokasi?.trim()) throw bad("lokasi wajib diisi");
  if (hargaDasar !== undefined && (!Number.isInteger(hargaDasar) || hargaDasar < 0)) throw bad("hargaDasar tidak valid");
  return prisma.destinasi.create({
    data: { nama: nama.trim(), lokasi: lokasi.trim(), deskripsi: deskripsi?.trim() || null, hargaDasar: hargaDasar ?? 0 },
  });
}
