import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Logo from "@/components/Logo"
import { Turnstile } from "@/components/Turnstile"
import { ThemeToggle, useTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth"
import { ApiError } from "@/lib/api"

function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white dark:bg-slate-700"
      />
    </div>
  )
}

function SocialButtons() {
  const [hint, setHint] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3 justify-center">
        {[
          { label: "f", bg: "#1877f2" },
          { label: "X", bg: "#000000" },
          { label: "G", bg: "#ea4335" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setHint("Inicio de sesión social disponible próximamente")}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold transition hover:opacity-80"
            style={{ background: s.bg }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  )
}

/* ─── Splash ─────────────────────────────────────────────────── */
export function SplashScreen() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center gap-6 p-8 relative transition-colors duration-300 ${
        isDark ? "bg-black" : "bg-gradient-to-br from-blue-600 to-blue-800"
      }`}
    >
      {/* Toggle inside bottom-right — not clipping the edge */}
      <div className="absolute bottom-8 right-6">
        <ThemeToggle />
      </div>

      {/* Logo — no white block in dark mode */}
      <div className={`rounded-3xl p-4 shadow-2xl ${isDark ? "" : "bg-white"}`}>
        <Logo size="xl" />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        {/* Iniciar sesión: always white bg, text black in dark */}
        <button
          onClick={() => navigate("/login")}
          className={`w-full py-4 bg-white rounded-2xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 ${
            isDark ? "text-black" : "text-blue-600"
          }`}
        >
          Iniciar sesión
        </button>

        {/* Regístrate: dark → black bg + white border + white text */}
        <button
          onClick={() => navigate("/register")}
          className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all ${
            isDark
              ? "bg-black text-white border border-white hover:bg-white/10"
              : "bg-blue-500 text-white border border-blue-400 hover:bg-blue-400"
          }`}
        >
          Regístrate
        </button>
      </div>
    </div>
  )
}

/* ─── Login ──────────────────────────────────────────────────── */
export function LoginScreen() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("sandra.a@mail.com")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileReset, setTurnstileReset] = useState(0)

  const submit = async () => {
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password, turnstileToken || undefined)
      // <PublicOnly /> redirige según el rol (candidato/empresa/admin).
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo iniciar sesión")
      setTurnstileReset((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-blue-950 flex transition-colors duration-300">
      {/* Left blue panel (desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12">
        <Logo size="lg" />
        <div>
          <h2 className="font-display text-4xl text-white font-bold leading-tight mb-4">
            Encuentra el empleo
            <br />
            que se adapta a tu vida.
          </h2>
          <ul className="space-y-3">
            {[
              "Vacantes verificadas por empresas reales",
              "Postúlate con un solo clic",
              "Notificaciones del estado de tu proceso",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 text-blue-100 text-sm"
              >
                <span className="text-green-400">✓</span> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-blue-300 text-xs">
          © 2026 EmpleoNow · Todos los derechos reservados
        </p>
      </div>

      {/* Right panel / form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Toggle inside bottom-right corner */}
        <div className="absolute bottom-8 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* Logo — large, centered, top of form on all viewports */}
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            Bienvenido
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Ingresa tus credenciales para continuar.
          </p>

          <div className="flex flex-col gap-4">
            <Input
              label="Correo electrónico"
              placeholder="ejemplo@gmail.com"
              value={email}
              onChange={setEmail}
            />
            <div className="flex flex-col gap-1">
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
              />
              <button
                onClick={() => navigate("/forgot-password")}
                className="text-xs text-blue-600 text-right hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Turnstile onToken={setTurnstileToken} resetSignal={turnstileReset} />

<button
              onClick={submit}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60"
            >
              {loading ? "INGRESANDO..." : "CONTINUAR"}
            </button>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
              <span className="text-xs text-slate-400">síguenos en</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
            </div>

            <SocialButtons />

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              ¿No tienes cuenta?{" "}
              <button
                onClick={() => navigate("/register")}
                className="text-blue-600 font-medium hover:underline"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Register ───────────────────────────────────────────────── */
export function RegisterScreen() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileReset, setTurnstileReset] = useState(0)

  const submit = async () => {
    setError(null)
    if (!name.trim() || !email.trim() || !password) {
      setError("Completa todos los campos para continuar")
      return
    }
    setLoading(true)
    try {
      const parts = name.trim().split(/\s+/)
      const nombres = parts[0]
      const apellidos = parts.slice(1).join(" ") || "."
      await register(nombres, apellidos, email.trim(), password, turnstileToken || undefined)
      // La redirección a /candidate/complete-profile la hace <PublicOnly />:
      // así no compite con el cambio de estado del usuario recién creado.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear la cuenta")
      setTurnstileReset((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-blue-950 flex transition-colors duration-300">
      {/* Left blue panel (desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12">
        <Logo size="lg" />
        <div>
          <h2 className="font-display text-4xl text-white font-bold leading-tight mb-4">
            Crea tu perfil en
            <br />
            menos de dos minutos.
          </h2>
          <ul className="space-y-3">
            {[
              "Registro 100% gratuito",
              "Tu información siempre segura",
              "Soporte para candidatos",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 text-blue-100 text-sm"
              >
                <span className="text-green-400">✓</span> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-blue-300 text-xs">© 2026 EmpleoNow</p>
      </div>

      {/* Right panel / form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Toggle inside bottom-right corner */}
        <div className="absolute bottom-8 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* Logo — large, centered, top of form */}
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-6 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            ← Iniciar sesión
          </button>

          <h2 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            Crea tu perfil
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Solo te tomará un par de minutos.
          </p>

          <div className="flex flex-col gap-4">
            <Input
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={name}
              onChange={setName}
            />
            <Input
              label="Correo electrónico"
              placeholder="ejemplo@gmail.com"
              value={email}
              onChange={setEmail}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="1234ejemplo"
              value={password}
              onChange={setPassword}
            />

            <Turnstile onToken={setTurnstileToken} resetSignal={turnstileReset} />

<button
              onClick={submit}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? "CREANDO..." : "CONTINUAR → COMPLETAR PERFIL"}
            </button>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
              <span className="text-xs text-slate-400">síguenos en</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
            </div>
            <SocialButtons />

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <button
                onClick={() => navigate("/register/company")}
                className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 font-medium border border-blue-200 dark:border-blue-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all"
              >
                Registrar mi empresa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Forgot Password ─────────────────────────────────────────── */
export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-blue-950 flex items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        {!sent ? (
          <div className="bg-white dark:bg-blue-900/50 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-blue-800">
            <h2 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Ingresa tu correo y te enviaremos instrucciones para
              restablecerla.
            </p>
            <div className="flex flex-col gap-4">
              <Input
                label="Correo"
                placeholder="ejemplo@gmail.com"
                value={email}
                onChange={setEmail}
              />
              <button
                onClick={() => setSent(true)}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all"
              >
                ENVIAR INSTRUCCIONES
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-blue-900/50 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-blue-800 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Revisa tu correo
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Te enviamos instrucciones a{" "}
              <strong>{email || "tu correo"}</strong>.
            </p>
          </div>
        )}

        <button
          onClick={() => navigate("/login")}
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
        >
          Volver a iniciar sesión
        </button>
      </div>
    </div>
  )
}
