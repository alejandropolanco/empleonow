import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Turnstile } from "@/components/Turnstile";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
        {!required && <span className="normal-case tracking-normal text-slate-400"> (opcional)</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white dark:bg-slate-700"
      />
    </div>
  );
}

export default function CompanyRegister() {
  const navigate = useNavigate();
  const { registerCompany } = useAuth();
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [nit, setNit] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sector, setSector] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);

  const submit = async () => {
    setError(null);
    if (!nombreEmpresa.trim() || !nit.trim() || !correo.trim() || contrasena.length < 8) {
      setError("Completa los campos obligatorios. La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await registerCompany({
        nombreEmpresa: nombreEmpresa.trim(),
        nit: nit.trim(),
        correo: correo.trim(),
        contrasena,
        telefono: telefono.trim() || undefined,
        sector: sector.trim() || undefined,
        turnstileToken: turnstileToken || undefined,
      });
      // <PublicOnly /> redirige a /company/desktop.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo registrar la empresa");
      setTurnstileReset((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-blue-950 flex transition-colors duration-300">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12">
        <Logo size="lg" />
        <div>
          <h2 className="font-display text-4xl text-white font-bold leading-tight mb-4">
            Publica tus vacantes
            <br />
            y encuentra talento.
          </h2>
          <ul className="space-y-3">
            {[
              "Publica ofertas en minutos",
              "Recibe postulaciones con CV",
              "Gestiona el estado de cada candidato",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 text-blue-100 text-sm">
                <span className="text-green-400">✓</span> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-blue-300 text-xs">© 2026 EmpleoNow</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute bottom-8 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <button
            onClick={() => navigate("/register")}
            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-6 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            ← Soy candidato
          </button>

          <h2 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            Registra tu empresa
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Crea la cuenta para publicar vacantes y gestionar postulantes.
          </p>

          <div className="flex flex-col gap-4">
            <Field label="Nombre de la empresa" value={nombreEmpresa} onChange={setNombreEmpresa} placeholder="TechSoluciones SAS" />
            <Field label="NIT" value={nit} onChange={setNit} placeholder="900.123.456-7" />
            <Field label="Correo corporativo" type="email" value={correo} onChange={setCorreo} placeholder="rrhh@empresa.com" />
            <Field label="Teléfono" value={telefono} onChange={setTelefono} placeholder="601 123 4567" required={false} />
            <Field label="Sector" value={sector} onChange={setSector} placeholder="Tecnología" required={false} />
            <Field label="Contraseña" type="password" value={contrasena} onChange={setContrasena} placeholder="Mínimo 8 caracteres" />

            <Turnstile onToken={setTurnstileToken} resetSignal={turnstileReset} />

            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? "CREANDO..." : "CREAR CUENTA DE EMPRESA"}
            </button>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</p>
            )}

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => navigate("/login")} className="text-blue-600 font-medium hover:underline">
                Inicia sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
