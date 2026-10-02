import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tiket Wisata Gate Scan",
  description: "Tiket wisata dengan kuota harian dan gate scan",
  manifest: "/manifest.json",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/sesi", label: "Sesi & Tiket" },
  { href: "/tiket", label: "Data Tiket" },
  { href: "/scan", label: "Gate Scan" },
  { href: "/riwayat", label: "Riwayat Scan" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">
        <nav className="bg-emerald-700 text-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3">
            <span className="mr-4 font-bold">🎟️ Tiket Wisata</span>
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="rounded px-3 py-1.5 text-sm hover:bg-emerald-600">
                {n.label}
              </a>
            ))}
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
