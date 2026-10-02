// Antrean offline scan gate berbasis IndexedDB.
// Dipakai halaman /scan saat offline; disync batch ke /api/scan/sync saat online.
export type ScanAntre = {
  id?: number;
  idempotencyKey: string;
  kode: string;
  jenis: "MASUK" | "KELUAR";
  waktu: string;
};

const DB = "gate-scan-db";
const STORE = "outbox";

function bukaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function tambahAntre(item: Omit<ScanAntre, "id" | "idempotencyKey">): Promise<void> {
  const db = await bukaDb();
  const full: ScanAntre = {
    ...item,
    idempotencyKey: `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function bacaAntre(): Promise<ScanAntre[]> {
  const db = await bukaDb();
  const rows = await new Promise<ScanAntre[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as ScanAntre[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

export async function hapusAntre(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await bukaDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Kirim seluruh antrean ke server; hapus yang sukses (termasuk duplikat).
export async function syncAntre(): Promise<{ dikirim: number; gagal: number }> {
  const antre = await bacaAntre();
  if (antre.length === 0) return { dikirim: 0, gagal: 0 };
  const r = await fetch("/api/scan/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scans: antre.map((a) => ({
        idempotencyKey: a.idempotencyKey,
        kode: a.kode,
        jenis: a.jenis,
        waktu: a.waktu,
        channel: "OFFLINE",
      })),
    }),
  });
  if (!r.ok) return { dikirim: 0, gagal: antre.length };
  const j = await r.json();
  const ok = new Set(
    (j.hasil as { idempotencyKey: string; ok: boolean }[])
      .filter((h) => h.ok)
      .map((h) => h.idempotencyKey)
  );
  const idsHapus = antre.filter((a) => ok.has(a.idempotencyKey)).map((a) => a.id!);
  await hapusAntre(idsHapus);
  return { dikirim: idsHapus.length, gagal: antre.length - idsHapus.length };
}
