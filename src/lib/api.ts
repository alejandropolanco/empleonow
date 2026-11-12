import type { Vacancy, Application, Notification } from "./data";

// El access token vive solo en memoria: si hay XSS no puede leerse desde
// localStorage. Al recargar, se recupera con la cookie httpOnly de refresh.
let accessToken: string | null = null;

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = (): Promise<Response> => {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    if (!(init.body instanceof FormData) && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    return fetch(`/api${path}`, { ...init, headers, credentials: "include" });
  };

  let res = await doFetch();

  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    let code = "ERROR";
    let message = "Ocurrió un error inesperado";
    try {
      const body = await res.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? message;
    } catch {
      /* respuesta no JSON */
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const body = await res.json();
    setAccessToken(body.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const s = search.toString();
  return s ? `?${s}` : "";
}

export type UserRole = "postulante" | "empresa" | "admin";

export interface AuthUser {
  id: number;
  role: UserRole;
  correo: string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  telefono?: string | null;
  ubicacion?: string | null;
}

export interface Profile {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  ubicacion: string;
  cvFileName: string | null;
  experiences: { id: number; role: string; company: string; period: string }[];
  technicalSkills: { id: number; name: string; level: string }[];
  softSkills: { id: number; name: string; level: string }[];
  stats: { applications: number; favorites: number; experiences: number; skills: number };
}

export interface CompanyProfile {
  id: number;
  nombreEmpresa: string;
  nit: string;
  correo: string;
  telefono: string | null;
  sector: string | null;
  descripcion: string | null;
  direccion: string | null;
  logo: string | null;
  estado: string;
  stats: {
    vacancies: number;
    activeVacancies: number;
    applications: number;
    pendingApplications: number;
    acceptedApplications: number;
  };
}

export interface CompanyVacancy {
  id: number;
  title: string;
  area: string;
  location: string;
  type: string;
  modality: string;
  experience: string;
  salary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  applicants: number;
  status: "Activa" | "Pausada" | "Cerrada" | "Pendiente";
  estadoRaw: string;
  deadline: string;
  deadlineIso: string;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  type: string;
}

export interface CompanyApplicant {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  appliedDate: string;
  status: "En revisión" | "Aceptado" | "Rechazado";
  estadoRaw: string;
  vacancyId: number;
  vacancyTitle: string;
  cvFileName: string | null;
  cvUrl: string | null;
  experience: { id: number; role: string; company: string; period: string }[];
  technicalSkills: { id: number; name: string; level: string }[];
  softSkills: { id: number; name: string; level: string }[];
}

export type CompanyVacancyInput = {
  title: string;
  area?: string;
  location?: string;
  type?: string;
  modality?: string;
  experience?: string;
  salary?: string;
  description?: string;
  requirements?: string[];
  benefits?: string[];
  deadline?: string;
};

export const api = {
  // Auth
  async login(correo: string, contrasena: string, turnstileToken?: string): Promise<{ user: AuthUser; accessToken: string }> {
    const data = await request<{ user: AuthUser; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, contrasena, ...(turnstileToken ? { turnstileToken } : {}) }),
    });
    setAccessToken(data.accessToken);
    return data;
  },
  async register(nombres: string, apellidos: string, correo: string, contrasena: string, turnstileToken?: string): Promise<{ user: AuthUser; accessToken: string }> {
    const data = await request<{ user: AuthUser; accessToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ nombres, apellidos, correo, contrasena, ...(turnstileToken ? { turnstileToken } : {}) }),
    });
    setAccessToken(data.accessToken);
    return data;
  },
  async registerCompany(data: {
    nombreEmpresa: string;
    nit: string;
    correo: string;
    contrasena: string;
    telefono?: string;
    sector?: string;
    turnstileToken?: string;
  }): Promise<{ user: AuthUser; accessToken: string }> {
    const res = await request<{ user: AuthUser; accessToken: string }>("/auth/register-company", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setAccessToken(res.accessToken);
    return res;
  },
  logout(): Promise<void> {
    return request<void>("/auth/logout", { method: "POST" });
  },
  me(): Promise<{ user: AuthUser }> {
    return request("/auth/me");
  },

  // Vacantes
  vacancies(params: { search?: string; area?: string; type?: string; modality?: string } = {}): Promise<{ vacancies: Vacancy[] }> {
    return request(`/vacancies${qs(params)}`);
  },
  vacancy(id: number): Promise<{ vacancy: Vacancy }> {
    return request(`/vacancies/${id}`);
  },
  areas(): Promise<{ areas: string[] }> {
    return request("/vacancies/areas");
  },
  toggleFavorite(id: number): Promise<{ saved: boolean }> {
    return request(`/vacancies/${id}/favorite`, { method: "POST" });
  },
  favorites(): Promise<{ favorites: Vacancy[] }> {
    return request("/favorites");
  },

  // Postulaciones
  apply(vacancyId: number): Promise<{ application: Application }> {
    return request("/applications", { method: "POST", body: JSON.stringify({ vacancyId }) });
  },
  applications(): Promise<{ applications: Application[] }> {
    return request("/applications/mine");
  },
  withdraw(id: number): Promise<void> {
    return request(`/applications/${id}/withdraw`, { method: "POST" });
  },

  // Perfil
  profile(): Promise<{ profile: Profile }> {
    return request("/profile");
  },
  patchProfile(data: { telefono?: string; ubicacion?: string; nombres?: string; apellidos?: string }): Promise<{ profile: Profile }> {
    return request("/profile", { method: "PATCH", body: JSON.stringify(data) });
  },
  uploadCv(file: File): Promise<{ cvFileName: string }> {
    const form = new FormData();
    form.append("cv", file);
    return request("/profile/cv", { method: "POST", body: form });
  },
  completeProfile(data: {
    telefono?: string;
    ubicacion?: string;
    experiences: { role: string; company: string; period: string }[];
    technicalSkills: { name: string; level: string }[];
    softSkills: { name: string; level: string }[];
  }): Promise<{ profile: Profile }> {
    return request("/profile/complete", { method: "POST", body: JSON.stringify(data) });
  },
  createExperience(e: { role: string; company: string; period: string }): Promise<{ experience: { id: number; role: string; company: string; period: string } }> {
    return request("/profile/experiences", { method: "POST", body: JSON.stringify(e) });
  },
  updateExperience(id: number, e: { role: string; company: string; period: string }): Promise<{ experience: { id: number; role: string; company: string; period: string } }> {
    return request(`/profile/experiences/${id}`, { method: "PATCH", body: JSON.stringify(e) });
  },
  deleteExperience(id: number): Promise<void> {
    return request(`/profile/experiences/${id}`, { method: "DELETE" });
  },
  createSkill(kind: "technical" | "soft", s: { name: string; level: string }): Promise<{ skill: { id: number; name: string; level: string } }> {
    return request("/profile/skills", { method: "POST", body: JSON.stringify({ kind, ...s }) });
  },
  updateSkill(id: number, s: { name: string; level: string }): Promise<{ skill: { id: number; name: string; level: string } }> {
    return request(`/profile/skills/${id}`, { method: "PATCH", body: JSON.stringify(s) });
  },
  deleteSkill(id: number): Promise<void> {
    return request(`/profile/skills/${id}`, { method: "DELETE" });
  },

  // Empresa
  companyProfile(): Promise<{ company: CompanyProfile }> {
    return request("/company/profile");
  },
  patchCompanyProfile(data: Partial<Pick<CompanyProfile, "nombreEmpresa" | "telefono" | "sector" | "descripcion" | "direccion" | "logo">>): Promise<{ company: CompanyProfile }> {
    return request("/company/profile", { method: "PATCH", body: JSON.stringify(data) });
  },
  companyVacancies(): Promise<{ vacancies: CompanyVacancy[] }> {
    return request("/company/vacancies");
  },
  createCompanyVacancy(data: CompanyVacancyInput): Promise<{ vacancy: CompanyVacancy }> {
    return request("/company/vacancies", { method: "POST", body: JSON.stringify(data) });
  },
  updateCompanyVacancy(id: number, data: Partial<CompanyVacancyInput>): Promise<{ vacancy: CompanyVacancy }> {
    return request(`/company/vacancies/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  setCompanyVacancyStatus(id: number, estado: "activo" | "pausada" | "cerrada"): Promise<{ vacancy: CompanyVacancy }> {
    return request(`/company/vacancies/${id}/status`, { method: "PATCH", body: JSON.stringify({ estado }) });
  },
  deleteCompanyVacancy(id: number): Promise<void> {
    return request(`/company/vacancies/${id}`, { method: "DELETE" });
  },
  companyApplicants(vacancyId: number): Promise<{ applicants: CompanyApplicant[] }> {
    return request(`/company/vacancies/${vacancyId}/applicants`);
  },
  updateCompanyApplication(id: number, estado: "en_revision" | "aceptado" | "rechazado"): Promise<{ application: CompanyApplicant }> {
    return request(`/company/applications/${id}`, { method: "PATCH", body: JSON.stringify({ estado }) });
  },
  companyNotifications(): Promise<{ notifications: AppNotification[] }> {
    return request("/company/notifications");
  },

  // Notificaciones
  notifications(): Promise<{ notifications: Notification[] }> {
    return request("/notifications");
  },
};

export function clearAccessToken() {
  setAccessToken(null);
}