import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

/**
 * Placeholder del panel de administración.
 * La aprobación de empresas y la moderación se implementan en una fase
 * posterior; por ahora la ruta existe y queda protegida por rol.
 */
export default function AdminPlaceholder() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-4 lg:px-8 py-4 border-b border-slate-100 bg-white">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={doLogout} className="text-xs font-medium text-slate-500 hover:text-red-500">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center bg-white border border-slate-100 rounded-2xl p-10">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
            🛠️
          </div>
          <h1 className="font-display font-bold text-xl text-slate-800">Panel de administración</h1>
          <p className="text-sm text-slate-500 mt-2">
            Estamos construyendo la moderación de empresas y vacantes. Esta sección estará disponible
            muy pronto.
          </p>
        </div>
      </main>
    </div>
  );
}
