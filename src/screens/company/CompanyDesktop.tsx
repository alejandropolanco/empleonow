import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, type ShellNavItem } from "@/components/AppShell";
import {
  ApplicantsIcon,
  DashboardIcon,
  NotificationsIcon,
  ProfileIcon,
  VacanciesIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth";
import {
  api,
  ApiError,
  type AppNotification,
  type CompanyApplicant,
  type CompanyProfile,
  type CompanyVacancy,
  type CompanyVacancyInput,
} from "@/lib/api";

type Section = "dashboard" | "vacancies" | "applicants" | "profile" | "notifications";

const NAV: ShellNavItem<Section>[] = [
  { id: "dashboard", label: "Panel", icon: (a) => <DashboardIcon active={a} /> },
  { id: "vacancies", label: "Vacantes", icon: (a) => <VacanciesIcon active={a} /> },
  { id: "applicants", label: "Postulantes", icon: (a) => <ApplicantsIcon active={a} /> },
  { id: "profile", label: "Empresa", icon: (a) => <ProfileIcon active={a} /> },
  { id: "notifications", label: "Alertas", icon: (a) => <NotificationsIcon active={a} /> },
];

function statusClass(status: string) {
  if (status === "Activa") return "bg-green-100 text-green-700";
  if (status === "Pausada") return "bg-amber-100 text-amber-700";
  if (status === "Cerrada") return "bg-slate-200 text-slate-600";
  if (status === "Pendiente") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function applicantStatusClass(status: string) {
  if (status === "Aceptado") return "bg-green-100 text-green-700";
  if (status === "Rechazado") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5">
      <p className={`font-display font-bold text-2xl lg:text-3xl ${accent}`}>{value}</p>
      <p className="text-xs lg:text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 lg:px-8 py-4 lg:py-5 border-b border-slate-100 bg-white">
      <div>
        <h1 className="font-display font-bold text-lg lg:text-xl text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Dashboard ─────────────────────────────────────────── */
function DashboardSection({
  profile,
  vacancies,
  onNavigate,
  onNewVacancy,
}: {
  profile: CompanyProfile;
  vacancies: CompanyVacancy[];
  onNavigate: (s: Section) => void;
  onNewVacancy: () => void;
}) {
  const recent = vacancies.slice(0, 5);
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SectionHeader
        title={`Hola, ${profile.nombreEmpresa}`}
        subtitle="Resumen de tu actividad de reclutamiento."
        action={
          <button
            onClick={onNewVacancy}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            + Nueva vacante
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label="Vacantes publicadas" value={profile.stats.vacancies} accent="text-slate-800" />
          <StatCard label="Vacantes activas" value={profile.stats.activeVacancies} accent="text-green-600" />
          <StatCard label="Postulaciones" value={profile.stats.applications} accent="text-blue-600" />
          <StatCard label="Por revisar" value={profile.stats.pendingApplications} accent="text-amber-600" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm lg:text-base">Vacantes recientes</h2>
              <button onClick={() => onNavigate("vacancies")} className="text-xs font-medium text-blue-600 hover:underline">
                Ver todas
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">Aún no has publicado vacantes.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.title}</p>
                      <p className="text-xs text-slate-500">
                        {v.area || "General"} · {v.location || "Sin ubicación"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{v.applicants} postulantes</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClass(v.status)}`}>
                      {v.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-800 text-sm lg:text-base mb-3">Acciones rápidas</h2>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate("applicants")}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-sm text-slate-700 transition-colors"
              >
                Revisar postulantes
              </button>
              <button
                onClick={() => onNavigate("vacancies")}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-sm text-slate-700 transition-colors"
              >
                Gestionar vacantes
              </button>
              <button
                onClick={() => onNavigate("profile")}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-sm text-slate-700 transition-colors"
              >
                Actualizar perfil de empresa
              </button>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">Estado de la cuenta</p>
              <p className="text-sm font-medium text-slate-700 capitalize mt-0.5">{profile.estado}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Vacantes ──────────────────────────────────────────── */
interface VacancyFormState {
  title: string;
  area: string;
  location: string;
  type: string;
  modality: string;
  experience: string;
  salary: string;
  description: string;
  requirementsText: string;
  benefitsText: string;
  deadline: string;
}

const EMPTY_FORM: VacancyFormState = {
  title: "",
  area: "",
  location: "",
  type: "Tiempo completo",
  modality: "Presencial",
  experience: "",
  salary: "",
  description: "",
  requirementsText: "",
  benefitsText: "",
  deadline: "",
};

function toForm(v: CompanyVacancy): VacancyFormState {
  return {
    title: v.title,
    area: v.area,
    location: v.location,
    type: v.type || "Tiempo completo",
    modality: v.modality || "Presencial",
    experience: v.experience,
    salary: v.salary,
    description: v.description,
    requirementsText: v.requirements.join("\n"),
    benefitsText: v.benefits.join("\n"),
    deadline: v.deadlineIso ? v.deadlineIso.slice(0, 10) : "",
  };
}

function toPayload(form: VacancyFormState): CompanyVacancyInput {
  const lines = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  return {
    title: form.title.trim(),
    area: form.area.trim() || undefined,
    location: form.location.trim() || undefined,
    type: form.type || undefined,
    modality: form.modality || undefined,
    experience: form.experience.trim() || undefined,
    salary: form.salary.trim() || undefined,
    description: form.description.trim() || undefined,
    requirements: lines(form.requirementsText),
    benefits: lines(form.benefitsText),
    deadline: form.deadline || undefined,
  };
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function VacancyModal({
  vacancy,
  onClose,
  onSaved,
}: {
  vacancy: CompanyVacancy | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<VacancyFormState>(vacancy ? toForm(vacancy) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof VacancyFormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError(null);
    if (form.title.trim().length < 3) {
      setError("El cargo debe tener al menos 3 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (vacancy) await api.updateCompanyVacancy(vacancy.id, payload);
      else await api.createCompanyVacancy(payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la vacante.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-lg text-slate-800">
            {vacancy ? "Editar vacante" : "Nueva vacante"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500">Cargo *</label>
            <input className={inputClass} value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="Desarrollador Full Stack" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Área</label>
              <input className={inputClass} value={form.area} onChange={(e) => set("area")(e.target.value)} placeholder="Tecnología" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Ubicación</label>
              <input className={inputClass} value={form.location} onChange={(e) => set("location")(e.target.value)} placeholder="Bogotá, Colombia" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Tipo de empleo</label>
              <select className={inputClass} value={form.type} onChange={(e) => set("type")(e.target.value)}>
                <option>Tiempo completo</option>
                <option>Medio tiempo</option>
                <option>Por horas</option>
                <option>Contrato</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Modalidad</label>
              <select className={inputClass} value={form.modality} onChange={(e) => set("modality")(e.target.value)}>
                <option>Presencial</option>
                <option>Remoto</option>
                <option>Híbrido</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Experiencia</label>
              <input className={inputClass} value={form.experience} onChange={(e) => set("experience")(e.target.value)} placeholder="2 años" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Salario</label>
              <input className={inputClass} value={form.salary} onChange={(e) => set("salary")(e.target.value)} placeholder="$3.500.000" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fecha límite</label>
            <input type="date" className={inputClass} value={form.deadline} onChange={(e) => set("deadline")(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Descripción</label>
            <textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder="Describe el rol y el día a día del cargo." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Requisitos (uno por línea)</label>
              <textarea className={`${inputClass} min-h-28`} value={form.requirementsText} onChange={(e) => set("requirementsText")(e.target.value)} placeholder={"React\nTypeScript\n2 años de experiencia"} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Beneficios (uno por línea)</label>
              <textarea className={`${inputClass} min-h-28`} value={form.benefitsText} onChange={(e) => set("benefitsText")(e.target.value)} placeholder={"Seguro médico\nTrabajo remoto"} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : vacancy ? "Guardar cambios" : "Publicar vacante"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VacanciesSection({
  vacancies,
  onRefresh,
  onOpenApplicants,
}: {
  vacancies: CompanyVacancy[];
  onRefresh: () => void;
  onOpenApplicants: (vacancyId: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CompanyVacancy | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vacancies;
    return vacancies.filter(
      (v) => v.title.toLowerCase().includes(q) || v.area.toLowerCase().includes(q),
    );
  }, [vacancies, search]);

  const changeStatus = async (v: CompanyVacancy, estado: "activo" | "pausada" | "cerrada") => {
    setError(null);
    try {
      await api.setCompanyVacancyStatus(v.id, estado);
      onRefresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar la vacante.");
    }
  };

  const remove = async (v: CompanyVacancy) => {
    if (!window.confirm(`¿Eliminar la vacante "${v.title}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    try {
      await api.deleteCompanyVacancy(v.id);
      onRefresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo eliminar la vacante.");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SectionHeader
        title="Vacantes"
        subtitle="Publica, edita y controla el estado de tus ofertas."
        action={
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            + Nueva vacante
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 max-w-md mb-5">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Buscar vacante..."
          />
        </div>

        {error && <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <p className="text-sm text-slate-500">No hay vacantes todavía.</p>
            <button onClick={() => setCreating(true)} className="mt-3 text-sm font-medium text-blue-600 hover:underline">
              Publicar la primera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
            {filtered.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800">{v.title}</h3>
                    <p className="text-sm text-slate-500">
                      {v.area || "General"} · {v.location || "Sin ubicación"}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClass(v.status)}`}>
                    {v.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs rounded-full">{v.type || "Sin tipo"}</span>
                  <span className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs rounded-full">{v.modality || "Sin modalidad"}</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                    {v.applicants} postulantes
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onOpenApplicants(v.id)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    Ver postulantes
                  </button>
                  <button
                    onClick={() => setEditing(v)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    Editar
                  </button>
                  {v.estadoRaw === "activo" ? (
                    <button
                      onClick={() => changeStatus(v, "pausada")}
                      className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
                    >
                      Pausar
                    </button>
                  ) : (
                    <button
                      onClick={() => changeStatus(v, "activo")}
                      className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                    >
                      Activar
                    </button>
                  )}
                  {v.estadoRaw !== "cerrada" && (
                    <button
                      onClick={() => changeStatus(v, "cerrada")}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100"
                    >
                      Cerrar
                    </button>
                  )}
                  <button
                    onClick={() => remove(v)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 sm:ml-auto"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <VacancyModal
          vacancy={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

/* ─── Postulantes ──────────────────────────────────────── */
function ApplicantsSection({
  vacancies,
  initialVacancyId,
}: {
  vacancies: CompanyVacancy[];
  initialVacancyId?: number | null;
}) {
  const [vacancyId, setVacancyId] = useState<number | null>(
    initialVacancyId ?? vacancies[0]?.id ?? null,
  );
  const [applicants, setApplicants] = useState<CompanyApplicant[] | null>(null);
  const [selected, setSelected] = useState<CompanyApplicant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vacancyId === null && vacancies.length > 0) setVacancyId(vacancies[0]!.id);
  }, [vacancies, vacancyId]);

  const load = useCallback(() => {
    if (vacancyId === null) {
      setApplicants([]);
      return;
    }
    setApplicants(null);
    api
      .companyApplicants(vacancyId)
      .then((d) => setApplicants(d.applicants))
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudieron cargar los postulantes."));
  }, [vacancyId]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (applicant: CompanyApplicant, estado: "en_revision" | "aceptado" | "rechazado") => {
    setSaving(true);
    setError(null);
    try {
      const { application } = await api.updateCompanyApplication(applicant.id, estado);
      setApplicants((prev) => prev?.map((a) => (a.id === application.id ? application : a)) ?? prev);
      setSelected(application);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar la postulación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 relative">
      <div className={`flex flex-col border-r border-slate-100 min-w-0 ${selected ? "hidden lg:flex lg:w-96" : "flex-1"}`}>
        <SectionHeader
          title="Postulantes"
          subtitle="Revisa los candidatos de cada vacante y actualiza su estado."
          action={
            <select
              value={vacancyId ?? ""}
              onChange={(e) => {
                setSelected(null);
                setVacancyId(e.target.value ? Number(e.target.value) : null);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 max-w-full"
            >
              {vacancies.length === 0 && <option value="">Sin vacantes</option>}
              {vacancies.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          }
        />
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
          {error && <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          {applicants === null ? (
            <p className="text-center text-xs text-slate-400 py-10">Cargando...</p>
          ) : applicants.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <p className="text-sm text-slate-500">Esta vacante aún no tiene postulantes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applicants.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 lg:p-5 flex flex-wrap items-center gap-3 transition-colors ${
                    selected?.id === a.id ? "border-blue-300" : "border-slate-100 hover:border-blue-200"
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{a.name}</p>
                    <p className="text-sm text-slate-500 truncate">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 hidden sm:inline">{a.appliedDate}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${applicantStatusClass(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="flex-1 min-w-0 flex flex-col bg-white absolute inset-0 z-20 lg:static lg:inset-auto">
          <div className="px-4 lg:px-8 py-4 lg:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base lg:text-lg text-slate-800 truncate">{selected.name}</h2>
              <p className="text-sm text-slate-500 truncate">
                {selected.vacancyTitle} · {selected.appliedDate}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
              aria-label="Cerrar detalle"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-5 lg:py-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${applicantStatusClass(selected.status)}`}>
                {selected.status}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">📧 {selected.email}</span>
              {selected.phone && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">📞 {selected.phone}</span>}
              {selected.address && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">📍 {selected.address}</span>}
            </div>

            {selected.cvUrl && (
              <a
                href={selected.cvUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100"
              >
                📄 {selected.cvFileName || "Ver hoja de vida"}
              </a>
            )}

            <div>
              <h3 className="font-semibold text-slate-700 text-sm mb-2">Experiencia</h3>
              {selected.experience.length === 0 ? (
                <p className="text-sm text-slate-400">Sin experiencia registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {selected.experience.map((e) => (
                    <li key={e.id} className="bg-slate-50 rounded-xl px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{e.role}</p>
                      <p className="text-xs text-slate-500">
                        {e.company} · {e.period}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm mb-2">Habilidades técnicas</h3>
                {selected.technicalSkills.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin registrar.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selected.technicalSkills.map((s) => (
                      <span key={s.id} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                        {s.name} · {s.level}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 text-sm mb-2">Habilidades blandas</h3>
                {selected.softSkills.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin registrar.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selected.softSkills.map((s) => (
                      <span key={s.id} className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                        {s.name} · {s.level}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 lg:px-8 pb-6 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => update(selected, "aceptado")}
              disabled={saving || selected.estadoRaw === "aceptado"}
              className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              Aceptar
            </button>
            <button
              onClick={() => update(selected, "rechazado")}
              disabled={saving || selected.estadoRaw === "rechazado"}
              className="px-5 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              onClick={() => update(selected, "en_revision")}
              disabled={saving || selected.estadoRaw === "en_revision"}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Dejar en revisión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Perfil de empresa ────────────────────────────────── */
function ProfileSection({ profile, onRefresh }: { profile: CompanyProfile; onRefresh: () => void }) {
  const [form, setForm] = useState({
    nombreEmpresa: profile.nombreEmpresa,
    telefono: profile.telefono ?? "",
    sector: profile.sector ?? "",
    descripcion: profile.descripcion ?? "",
    direccion: profile.direccion ?? "",
    logo: profile.logo ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setForm({
      nombreEmpresa: profile.nombreEmpresa,
      telefono: profile.telefono ?? "",
      sector: profile.sector ?? "",
      descripcion: profile.descripcion ?? "",
      direccion: profile.direccion ?? "",
      logo: profile.logo ?? "",
    });
  }, [profile]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setError(null);
    setOk(false);
    if (form.nombreEmpresa.trim().length < 2) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await api.patchCompanyProfile({
        nombreEmpresa: form.nombreEmpresa.trim(),
        telefono: form.telefono.trim(),
        sector: form.sector.trim(),
        descripcion: form.descripcion.trim(),
        direccion: form.direccion.trim(),
        logo: form.logo.trim(),
      });
      setOk(true);
      onRefresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SectionHeader title="Mi empresa" subtitle="Esta información se muestra en tus vacantes publicadas." />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-100 p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
              {form.nombreEmpresa.charAt(0).toUpperCase() || "E"}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{form.nombreEmpresa || "Tu empresa"}</p>
              <p className="text-sm text-slate-500">NIT {profile.nit}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Nombre de la empresa *</label>
              <input className={inputClass} value={form.nombreEmpresa} onChange={(e) => set("nombreEmpresa")(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Sector</label>
              <input className={inputClass} value={form.sector} onChange={(e) => set("sector")(e.target.value)} placeholder="Tecnología" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Teléfono</label>
              <input className={inputClass} value={form.telefono} onChange={(e) => set("telefono")(e.target.value)} placeholder="601 123 4567" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Dirección</label>
              <input className={inputClass} value={form.direccion} onChange={(e) => set("direccion")(e.target.value)} placeholder="Cll 100 #51-20" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Logo (URL)</label>
            <input className={inputClass} value={form.logo} onChange={(e) => set("logo")(e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Descripción</label>
            <textarea
              className={`${inputClass} min-h-28`}
              value={form.descripcion}
              onChange={(e) => set("descripcion")(e.target.value)}
              placeholder="Cuéntale a los candidatos qué hace tu empresa."
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          {ok && <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">Perfil actualizado correctamente.</p>}

          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Notificaciones ───────────────────────────────────── */
function NotificationsSection() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .companyNotifications()
      .then((d) => setItems(d.notifications))
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudieron cargar las notificaciones."));
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SectionHeader title="Notificaciones" subtitle="Novedades sobre tus vacantes y postulaciones." />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
        {error && <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        {items === null ? (
          <p className="text-center text-xs text-slate-400 py-10">Cargando...</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <p className="text-sm text-slate-500">No tienes notificaciones por ahora.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                  {n.icon}
                </div>
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

/* ─── Vista de empresa pendiente (aprobación futura) ───── */
function PendingCompany({ company }: { company: CompanyProfile }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-4 lg:px-8 py-4 border-b border-slate-100 bg-white">
        <p className="font-display font-bold text-slate-800">EmpleoNow</p>
        <button onClick={doLogout} className="text-xs font-medium text-slate-500 hover:text-red-500">
          Cerrar sesión
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center bg-white border border-slate-100 rounded-2xl p-10">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
            ⏳
          </div>
          <h1 className="font-display font-bold text-xl text-slate-800">Cuenta en revisión</h1>
          <p className="text-sm text-slate-500 mt-2">
            Estamos verificando la información de <strong>{company.nombreEmpresa}</strong>. Cuando tu cuenta
            sea aprobada podrás publicar vacantes y recibir postulaciones.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─── Panel principal ──────────────────────────────────── */
export default function CompanyDesktop() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [section, setSection] = useState<Section>("dashboard");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [vacancies, setVacancies] = useState<CompanyVacancy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [applicantsVacancyId, setApplicantsVacancyId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [p, v] = await Promise.all([api.companyProfile(), api.companyVacancies()]);
      setProfile(p.company);
      setVacancies(v.vacancies);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cargar el panel de empresa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Cargando panel...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-red-600">{error ?? "No se pudo cargar el panel de empresa."}</p>
        <button onClick={() => void reload()} className="text-sm font-medium text-blue-600 hover:underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (profile.estado === "pendiente") return <PendingCompany company={profile} />;

  const openApplicants = (vacancyId: number) => {
    setApplicantsVacancyId(vacancyId);
    setSection("applicants");
  };

  return (
    <AppShell nav={NAV} active={section} onSelect={setSection} roleLabel="Empresa" onLogout={doLogout}>
      {error && (
        <p className="mx-4 lg:mx-8 mt-3 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}

      {section === "dashboard" && (
        <DashboardSection
          profile={profile}
          vacancies={vacancies}
          onNavigate={setSection}
          onNewVacancy={() => setCreating(true)}
        />
      )}
      {section === "vacancies" && (
        <VacanciesSection
          vacancies={vacancies}
          onRefresh={() => void reload()}
          onOpenApplicants={openApplicants}
        />
      )}
      {section === "applicants" && (
        <ApplicantsSectionKeyed vacancies={vacancies} initialVacancyId={applicantsVacancyId} />
      )}
      {section === "profile" && <ProfileSection profile={profile} onRefresh={() => void reload()} />}
      {section === "notifications" && <NotificationsSection />}

      {creating && (
        <VacancyModal
          vacancy={null}
          onClose={() => setCreating(false)}
          onSaved={() => void reload()}
        />
      )}
    </AppShell>
  );
}

/**
 * Fuerza el remontaje de la lista de postulantes cuando se entra desde una
 * vacante concreta, para que el selector arranque en esa vacante.
 */
function ApplicantsSectionKeyed({
  vacancies,
  initialVacancyId,
}: {
  vacancies: CompanyVacancy[];
  initialVacancyId: number | null;
}) {
  return <ApplicantsSection key={initialVacancyId ?? "all"} vacancies={vacancies} initialVacancyId={initialVacancyId} />;
}
