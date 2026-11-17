import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { markOnboardingHandled } from "@/lib/onboarding";
import { ExperienceModal, SkillModal, type Experience, type Skill } from "./profileForms";

type SkillEntry = Skill & { kind: "technical" | "soft" };

function initialsOf(nombres: string, apellidos: string) {
  return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
}

/* ─── Completar perfil (onboarding tras registro) ──────────── */
export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cvName, setCvName] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);

  const [expModal, setExpModal] = useState(false);
  const [skillModal, setSkillModal] = useState<"technical" | "soft" | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .profile()
      .then(({ profile }) => {
        setPhone(profile.telefono);
        setAddress(profile.ubicacion);
        setCvName(profile.cvFileName);
        setExperiences(profile.experiences);
        setSkills([
          ...profile.technicalSkills.map((s) => ({ ...s, kind: "technical" as const })),
          ...profile.softSkills.map((s) => ({ ...s, kind: "soft" as const })),
        ]);
      })
      .catch(() => {
        /* perfil aún no creado: se empieza desde cero */
      });
  }, []);

  const fullName = user ? `${user.nombres} ${user.apellidos}` : "Sandra Adams";

  const finish = async () => {
    setError(null);
    setSaving(true);
    try {
      if (cvFile) await api.uploadCv(cvFile);
      await api.completeProfile({
        telefono: phone.trim() || undefined,
        ubicacion: address.trim() || undefined,
        experiences: experiences.map((e) => ({ role: e.role, company: e.company, period: e.period })),
        technicalSkills: skills
          .filter((s) => s.kind === "technical")
          .map(({ name, level }) => ({ name, level })),
        softSkills: skills.filter((s) => s.kind === "soft").map(({ name, level }) => ({ name, level })),
      });
      markOnboardingHandled();
      navigate("/candidate/desktop");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-blue-950 flex transition-colors duration-300">
      {/* Left blue panel (desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12">
        <Logo size="lg" />
        <div>
          <h2 className="font-display text-4xl text-white font-bold leading-tight mb-4">
            Completa tu perfil
            <br />
            y destaca ante las empresas.
          </h2>
          <ul className="space-y-3">
            {[
              "Agrega tu experiencia laboral y CV",
              "Muestra tus habilidades técnicas y blandas",
              "Facilita que los reclutadores te contacten",
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
        <p className="text-blue-300 text-xs">© 2026 EmpleoNow · Todos los derechos reservados</p>
      </div>

      {/* Right panel / form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 relative bg-slate-50 dark:bg-blue-950">
        {/* Toggle inside top-right corner on mobile, bottom-right on desktop */}
        <div className="absolute top-4 right-6 lg:bottom-8 lg:top-auto">
          <ThemeToggle />
        </div>

        <div className="w-full lg:max-w-xl flex flex-col items-center justify-center">
          {/* Mobile Demo bar (hidden on lg) */}
          <div className="flex lg:hidden items-center justify-between w-full max-w-sm mb-2 px-1 pt-2">
            <button onClick={() => navigate("/register")} className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600">← Registro</button>
            <div className="flex items-center gap-2">
              <button onClick={() => { markOnboardingHandled(); navigate("/candidate/desktop"); }} className="text-xs text-slate-400 hover:text-blue-600">Omitir →</button>
            </div>
          </div>

          {/* Phone frame on mobile (< lg), desktop container on lg+ */}
          <div className="w-full max-w-sm lg:max-w-xl rounded-[44px] lg:rounded-2xl overflow-hidden shadow-2xl lg:shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900 h-[calc(100vh-80px)] max-h-[812px] lg:h-auto lg:max-h-[85vh]">
            {/* Header */}
            <div className="px-5 pt-10 lg:pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Logo size="sm" />
              <h1 className="font-display font-bold text-xl text-slate-800 dark:text-slate-100 mt-3">Completar perfil</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Completa tu información para que las empresas te encuentren más fácil.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {initialsOf(user?.nombres ?? "S", user?.apellidos ?? "A")}
                  </div>
                  <button
                    onClick={() => setError("La foto de perfil estará disponible pronto")}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs"
                    aria-label="Cambiar foto (próximamente)"
                  >
                    ✎
                  </button>
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-slate-100">{fullName}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Candidato</p>
                </div>
              </div>

              {/* Contacto laboral */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Contacto laboral</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 dark:text-slate-400">Teléfono de contacto</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="123-456-7890" className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 dark:text-slate-400">Ubicación</label>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Cll 100 #51-20" className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* CV */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Hoja de vida (CV)</h3>
                <label className="w-full flex items-center justify-center py-3 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-all">
                  {cvName ?? "+ Adjuntar CV"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCvFile(file);
                        setCvName(file.name);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Experiencia */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Experiencia laboral</h3>
                  <button onClick={() => setExpModal(true)} className="text-xs text-blue-600 dark:text-blue-400 font-medium">+ Agregar</button>
                </div>
                {experiences.length === 0 ? (
                  <p className="text-xs text-slate-400">Aún no has agregado experiencia.</p>
                ) : (
                  <div className="space-y-2">
                    {experiences.map((e, i) => (
                      <div key={i} className="bg-white dark:bg-slate-700 rounded-xl p-3 border border-slate-100 dark:border-slate-600">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{e.role}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-300">{e.company} · {e.period}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Habilidades */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Habilidades</h3>
                  <div className="flex gap-3">
                    <button onClick={() => setSkillModal("technical")} className="text-xs text-blue-600 dark:text-blue-400 font-medium">+ Técnica</button>
                    <button onClick={() => setSkillModal("soft")} className="text-xs text-blue-600 dark:text-blue-400 font-medium">+ Blanda</button>
                  </div>
                </div>
                {skills.length === 0 ? (
                  <p className="text-xs text-slate-400">Aún no has agregado habilidades.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">{s.name} · {s.level}</span>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</p>
              )}
            </div>

            {/* Guardar */}
            <div className="px-5 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={finish}
                disabled={saving}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-60"
              >
                {saving ? "GUARDANDO..." : "GUARDAR Y CONTINUAR"}
              </button>
            </div>
          </div>

          {/* Desktop footer actions (hidden on mobile) */}
          <div className="hidden lg:flex items-center justify-between w-full max-w-xl mt-4 px-2">
            <button onClick={() => navigate("/register")} className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600">← Volver a registro</button>
            <button onClick={() => { markOnboardingHandled(); navigate("/candidate/desktop"); }} className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600">Omitir por ahora →</button>
          </div>
        </div>
      </div>

      {expModal && (
        <ExperienceModal
          onSave={(e) => setExperiences((prev) => [...prev, e])}
          onClose={() => setExpModal(false)}
        />
      )}
      {skillModal && (
        <SkillModal
          kind={skillModal}
          onSave={(s) => setSkills((prev) => [...prev, { ...s, kind: skillModal }])}
          onClose={() => setSkillModal(null)}
        />
      )}
    </div>
  );
}