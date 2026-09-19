"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

const LINKS: { href: string; label: string; soon?: boolean }[] = [
  { href: "/", label: "Importar" },
  { href: "/plantilla", label: "Plantilla" },
  { href: "/roles", label: "Roles" },
  { href: "/tactica", label: "Táctica" },
  { href: "/rasgos", label: "Rasgos" },
  { href: "/entrenamiento", label: "Entrenamiento" },
  { href: "/juveniles", label: "Juveniles" },
  { href: "/ojeados", label: "Ojeados" },
  { href: "/balon-parado", label: "Balón parado" },
  { href: "/rival", label: "Rival" },
  { href: "/radiografia", label: "Radiografía" },
  { href: "/comparar", label: "Comparar" },
];

export function Nav() {
  const pathname = usePathname();
  const clubName = useAppStore((s) => s.clubName);
  const n = useAppStore((s) => s.players.plantilla.length);

  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-[1600px] mx-auto px-4 h-12 flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight">
          FM24 <span className="text-accent">Asistente</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-disabled={l.soon}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  active ? "bg-accent text-accent-fg" : "hover:bg-surface-2"
                } ${l.soon ? "opacity-50 pointer-events-none" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto text-xs text-muted">
          {clubName ? `${clubName} · ${n} jugadores` : "Sin plantilla importada"}
        </div>
      </div>
    </header>
  );
}
