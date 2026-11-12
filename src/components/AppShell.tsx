import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export interface ShellNavItem<T extends string> {
  id: T;
  label: string;
  icon: (active: boolean) => ReactNode;
}

interface AppShellProps<T extends string> {
  nav: ShellNavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  roleLabel: string;
  onLogout: () => void;
  children: ReactNode;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "U";
  const second = parts[1]?.charAt(0) ?? "";
  return `${first}${second}`.toUpperCase();
}

/**
 * Layout único y responsive para todos los paneles.
 * - Desktop (lg+): sidebar fija y contenido a pantalla completa.
 * - Móvil/tablet: barra superior + bottom navigation, contenido con scroll.
 */
export function AppShell<T extends string>({
  nav,
  active,
  onSelect,
  roleLabel,
  onLogout,
  children,
}: AppShellProps<T>) {
  const { user } = useAuth();
  const displayName =
    user?.nombre || [user?.nombres, user?.apellidos].filter(Boolean).join(" ") || user?.correo || "Usuario";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">
      {/* Sidebar escritorio */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-slate-900 text-white flex-col py-6">
        <div className="px-4 mb-8">
          <Logo size="sm" className="brightness-0 invert opacity-90" />
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => onSelect(n.id)}
              className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active === n.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="px-3">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              {initialsOf(displayName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <button
              onClick={onLogout}
              className="text-left px-2 py-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              ← Cerrar sesión
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-30">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={onLogout}
            className="text-xs font-medium text-slate-500 hover:text-red-500"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 min-w-0 flex flex-col lg:overflow-hidden pb-20 lg:pb-0">
        {children}
      </main>

      {/* Bottom navigation móvil */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 flex items-stretch justify-around px-1 py-1.5 safe-bottom">
        {nav.map(({ id, label, icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="flex flex-1 flex-col items-center gap-0.5 px-1 py-1 rounded-lg"
              aria-current={isActive ? "page" : undefined}
            >
              {icon(isActive)}
              <span
                className={`text-[10px] font-medium ${isActive ? "text-blue-600" : "text-slate-400"}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
