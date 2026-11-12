export type UserRole = "candidate" | "company" | "admin";
export type ViewMode = "mobile" | "desktop";

export interface Vacancy {
  id: number;
  title: string;
  company: string;
  location: string;
  type: "Tiempo completo" | "Medio tiempo";
  modality: "Presencial" | "Remoto" | "Híbrido";
  experience: string;
  salary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  applicants: number;
  status: "Activa" | "Cerrada" | "Pendiente";
  area: string;
  deadline: string;
  saved: boolean;
  applied?: boolean;
}

export interface Applicant {
  id: number;
  name: string;
  appliedDate: string;
  status: "En revisión" | "Aceptado" | "Rechazado";
  phone: string;
  address: string;
  experience: { role: string; company: string; period: string }[];
  technicalSkills: { name: string; level: string }[];
  softSkills: { name: string; level: string }[];
  vacancyId: number;
}

export interface Company {
  id: number;
  name: string;
  sector: string;
  contact: string;
  vacancies: number;
  status: "Activa" | "Suspendida" | "Pendiente";
  nit: string;
  requestedDaysAgo?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "Candidato" | "Empresa";
  status: "Activo" | "Inactivo" | "Reportado";
}

export interface Notification {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  type: "offer" | "profile" | "cv" | "application";
}

export const VACANCIES: Vacancy[] = [
  {
    id: 1,
    title: "Mesero de Salón",
    company: "Restaurante El Buen Sabor",
    location: "Chapinero, Bogotá D.C.",
    type: "Tiempo completo",
    modality: "Presencial",
    experience: "Sin experiencia",
    salary: "$1.5M - $1.8M",
    description: "Atención al cliente en salón, toma de pedidos y servicio de mesas en horario rotativo.",
    requirements: ["Mayor de 18 años", "Disponibilidad tiempo completo", "Experiencia previa (deseable)"],
    benefits: ["Salario + prestaciones de ley", "Propinas y comida incluida"],
    applicants: 12,
    status: "Activa",
    area: "Servicio al cliente",
    deadline: "30 sep 2026",
    saved: false,
  },
  {
    id: 2,
    title: "Chofer",
    company: "TransBogotá SAS",
    location: "Kennedy, Bogotá D.C.",
    type: "Medio tiempo",
    modality: "Presencial",
    experience: "Con experiencia",
    salary: "$1.2M - $1.5M",
    description: "Conducción de vehículos de carga liviana para entregas en la ciudad.",
    requirements: ["Licencia C2 vigente", "Mínimo 2 años de experiencia", "Conocimiento de la ciudad"],
    benefits: ["Auxilio de rodamiento", "Seguridad social"],
    applicants: 5,
    status: "Activa",
    area: "Logística",
    deadline: "25 sep 2026",
    saved: false,
  },
  {
    id: 3,
    title: "Cocinero",
    company: "Hotel Andino Real",
    location: "Usaquén, Bogotá D.C.",
    type: "Medio tiempo",
    modality: "Presencial",
    experience: "Con experiencia",
    salary: "$1.6M - $2.0M",
    description: "Preparación de alimentos en cocina caliente y apoyo en brigada de eventos.",
    requirements: ["Técnico en gastronomía", "1 año de experiencia", "Disponibilidad fines de semana"],
    benefits: ["Alimentación incluida", "Prima de antigüedad"],
    applicants: 8,
    status: "Activa",
    area: "Gastronomía",
    deadline: "20 sep 2026",
    saved: false,
  },
  {
    id: 4,
    title: "Diseñador Gráfico",
    company: "Agencia Creativa Pixel",
    location: "Teusaquillo, Bogotá D.C.",
    type: "Medio tiempo",
    modality: "Híbrido",
    experience: "Con experiencia",
    salary: "$2.0M - $2.8M",
    description: "Diseño de piezas digitales y material impreso para clientes de la agencia.",
    requirements: ["Manejo de Adobe Suite", "Portafolio requerido", "1 año de experiencia"],
    benefits: ["Trabajo híbrido", "Crecimiento profesional"],
    applicants: 15,
    status: "Activa",
    area: "Diseño",
    deadline: "15 oct 2026",
    saved: true,
  },
  {
    id: 5,
    title: "Recepcionista",
    company: "Clínica Norte",
    location: "Suba, Bogotá D.C.",
    type: "Tiempo completo",
    modality: "Presencial",
    experience: "Sin experiencia",
    salary: "$1.3M - $1.5M",
    description: "Atención de pacientes, manejo de agenda médica y orientación en recepción.",
    requirements: ["Inglés B1", "Manejo de Office", "Presentación personal impecable"],
    benefits: ["Seguro médico", "Estabilidad laboral"],
    applicants: 20,
    status: "Activa",
    area: "Salud",
    deadline: "10 oct 2026",
    saved: true,
  },
];

export const APPLICANTS: Applicant[] = [
  {
    id: 1,
    name: "Sandra Adams",
    appliedDate: "10 ago 2026",
    status: "En revisión",
    phone: "123-456-7890",
    address: "Cll 100 #51-20",
    experience: [
      { role: "Coordinador de Logística Verde", company: "Soluciones Energéticas S.A.S.", period: "Ene 2023 — actualidad" },
      { role: "Analista de Operaciones", company: "LogiCargo Ltda.", period: "Jun 2021 — Dic 2022" },
    ],
    technicalSkills: [
      { name: "Excel avanzado", level: "Avanzado" },
      { name: "Power BI", level: "Intermedio" },
    ],
    softSkills: [
      { name: "Trabajo en equipo", level: "Avanzado" },
      { name: "Comunicación efectiva", level: "Avanzado" },
    ],
    vacancyId: 1,
  },
  {
    id: 2,
    name: "Juan Pérez",
    appliedDate: "9 ago 2026",
    status: "En revisión",
    phone: "310-555-1234",
    address: "Cra 7 #45-30",
    experience: [
      { role: "Auxiliar de cocina", company: "Restaurante La Candelaria", period: "Mar 2022 — Jun 2026" },
    ],
    technicalSkills: [
      { name: "Cocina caliente", level: "Intermedio" },
    ],
    softSkills: [
      { name: "Puntualidad", level: "Avanzado" },
    ],
    vacancyId: 1,
  },
  {
    id: 3,
    name: "Laura Gómez",
    appliedDate: "8 ago 2026",
    status: "Aceptado",
    phone: "315-888-9900",
    address: "Av. El Dorado #85-50",
    experience: [
      { role: "Mesera", company: "Bar & Grill Zona Rosa", period: "Ene 2024 — actualidad" },
    ],
    technicalSkills: [
      { name: "Servicio al cliente", level: "Avanzado" },
    ],
    softSkills: [
      { name: "Trabajo bajo presión", level: "Avanzado" },
    ],
    vacancyId: 1,
  },
];

export const COMPANIES: Company[] = [
  { id: 1, name: "TechSoluciones SAS", sector: "Tecnología", contact: "contacto@techsol.com", vacancies: 6, status: "Activa", nit: "900.123.456-7" },
  { id: 2, name: "Restaurante El Buen Sabor", sector: "Alimentos", contact: "rrhh@buensabor.com", vacancies: 3, status: "Activa", nit: "901.234.567-8" },
  { id: 3, name: "Retail Norte", sector: "Comercio", contact: "hr@retailnorte.com", vacancies: 2, status: "Suspendida", nit: "902.345.678-9" },
  { id: 4, name: "Constructora Andes", sector: "Construcción", contact: "info@andes.com", vacancies: 0, status: "Pendiente", nit: "900.123.456-7", requestedDaysAgo: 2 },
  { id: 5, name: "Panadería Sol y Trigo", sector: "Alimentos", contact: "sol@trigo.com", vacancies: 0, status: "Pendiente", nit: "901.556.223-1", requestedDaysAgo: 1 },
  { id: 6, name: "Distribuidora MarSur", sector: "Logística", contact: "marsur@log.com", vacancies: 0, status: "Pendiente", nit: "900.887.334-9", requestedDaysAgo: 0 },
];

export const USERS: User[] = [
  { id: "0001", name: "Sandra Adams", email: "sandra.a@mail.com", role: "Administrador", status: "Activo" },
  { id: "0002", name: "Carlos Pérez", email: "carlos.p@mail.com", role: "Candidato", status: "Activo" },
  { id: "0003", name: "Andrea Ríos", email: "andrea.r@mail.com", role: "Empresa", status: "Inactivo" },
  { id: "0004", name: "Julián Torres", email: "julian.t@mail.com", role: "Candidato", status: "Activo" },
  { id: "0005", name: "María González", email: "maria.g@mail.com", role: "Candidato", status: "Reportado" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: 1, icon: "💼", title: "Nueva oferta disponible", subtitle: "Mesero · Tiempo completo", time: "Hace 5 min", type: "offer" },
  { id: 2, icon: "👁", title: "Tu perfil fue visto", subtitle: "Una empresa revisó tu perfil", time: "Hace 1 hora", type: "profile" },
  { id: 3, icon: "📄", title: "Actualiza tu CV", subtitle: "Completa tu experiencia laboral", time: "Ayer", type: "cv" },
  { id: 4, icon: "✉️", title: "Postulación enviada", subtitle: "Cocinero · Recibido por la empresa", time: "Hace 2 días", type: "application" },
];

export const MY_APPLICATIONS = [
  { id: 1, title: "Mesero", appliedDate: "10 ago 2026", status: "En revisión" as const, vacancyId: 1 },
  { id: 2, title: "Cocinero", appliedDate: "8 ago 2026", status: "Aceptado" as const, vacancyId: 3 },
  { id: 3, title: "Chofer", appliedDate: "5 ago 2026", status: "Rechazado" as const, vacancyId: 2 },
];

export type Application = (typeof MY_APPLICATIONS)[number];
