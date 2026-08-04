"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV } from "@/lib/nav";

type Props = {
  children: React.ReactNode;
  dataVersion?: string | null;
};

export function AppShell({ children, dataVersion }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ra-bg lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-ra-line bg-ra-navy-900 text-white lg:min-h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
            Reference Architecture
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight">EAIM</p>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            Grounded AI over precomputed metrics
          </p>
        </div>
        <nav className="px-3 pb-6" aria-label="Primary">
          <ul className="space-y-1">
            {PRIMARY_NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-3 py-2.5 transition-colors ${
                      active
                        ? "bg-white/12 text-white"
                        : "text-white/75 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] text-white/50">
                      {item.description}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {dataVersion && (
          <div className="mt-auto hidden border-t border-white/10 px-5 py-4 lg:block">
            <p className="text-[10px] uppercase tracking-wide text-white/45">Data version</p>
            <p className="mt-1 text-xs font-medium text-ra-hero-data-color">{dataVersion}</p>
          </div>
        )}
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
