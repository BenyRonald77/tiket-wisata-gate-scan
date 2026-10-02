# PRD — Tiket Wisata dengan Kuota Harian dan Gate Scan

## Ringkasan
Aplikasi penjualan tiket wisata dengan kuota harian per sesi kunjungan dan
gerbang scan masuk/keluar berbasis QR. Petugas gerbang memakai PWA yang tahan
sinyal lemah: scan disimpan ke antrean offline (IndexedDB) lalu disinkronkan
saat online.

**Stack:** Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS
(App Router).

## Fungsionalitas

### F0 — Master data
- **Destinasi/wahana**: nama, lokasi, deskripsi, harga dasar.
- **Sesi kunjungan**: destinasi + tanggal (`YYYY-MM-DD`) + jam mulai/selesai
  (`HH:MM`) + kuota pengunjung + harga tiket per sesi.
- UI: daftar sesi + form tambah sesi/destinasi.

### F1 — Penjualan tiket (atomik)
- Pilih sesi, jumlah tiket, data pembeli (nama, kontak opsional).
- Kuota dijaga **atomik**: `updateMany` kondisional single-statement
  (`sisaKuota >= jumlah` → decrement); 0 baris terpengaruh = kalah race /
  kuota habis → 409. Tidak boleh oversold meski request bersamaan.
- Tiap tiket punya kode unik (`TWG-…`) + kode QR (SVG) untuk sesinya.

### F2 — Gate scan (masuk/keluar)
- Endpoint scan `MASUK` dan `KELUAR`.
- Tiket QR hanya berlaku SEKALI untuk masuk: scan kedua → 409
  ("Tiket sudah dipakai"). Keluar juga tercatat sekali.
- Scan tiket sesi lain → 422; kode tidak dikenal → 404.
- **Sync batch**: `POST /api/scan/sync` menerima batch scan dengan
  `idempotencyKey` — scan yang sama tidak tercatat ganda.
- Semua perubahan status scan memakai `updateMany` kondisional (atomik),
  lalu `ScanLog` ditulis untuk riwayat.

### F3 — Dashboard realtime + riwayat
- Pengunjung di dalam area = total scan MASUK − total scan KELUAR
  (per sesi dan total). Halaman dashboard polling otomatis (interval fetch).
- Riwayat scan: filter sesi/tanggal/jenis.

### F4 — PWA petugas gerbang (tahan sinyal lemah)
- `manifest.json` + service worker (cache app shell).
- Halaman scan menyimpan hasil scan ke antrean offline IndexedDB saat
  offline, lalu sync batch ke server saat online (endpoint idempoten).
- **Caveat:** service worker + IndexedDB hanya bisa diverifikasi statis
  (file ada, route 200) karena tidak ada browser sungguhan. Endpoint sync +
  idempotency ter-test via curl.

## Model data (SQLite, via Prisma)

| Model | Kolom utama |
|---|---|
| Destinasi | id, nama, lokasi, deskripsi?, hargaDasar |
| Sesi | id, destinasiId, tanggal (TEXT), jamMulai, jamSelesai, kuota, sisaKuota, hargaTiket |
| Tiket | id, kode (unique), sesiId, namaPembeli, kontak?, hargaBeli, masukAt? (TEXT ISO), keluarAt? |
| ScanLog | id, tiketId, jenis (MASUK/KELUAR), waktu (TEXT ISO), idempotencyKey (unique), channel |

## Endpoint API

| Metode | Route | Keterangan |
|---|---|---|
| GET/POST | /api/destinasi | list / tambah destinasi |
| GET/POST | /api/sesi | list (filter destinasiId, tanggal) / tambah sesi |
| POST | /api/tiket/beli | beli N tiket, atomik vs kuota |
| GET | /api/tiket | list tiket (filter sesiId, q) |
| GET | /api/tiket/[kode] | detail tiket + QR SVG |
| POST | /api/scan | scan masuk/keluar tunggal |
| POST | /api/scan/sync | batch scan idempoten (offline sync) |
| GET | /api/scan/riwayat | riwayat scan (filter sesiId, tanggal, jenis) |
| GET | /api/dashboard | statistik per sesi + total (?tanggal) |

## Aturan bisnis penting
1. Penjualan tidak boleh melebihi kuota — dibuktikan race test
   (kuota 10, 25 request paralel → tepat 10 sukses).
2. Scan masuk ganda → 409; keluar sebelum masuk → 422;
   keluar ganda → 409; kode asing → 404; tiket sesi lain → 422.
3. Sync batch idempoten: `idempotencyKey` sama → tidak tercatat ganda.
4. Dashboard: diDalam = MASUK − KELUAR.

## Halaman UI (bahasa Indonesia)
- `/` — Dashboard realtime (polling)
- `/sesi` — daftar sesi + beli tiket + master destinasi/sesi
- `/tiket` — daftar tiket + detail + QR
- `/scan` — halaman scan gate petugas (mode masuk/keluar, antrean offline)
- `/riwayat` — riwayat scan
