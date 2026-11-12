import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, type ShellNavItem } from "@/components/AppShell";
import {
  ApplicationsIcon,
  DashboardIcon,
  FavoritesIcon,
  NotificationsIcon,
  OffersIcon,
  ProfileIcon,
} from "@/components/icons";
import { ThemeToggle, useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { Vacancy, Application, Notification } from "@/lib/data";
import { ExperienceModal, SkillModal, type Experience, type Skill } from "./profileForms";

type Section = "offers" | "profile" | "favorites" | "notifications" | "applications";

const NAV: ShellNavItem<Section>[] = [
  { id: "offers", label: "Ofertas", icon: (a) => <OffersIcon active={a} /> },
  { id: "profile", label: "Mi perfil", icon: (a) => <ProfileIcon active={a} /> },
  { id: "favorites", label: "Favoritos", icon: (a) => <FavoritesIcon active={a} /> },
  { id: "notifications", label: "Alertas", icon: (a) => <NotificationsIcon active={a} /> },
  { id: "applications", label: "Postulaciones", icon: (a) => <ApplicationsIcon active={a} /> },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "En revisión": "bg-amber-100 text-amber-800",
    Aceptado: "bg-green-100 text-green-700",
    Rechazado: "bg-red-100 text-red-700",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}


/* ─── Header ─────────────────────────────────────────────── */
function Header({ title, subtitle, searchValue, onSearch }: {
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearch?: (s: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 lg:px-8 py-4 lg:py-5 border-b border-slate-100 bg-white">
      <div>
        <h1 className="font-display font-bold text-lg lg:text-xl text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-64">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" /></svg>
        <input
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          placeholder="Buscar..."
          value={searchValue ?? ""}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
    </div>
  );
}

/* ─── Offers section ─────────────────────────────────────── */
function OffersSection({ vacancies, onRefresh, preselect }: {
  vacancies: Vacancy[] | null;
  onRefresh: () => void;
  preselect: Vacancy | null;
}) {
  const [selected, setSelected] = useState<Vacancy | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const filters = ["Medio tiempo", "Tiempo completo", "Sin experiencia", "Con experiencia", "Idiomas", "Más filtros"];

  useEffect(() => {
    if (preselect && vacancies) {
      setSelected(vacancies.find((v) => v.id === preselect.id) ?? preselect);
    }
  }, [preselect, vacancies]);

  useEffect(() => {
    if (!preselect && selected) {
      const fresh = vacancies?.find((v) => v.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [vacancies]);

  const term = search.trim().toLowerCase();
  const filtered = (vacancies ?? []).filter((v) => {
    if (term && ![v.title, v.company, v.location, v.area].join(" ").toLowerCase().includes(term)) return false;
    if (!filter) return true;
    if (filter === "Medio tiempo" || filter === "Tiempo completo") return v.type === filter;
    if (filter === "Sin experiencia") return v.experience === "Sin experiencia";
    if (filter === "Con experiencia") return v.experience === "Con experiencia";
    return true;
  });

  const apply = async () => {
    if (!selected) return;
    setNotice(null);
    try {
      await api.apply(selected.id);
      onRefresh();
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "No se pudo enviar la postulación");
    }
  };

  const toggleSave = async () => {
    if (!selected) return;
    try {
      const res = await api.toggleFavorite(selected.id);
      setSelected((v) => (v ? { ...v, saved: res.saved } : v));
      onRefresh();
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "No se pudo actualizar el favorito");
    }
  };

  const applied = selected?.applied ?? false;

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* List */}
      <div className={`flex flex-col border-r border-slate-100 min-w-0 ${selected ? "hidden lg:flex lg:w-96" : "flex-1"}`}>
        <Header title="Ofertas" subtitle="Explora las vacantes disponibles y filtra según lo que buscas." searchValue={search} onSearch={setSearch} />
        <div className="px-4 lg:px-6 py-3 flex gap-2 flex-wrap border-b border-slate-100 bg-white">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(filter === f ? null : f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"}`}>{f}</button>
          ))}
          <span className="text-xs text-slate-400 flex items-center">{filtered.length} vacantes encontradas</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {!vacancies ? (
            <p className="text-center text-xs text-slate-400 py-10">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-10">No se encontraron vacantes.</p>
          ) : (
            filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => { setSelected(v); setNotice(null); }}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-all hover:shadow-md ${selected?.id === v.id ? "border-blue-500 ring-1 ring-blue-200" : "border-slate-100 hover:border-blue-200"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">{v.company.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-slate-800 text-sm">{v.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${v.type === "Tiempo completo" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>{v.type}</span>
                    </div>
                    <p className="text-xs text-slate-500">{v.company} · {v.location.split(",")[0]}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{v.experience}</span>
                      <span className="text-xs font-medium text-green-600">{v.salary}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="flex-1 min-w-0 flex flex-col bg-white absolute inset-0 z-20 lg:static lg:inset-auto">
          <div className="px-4 lg:px-8 py-4 lg:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base lg:text-lg text-slate-800 truncate">{selected.title} — {selected.company}</h2>
              <p className="text-sm text-slate-500">📍 {selected.location}</p>
            </div>
            <button onClick={() => setSelected(null)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400" aria-label="Cerrar detalle">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-5 lg:py-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {[selected.type, selected.modality, selected.experience].map((t) => (
                <span key={t} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{t}</span>
              ))}
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">{selected.salary}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm mb-2">Descripción</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{selected.description}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Requisitos</h3>
                  <ul className="space-y-1">{selected.requirements.map((r) => <li key={r} className="flex items-start gap-2 text-sm text-slate-600"><span className="text-blue-400">•</span>{r}</li>)}</ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Beneficios</h3>
                  <ul className="space-y-1">{selected.benefits.map((b) => <li key={b} className="flex items-start gap-2 text-sm text-slate-600"><span className="text-green-500">✓</span>{b}</li>)}</ul>
                </div>
              </div>
            </div>
            {notice && <p className="mt-4 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{notice}</p>}
          </div>
          <div className="px-4 lg:px-8 pb-6 pt-3 border-t border-slate-100">
            {applied ? (
              <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="text-green-700 font-semibold text-sm">¡Ya estás postulado a esta vacante!</p>
                  <p className="text-green-600 text-xs">Usted se ha postulado correctamente. Espere que la empresa se comunique por correo.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={apply} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all">Postularme</button>
                <button onClick={toggleSave} className={`px-4 py-3 border rounded-xl text-sm transition-all ${selected.saved ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {selected.saved ? "♥ Guardado" : "♡ Guardar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Profile section ────────────────────────────────────── */
type SkillD = Skill & { desc?: string };

function ProfileSection() {
  const [tab, setTab] = useState<"experience" | "technical" | "soft">("experience");
  const { theme } = useTheme();

  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.profile>>["profile"] | null>(null);
  const [expModal, setExpModal] = useState<{ id: number | null } | null>(null);
  const [skillModal, setSkillModal] = useState<{ kind: "technical" | "soft"; id: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.profile().then((d) => setProfile(d.profile)).catch(() => setError("No se pudo cargar el perfil"));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const experiences = profile?.experiences ?? [];
  const technicalSkills = profile?.technicalSkills ?? [];
  const softSkills = profile?.softSkills ?? [];

  const saveExperience = async (exp: Experience) => {
    const current = expModal?.id != null ? experiences.find((e) => e.id === expModal.id) : null;
    try {
      if (current) await api.updateExperience(current.id, exp);
      else await api.createExperience(exp);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la experiencia");
    }
  };

  const saveSkill = async (s: Skill) => {
    const kind = skillModal?.kind ?? "technical";
    const list = kind === "technical" ? technicalSkills : softSkills;
    const current = skillModal?.id != null ? list.find((x) => x.id === skillModal.id) : null;
    try {
      if (current) await api.updateSkill(current.id, s);
      else await api.createSkill(kind, s);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la habilidad");
    }
  };

  const deleteExperience = async (id: number) => {
    await api.deleteExperience(id);
    reload();
  };

  const deleteSkill = async (id: number) => {
    await api.deleteSkill(id);
    reload();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 lg:px-8 py-4 lg:py-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-lg lg:text-xl text-slate-800">Experiencia y habilidades</h1>
          <p className="text-sm text-slate-500 mt-0.5">Administra tu experiencia laboral y tus habilidades técnicas y blandas.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{theme === "dark" ? "Modo oscuro" : "Modo claro"}</span>
          <ThemeToggle />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
        {error && <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        {!profile ? (
          <p className="text-center text-xs text-slate-400 py-10">Cargando...</p>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
              <div className="flex flex-wrap gap-2 lg:gap-4">
                {[{ id: "experience", label: "Experiencia" }, { id: "technical", label: "Hab. técnicas" }, { id: "soft", label: "Hab. blandas" }].map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id as typeof tab)} className={`px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-400"}`}>{t.label}</button>
                ))}
              </div>
              <button
                onClick={() => (tab === "experience" ? setExpModal({ id: null }) : setSkillModal({ kind: tab === "technical" ? "technical" : "soft", id: null }))}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                {tab === "experience" ? "+ Agregar experiencia" : "+ Agregar habilidad"}
              </button>
            </div>

            {tab === "experience" && (
              <div className="space-y-3">
                {experiences.map((e) => (
                  <div key={e.id} className="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{e.role}</h3>
                      <p className="text-sm text-slate-500">{e.company}</p>
                      <p className="text-xs text-slate-400 mt-1">{e.period}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setExpModal({ id: e.id })} className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">Editar</button>
                      <button onClick={() => deleteExperience(e.id)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "technical" && (
              <div className="space-y-3">
                {technicalSkills.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 text-sm">{s.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.level === "Avanzado" ? "bg-green-100 text-green-700" : s.level === "Intermedio" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{s.level}</span>
                      </div>
                      {(s as SkillD).desc && <p className="text-xs text-slate-500">{(s as SkillD).desc}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setSkillModal({ kind: "technical", id: s.id })} className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">Editar</button>
                      <button onClick={() => deleteSkill(s.id)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "soft" && (
              <div className="space-y-3">
                {softSkills.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 text-sm">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{s.level}</span>
                      <button onClick={() => setSkillModal({ kind: "soft", id: s.id })} className="text-xs text-blue-600 font-medium hover:underline">Editar</button>
                      <button onClick={() => deleteSkill(s.id)} className="text-xs text-red-500 font-medium hover:underline">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {expModal && (
        <ExperienceModal
          initial={expModal.id != null ? experiences.find((e) => e.id === expModal.id) : undefined}
          onSave={saveExperience}
          onClose={() => setExpModal(null)}
        />
      )}
      {skillModal && (
        <SkillModal
          kind={skillModal.kind}
          initial={skillModal.id != null ? (skillModal.kind === "technical" ? technicalSkills : softSkills).find((x) => x.id === skillModal.id) : undefined}
          onSave={saveSkill}
          onClose={() => setSkillModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Favorites section ──────────────────────────────────── */
function FavoritesSection({ onExplore }: { onExplore: (v: Vacancy) => void }) {
  const [favs, setFavs] = useState<Vacancy[] | null>(null);

  const reload = useCallback(() => {
    api.favorites().then((d) => setFavs(d.favorites)).catch(() => setFavs([]));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const unfavorite = async (v: Vacancy) => {
    await api.toggleFavorite(v.id);
    setFavs((prev) => prev?.filter((x) => x.id !== v.id) ?? prev);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Favoritos" subtitle="Las vacantes que has guardado para revisar más tarde." />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
        {!favs ? (
          <p className="text-center text-xs text-slate-400 py-10">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {favs.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-100 flex flex-wrap items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold">{v.company.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{v.title}</h3>
                  <p className="text-sm text-slate-500">{v.type} · {v.experience}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => unfavorite(v)} className="text-lg text-red-400 hover:text-red-600" aria-label="Quitar de favoritos">♥</button>
                  <button onClick={() => onExplore(v)} className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50">Mirar →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Notifications section ──────────────────────────────── */
function NotificationsSection() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.notifications().then((d) => setNotifications(d.notifications)).catch(() => setNotifications([]));
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = (notifications ?? []).filter((n) =>
    term ? `${n.title} ${n.subtitle}`.toLowerCase().includes(term) : true,
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Notificaciones" subtitle="Mantente al día del estado de tus postulaciones y tu perfil." searchValue={search} onSearch={setSearch} />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
        {!notifications ? (
          <p className="text-center text-xs text-slate-400 py-10">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div key={n.id} className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl shrink-0">{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.subtitle}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{n.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Applications section ───────────────────────────────── */
function ApplicationsSection({ vacancies, onRefresh }: { vacancies: Vacancy[] | null; onRefresh: () => void }) {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  const [search, setSearch] = useState("");

  const reload = useCallback(() => {
    api.applications().then((d) => setApps(d.applications)).catch(() => setApps([]));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const list = apps ?? [];
  const stats = [
    { label: "Total", value: list.length, color: "bg-slate-100 text-slate-800" },
    { label: "En revisión", value: list.filter((a) => a.status === "En revisión").length, color: "bg-amber-100 text-amber-800" },
    { label: "Aceptadas", value: list.filter((a) => a.status === "Aceptado").length, color: "bg-green-100 text-green-800" },
    { label: "Rechazadas", value: list.filter((a) => a.status === "Rechazado").length, color: "bg-red-100 text-red-800" },
  ];

  const term = search.trim().toLowerCase();
  const filtered = list.filter((a) => (term ? a.title.toLowerCase().includes(term) : true));
  const vacancy = selected ? (vacancies ?? []).find((v) => v.id === selected.vacancyId) : null;

  const withdraw = async () => {
    if (!selected) return;
    await api.withdraw(selected.id);
    setWithdrawn(true);
    setApps((prev) => prev?.filter((a) => a.id !== selected.id) ?? prev);
    onRefresh();
  };

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* List */}
      <div className={`flex flex-col border-r border-slate-100 min-w-0 ${selected && vacancy ? "hidden lg:flex lg:w-96" : "flex-1"}`}>
        <Header title="Postulaciones" subtitle="Haz seguimiento al estado de cada una de tus postulaciones." searchValue={search} onSearch={setSearch} />
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-2xl p-4 text-center ${s.color}`}>
                <p className="font-display font-bold text-2xl">{s.value}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {!apps ? (
            <p className="text-center text-xs text-slate-400 py-10">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setWithdrawn(false); }}
                  className={`w-full text-left bg-white rounded-2xl p-5 border transition-all hover:shadow-md ${selected?.id === a.id ? "border-blue-500 ring-1 ring-blue-200" : "border-slate-100 hover:border-blue-200"} flex items-center justify-between`}
                >
                  <div>
                    <h3 className="font-semibold text-slate-800">{a.title}</h3>
                    <p className="text-sm text-slate-500">Postulado: {a.appliedDate}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && vacancy && (
        <div className="flex-1 min-w-0 flex flex-col bg-white absolute inset-0 z-20 lg:static lg:inset-auto">
          <div className="px-4 lg:px-8 py-4 lg:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base lg:text-lg text-slate-800 truncate">{vacancy.title} — {vacancy.company}</h2>
              <p className="text-sm text-slate-500">📍 {vacancy.location}</p>
            </div>
            <button onClick={() => setSelected(null)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400" aria-label="Cerrar detalle">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-5 lg:py-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {[vacancy.type, vacancy.modality, vacancy.experience].map((t) => (
                <span key={t} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{t}</span>
              ))}
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">{vacancy.salary}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm mb-2">Descripción</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{vacancy.description}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Requisitos</h3>
                  <ul className="space-y-1">{vacancy.requirements.map((r) => <li key={r} className="flex items-start gap-2 text-sm text-slate-600"><span className="text-blue-400">•</span>{r}</li>)}</ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Beneficios</h3>
                  <ul className="space-y-1">{vacancy.benefits.map((b) => <li key={b} className="flex items-start gap-2 text-sm text-slate-600"><span className="text-green-500">✓</span>{b}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 lg:px-8 pb-6 pt-3 border-t border-slate-100">
            {withdrawn ? (
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-2xl">↩</span>
                <div>
                  <p className="text-slate-700 font-semibold text-sm">Postulación retirada</p>
                  <p className="text-slate-500 text-xs">Ya no apareces como postulante en esta vacante.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs text-slate-400">Postulado: {selected.appliedDate}</span>
                </div>
                <button onClick={withdraw} className="px-6 py-3 border border-red-200 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-50 transition-all">Retirar postulación</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Desktop Shell ──────────────────────────────────────── */
export default function DesktopCandidate() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [section, setSection] = useState<Section>("offers");
  const [vacancies, setVacancies] = useState<Vacancy[] | null>(null);
  const [preselect, setPreselect] = useState<Vacancy | null>(null);

  const reloadVacancies = useCallback(() => {
    api.vacancies().then((d) => setVacancies(d.vacancies)).catch(() => setVacancies([]));
  }, []);

  useEffect(() => {
    reloadVacancies();
  }, [reloadVacancies]);

  const exploreFav = (v: Vacancy) => {
    setPreselect(v);
    setSection("offers");
  };

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppShell nav={NAV} active={section} onSelect={setSection} roleLabel="Candidato" onLogout={doLogout}>
      {section === "offers" && <OffersSection vacancies={vacancies} onRefresh={reloadVacancies} preselect={preselect} />}
      {section === "profile" && <ProfileSection />}
      {section === "favorites" && <FavoritesSection onExplore={exploreFav} />}
      {section === "notifications" && <NotificationsSection />}
      {section === "applications" && <ApplicationsSection vacancies={vacancies} onRefresh={reloadVacancies} />}
    </AppShell>
  );
}