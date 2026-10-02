# Tiket Wisata Gate Scan

Tiket wisata dengan kuota harian per sesi kunjungan dan gate scan masuk/keluar
berbasis QR, plus PWA petugas gerbang yang tahan sinyal lemah (antrean offline
IndexedDB + sync batch idempoten).

Stack: Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS.

## Cara Menjalankan

```bash
npm install --ignore-scripts   # workaround: unduh binary prisma manual (lihat bawah)
# salin 2 file engine dari ~/workspace/ts-convert/prisma-engines/ ke node_modules/@prisma/engines/
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Workaround Prisma di VM ini: unduhan `binaries.prisma.sh` selalu ECONNRESET,
jadi install dengan `--ignore-scripts` lalu salin `schema-engine-debian-openssl-3.0.x`
dan `libquery_engine-debian-openssl-3.0.x.so.node` ke `node_modules/@prisma/engines/`.

## Halaman

| Route | Keterangan |
|---|---|
| `/` | Dashboard realtime (polling 5 detik): pengunjung di dalam = MASUK − KELUAR |
| `/sesi` | Daftar sesi, beli tiket, tambah destinasi/sesi |
| `/tiket` | Daftar & pencarian tiket, detail + QR SVG |
| `/scan` | Scan gate petugas (mode masuk/keluar), antrean offline + sync |
| `/riwayat` | Riwayat scan masuk/keluar |

## API

- `GET/POST /api/destinasi` — master destinasi
- `GET/POST /api/sesi` — sesi kunjungan (?destinasiId, ?tanggal)
- `POST /api/tiket/beli` — beli tiket, kuota dijaga atomik (409 jika habis)
- `GET /api/tiket` — list tiket (?sesiId, ?q)
- `GET /api/tiket/[kode]` — detail + QR SVG
- `POST /api/scan` — scan MASUK/KELUAR
- `POST /api/scan/sync` — batch scan idempoten (offline sync)
- `GET /api/scan/riwayat` — riwayat scan
- `GET /api/dashboard` — statistik per sesi + total

## Kode error

| Kode | Arti |
|---|---|
| 400 | input tidak valid |
| 404 | destinasi/sesi/tiket tidak ditemukan |
| 409 | kuota habis / tiket sudah dipakai masuk / sudah keluar |
| 422 | tiket untuk sesi lain / keluar sebelum masuk |

## Catatan PWA

`manifest.json` + service worker (`sw.js`) hanya terverifikasi statis
(file ada, route 200) karena tidak ada browser sungguhan di lingkungan ini.
Endpoint sync + idempotency key teruji via curl.
