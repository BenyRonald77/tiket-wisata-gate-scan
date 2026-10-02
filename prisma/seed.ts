import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const n = await prisma.destinasi.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  const dest = await prisma.destinasi.create({
    data: {
      nama: "Taman Wisata Air Terjun",
      lokasi: "Kabupaten Wisata",
      deskripsi: "Destinasi wisata alam air terjun dengan jalur trekking",
      hargaDasar: 25000,
    },
  });

  const d = new Date();
  const besok = new Date(d.getTime() + 24 * 3600 * 1000);
  const tgl = `${besok.getFullYear()}-${String(besok.getMonth() + 1).padStart(2, "0")}-${String(besok.getDate()).padStart(2, "0")}`;

  const sesiPagi = await prisma.sesi.create({
    data: {
      destinasiId: dest.id,
      tanggal: tgl,
      jamMulai: "08:00",
      jamSelesai: "12:00",
      kuota: 100,
      sisaKuota: 100,
      hargaTiket: 25000,
    },
  });
  const sesiSore = await prisma.sesi.create({
    data: {
      destinasiId: dest.id,
      tanggal: tgl,
      jamMulai: "13:00",
      jamSelesai: "17:00",
      kuota: 50,
      sisaKuota: 50,
      hargaTiket: 35000,
    },
  });
  // Sesi kuota kecil khusus race test (kuota 10)
  const sesiRace = await prisma.sesi.create({
    data: {
      destinasiId: dest.id,
      tanggal: tgl,
      jamMulai: "18:00",
      jamSelesai: "20:00",
      kuota: 10,
      sisaKuota: 10,
      hargaTiket: 50000,
    },
  });

  // Beberapa tiket contoh pada sesi pagi (kuota berkurang atomik via updateMany)
  const contoh = ["Budi", "Sari", "Agus", "Dewi", "Rina"];
  for (const nama of contoh) {
    const kode = `TWG-${sesiPagi.id}-SEED${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await prisma.sesi.updateMany({
      where: { id: sesiPagi.id, sisaKuota: { gte: 1 } },
      data: { sisaKuota: { decrement: 1 } },
    });
    await prisma.tiket.create({
      data: {
        kode,
        sesiId: sesiPagi.id,
        namaPembeli: nama,
        kontak: "0812-0000-0000",
        hargaBeli: sesiPagi.hargaTiket,
        masukAt: nama === "Budi" ? new Date().toISOString() : null,
      },
    });
    if (nama === "Budi") {
      const t = await prisma.tiket.findUniqueOrThrow({ where: { kode } });
      await prisma.scanLog.create({
        data: {
          tiketId: t.id,
          jenis: "MASUK",
          waktu: new Date().toISOString(),
          idempotencyKey: `SEED-${kode}`,
          channel: "ONLINE",
        },
      });
    }
  }

  console.log(`seed selesai: destinasi=${dest.id} sesi=[${sesiPagi.id},${sesiSore.id},${sesiRace.id}]`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
