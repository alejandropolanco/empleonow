import { useState } from "react";

/* ─── Shared types ─────────────────────────────────────────── */
export interface Experience {
  role: string;
  company: string;
  period: string;
}

export interface Skill {
  name: string;
  level: string;
}

const LEVELS = ["Básico", "Intermedio", "Avanzado"];

/* ─── Modal shell ──────────────────────────────────────────── */
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">✕</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

/* ─── Experience form ──────────────────────────────────────── */
export function ExperienceModal({ initial, onSave, onClose }: {
  initial?: Experience;
  onSave: (e: Experience) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState(initial?.role ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [current, setCurrent] = useState(initial?.period.includes("actualidad") ?? false);
  const [period, setPeriod] = useState(initial?.period ?? "");

  const submit = () => {
    if (!role.trim() || !company.trim()) return;
    onSave({ role: role.trim(), company: company.trim(), period: current ? "Actualidad" : period.trim() || "—" });
    onClose();
  };

  return (
    <ModalShell title={initial ? "Editar experiencia" : "Agregar experiencia"} onClose={onClose}>
      <Field label="Cargo">
        <input className={inputClass} placeholder="Ej: Coordinador de Logística" value={role} onChange={(e) => setRole(e.target.value)} />
      </Field>
      <Field label="Empresa">
        <input className={inputClass} placeholder="Ej: Soluciones Energéticas S.A.S." value={company} onChange={(e) => setCompany(e.target.value)} />
      </Field>
      <Field label="Período">
        <input className={inputClass} placeholder="Ej: Ene 2023 — Dic 2024" value={period} onChange={(e) => setPeriod(e.target.value)} disabled={current} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600 mb-5">
        <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} className="accent-blue-600" />
        Trabajo aquí actualmente
      </label>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button onClick={submit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Guardar</button>
      </div>
    </ModalShell>
  );
}

/* ─── Skill form ───────────────────────────────────────────── */
export function SkillModal({ kind, initial, onSave, onClose }: {
  kind: "technical" | "soft";
  initial?: Skill;
  onSave: (s: Skill) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState(initial?.level ?? "Intermedio");

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), level });
    onClose();
  };

  const title = initial
    ? "Editar habilidad"
    : kind === "technical" ? "Agregar habilidad técnica" : "Agregar habilidad blanda";
  const placeholder = kind === "technical" ? "Ej: Excel, Python, Figma" : "Ej: Liderazgo, Comunicación";

  return (
    <ModalShell title={title} onClose={onClose}>
      <Field label="Habilidad">
        <input className={inputClass} placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Nivel">
        <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </Field>
      {kind === "technical" && (
        <Field label="Certificado (opcional)">
          <label className="w-full flex items-center justify-center py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-all">
            + Adjuntar certificado
            <input type="file" className="hidden" />
          </label>
        </Field>
      )}
      <div className="flex gap-2 mt-1">
        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button onClick={submit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Guardar</button>
      </div>
    </ModalShell>
  );
}
