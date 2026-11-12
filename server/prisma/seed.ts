import { hashSync } from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const DEMO_PASSWORD = 'EmpleoNow123!'

// Los textos de requisitos/beneficios se guardan como líneas separadas por \n
// para que la API los devuelva como arreglo.
const empId = (name: string) => `emp:${name}`

const empresas = [
  { id: empId('TechSoluciones SAS'), nombreEmpresa: 'TechSoluciones SAS', nit: '900.123.456-7', correo: 'contacto@techsol.com', sector: 'Tecnología', estado: 'activo' },
  { id: empId('Restaurante El Buen Sabor'), nombreEmpresa: 'Restaurante El Buen Sabor', nit: '901.234.567-8', correo: 'rrhh@buensabor.com', sector: 'Alimentos', estado: 'activo' },
  { id: empId('Retail Norte'), nombreEmpresa: 'Retail Norte', nit: '902.345.678-9', correo: 'hr@retailnorte.com', sector: 'Comercio', estado: 'suspendida' },
  { id: empId('Constructora Andes'), nombreEmpresa: 'Constructora Andes', nit: '900.123.456-5', correo: 'info@andes.com', sector: 'Construcción', estado: 'pendiente' },
  { id: empId('Panadería Sol y Trigo'), nombreEmpresa: 'Panadería Sol y Trigo', nit: '901.556.223-1', correo: 'sol@trigo.com', sector: 'Alimentos', estado: 'pendiente' },
  { id: empId('Distribuidora MarSur'), nombreEmpresa: 'Distribuidora MarSur', nit: '900.887.334-9', correo: 'marsur@log.com', sector: 'Logística', estado: 'pendiente' },
  // Empresas que publican las vacantes demo (no están en la lista admin)
  { id: empId('TransBogotá SAS'), nombreEmpresa: 'TransBogotá SAS', nit: '900.000.000-7', correo: 'transbogota@ejemplo.com', sector: 'Logística', estado: 'activo' },
  { id: empId('Hotel Andino Real'), nombreEmpresa: 'Hotel Andino Real', nit: '900.000.000-8', correo: 'hotelandino@ejemplo.com', sector: 'Hotelería', estado: 'activo' },
  { id: empId('Agencia Creativa Pixel'), nombreEmpresa: 'Agencia Creativa Pixel', nit: '900.000.000-9', correo: 'pixel@ejemplo.com', sector: 'Diseño', estado: 'activo' },
  { id: empId('Clínica Norte'), nombreEmpresa: 'Clínica Norte', nit: '900.000.000-0', correo: 'clinicanorte@ejemplo.com', sector: 'Salud', estado: 'activo' },
]

const vacantes = [
  {
    id: 'vac:1', cargo: 'Mesero de Salón', area: 'Servicio al cliente', empresa: 'Restaurante El Buen Sabor',
    descripcion: 'Atención al cliente en salón, toma de pedidos y servicio de mesas en horario rotativo.',
    requisitos: ['Mayor de 18 años', 'Disponibilidad tiempo completo', 'Experiencia previa (deseable)'],
    beneficios: ['Salario + prestaciones de ley', 'Propinas y comida incluida'],
    ubicacion: 'Chapinero, Bogotá D.C.', salarioTexto: '$1.5M - $1.8M', modalidad: 'Presencial',
    tipoEmpleo: 'Tiempo completo', deadline: new Date('2026-09-30'), saved: false,
  },
  {
    id: 'vac:2', cargo: 'Chofer', area: 'Logística', empresa: 'TransBogotá SAS',
    descripcion: 'Conducción de vehículos de carga liviana para entregas en la ciudad.',
    requisitos: ['Licencia C2 vigente', 'Mínimo 2 años de experiencia', 'Conocimiento de la ciudad'],
    beneficios: ['Auxilio de rodamiento', 'Seguridad social'],
    ubicacion: 'Kennedy, Bogotá D.C.', salarioTexto: '$1.2M - $1.5M', modalidad: 'Presencial',
    tipoEmpleo: 'Medio tiempo', deadline: new Date('2026-09-25'), saved: false,
  },
  {
    id: 'vac:3', cargo: 'Cocinero', area: 'Gastronomía', empresa: 'Hotel Andino Real',
    descripcion: 'Preparación de alimentos en cocina caliente y apoyo en brigada de eventos.',
    requisitos: ['Técnico en gastronomía', '1 año de experiencia', 'Disponibilidad fines de semana'],
    beneficios: ['Alimentación incluida', 'Prima de antigüedad'],
    ubicacion: 'Usaquén, Bogotá D.C.', salarioTexto: '$1.6M - $2.0M', modalidad: 'Presencial',
    tipoEmpleo: 'Medio tiempo', deadline: new Date('2026-09-20'), saved: false,
  },
  {
    id: 'vac:4', cargo: 'Diseñador Gráfico', area: 'Diseño', empresa: 'Agencia Creativa Pixel',
    descripcion: 'Diseño de piezas digitales y material impreso para clientes de la agencia.',
    requisitos: ['Manejo de Adobe Suite', 'Portafolio requerido', '1 año de experiencia'],
    beneficios: ['Trabajo híbrido', 'Crecimiento profesional'],
    ubicacion: 'Teusaquillo, Bogotá D.C.', salarioTexto: '$2.0M - $2.8M', modalidad: 'Híbrido',
    tipoEmpleo: 'Medio tiempo', deadline: new Date('2026-10-15'), saved: true,
  },
  {
    id: 'vac:5', cargo: 'Recepcionista', area: 'Salud', empresa: 'Clínica Norte',
    descripcion: 'Atención de pacientes, manejo de agenda médica y orientación en recepción.',
    requisitos: ['Inglés B1', 'Manejo de Office', 'Presentación personal impecable'],
    beneficios: ['Seguro médico', 'Estabilidad laboral'],
    ubicacion: 'Suba, Bogotá D.C.', salarioTexto: '$1.3M - $1.5M', modalidad: 'Presencial',
    tipoEmpleo: 'Tiempo completo', deadline: new Date('2026-10-10'), saved: true,
  },
]

async function main() {
  const passwordHash = hashSync(DEMO_PASSWORD, 12)

  // ── Limpieza (solo dev; reproduce estado determinista) ──────────────
  await prisma.$transaction([
    prisma.notificacionPostulante.deleteMany(),
    prisma.notificacionEmpresa.deleteMany(),
    prisma.notificacionAdmin.deleteMany(),
    prisma.notificacion.deleteMany(),
    prisma.postVacFav.deleteMany(),
    prisma.postulacion.deleteMany(),
    prisma.categoria.deleteMany(),
    prisma.vacante.deleteMany(),
    prisma.habilidad.deleteMany(),
    prisma.formacion.deleteMany(),
    prisma.certificado.deleteMany(),
    prisma.experiencia.deleteMany(),
    prisma.postulante.deleteMany(),
    prisma.documentoVerificacion.deleteMany(),
    prisma.empresa.deleteMany(),
    prisma.cv.deleteMany(),
    prisma.admin.deleteMany(),
  ])

  // ── Admin ────────────────────────────────────────────────────────────
  const admin = await prisma.admin.create({
    data: { correo: 'admin@empleonow.com', contrasena: passwordHash, estado: 'activo' },
  })

  // ── Empresas ─────────────────────────────────────────────────────────
  const empresaIds = new Map<string, number>()
  for (const e of empresas) {
    const row = await prisma.empresa.create({
      data: {
        nombreEmpresa: e.nombreEmpresa, nit: e.nit, correo: e.correo,
        contrasena: passwordHash, sector: e.sector, estado: e.estado,
      },
    })
    empresaIds.set(e.id, row.id)
  }

  // ── Postulantes demo ─────────────────────────────────────────────────
  const sandra = await prisma.postulante.create({
    data: {
      nombres: 'Sandra', apellidos: 'Adams', correo: 'sandra.a@mail.com',
      contrasena: passwordHash, telefono: '123-456-7890', ubicacion: 'Cll 100 #51-20', estado: 'activo',
    },
  })
  const juan = await prisma.postulante.create({
    data: {
      nombres: 'Juan', apellidos: 'Pérez', correo: 'juan.perez@mail.com',
      contrasena: passwordHash, telefono: '310-555-1234', ubicacion: 'Cra 7 #45-30', estado: 'activo',
    },
  })
  const laura = await prisma.postulante.create({
    data: {
      nombres: 'Laura', apellidos: 'Gómez', correo: 'laura.gomez@mail.com',
      contrasena: passwordHash, telefono: '315-888-9900', ubicacion: 'Av. El Dorado #85-50', estado: 'activo',
    },
  })

  // ── Experiencias y habilidades de Sandra (perfil "completo") ─────────
  await prisma.experiencia.createMany({
    data: [
      { cargo: 'Coordinador de Logística Verde', empresaAnterior: 'Soluciones Energéticas S.A.S.', periodoTexto: 'Ene 2023 — actualidad', esActual: true, postulanteId: sandra.id },
      { cargo: 'Analista de Operaciones', empresaAnterior: 'LogiCargo Ltda.', periodoTexto: 'Jun 2021 — Dic 2022', esActual: false, postulanteId: sandra.id },
    ],
  })
  await prisma.habilidad.createMany({
    data: [
      { nombre: 'Excel avanzado', tipo: 'tecnica', nivel: 'Avanzado', postulanteId: sandra.id },
      { nombre: 'Power BI', tipo: 'tecnica', nivel: 'Intermedio', postulanteId: sandra.id },
      { nombre: 'Trabajo en equipo', tipo: 'blanda', nivel: 'Avanzado', postulanteId: sandra.id },
      { nombre: 'Comunicación efectiva', tipo: 'blanda', nivel: 'Avanzado', postulanteId: sandra.id },
    ],
  })

  await prisma.experiencia.createMany({
    data: [
      { cargo: 'Auxiliar de cocina', empresaAnterior: 'Restaurante La Candelaria', periodoTexto: 'Mar 2022 — Jun 2026', esActual: false, postulanteId: juan.id },
    ],
  })
  await prisma.habilidad.createMany({
    data: [
      { nombre: 'Cocina caliente', tipo: 'tecnica', nivel: 'Intermedio', postulanteId: juan.id },
      { nombre: 'Puntualidad', tipo: 'blanda', nivel: 'Avanzado', postulanteId: juan.id },
    ],
  })

  await prisma.experiencia.createMany({
    data: [
      { cargo: 'Mesera', empresaAnterior: 'Bar & Grill Zona Rosa', periodoTexto: 'Ene 2024 — actualidad', esActual: true, postulanteId: laura.id },
    ],
  })
  await prisma.habilidad.createMany({
    data: [
      { nombre: 'Servicio al cliente', tipo: 'tecnica', nivel: 'Avanzado', postulanteId: laura.id },
      { nombre: 'Trabajo bajo presión', tipo: 'blanda', nivel: 'Avanzado', postulanteId: laura.id },
    ],
  })

  // ── Vacantes ─────────────────────────────────────────────────────────
  const experienciaById: Record<string, string> = {
    'vac:1': 'Sin experiencia',
    'vac:2': 'Con experiencia',
    'vac:3': 'Con experiencia',
    'vac:4': 'Con experiencia',
    'vac:5': 'Sin experiencia',
  }
  const vacanteIds = new Map<string, number>()
  for (const v of vacantes) {
    const row = await prisma.vacante.create({
      data: {
        cargo: v.cargo,
        departamento: v.area,
        descripcion: v.descripcion,
        requisitos: v.requisitos.join('\n'),
        beneficios: v.beneficios.join('\n'),
        ubicacion: v.ubicacion,
        salarioTexto: v.salarioTexto,
        experiencia: experienciaById[v.id],
        modalidad: v.modalidad,
        tipoDeEmpleo: v.tipoEmpleo,
        fechaLimite: v.deadline,
        estado: 'activo',
        empresaId: empresaIds.get(empId(v.empresa))!,
      },
    })
    vacanteIds.set(v.id, row.id)
    await prisma.categoria.create({
      data: { nombre: v.area, vacanteId: row.id },
    })
  }

  // ── Postulaciones ────────────────────────────────────────────────────
  const app = (candidato: typeof sandra, vacanteId: string, estado: string, titulo: string) =>
    prisma.postulacion.create({
      data: {
        tituloPostulacion: titulo, cargoSolicitado: titulo, estado,
        postulanteId: candidato.id, vacanteId: vacanteIds.get(vacanteId)!,
      },
    })

  await app(sandra, 'vac:1', 'en_revision', 'Mesero')
  await app(sandra, 'vac:3', 'aceptado', 'Cocinero')
  await app(sandra, 'vac:2', 'rechazado', 'Chofer')
  await app(juan, 'vac:1', 'en_revision', 'Mesero')
  await app(laura, 'vac:1', 'aceptado', 'Mesero')

  // ── Favoritos (vacantes con saved: true) ─────────────────────────────
  await prisma.postVacFav.createMany({
    data: [
      { postulanteId: sandra.id, vacanteId: vacanteIds.get('vac:4')! },
      { postulanteId: sandra.id, vacanteId: vacanteIds.get('vac:5')! },
    ],
  })

  // ── Notificaciones de Sandra ─────────────────────────────────────────
  const notifs = [
    { tipo: 'offer', title: 'Nueva oferta disponible', subtitle: 'Mesero · Tiempo completo' },
    { tipo: 'profile', title: 'Tu perfil fue visto', subtitle: 'Una empresa revisó tu perfil' },
    { tipo: 'cv', title: 'Actualiza tu CV', subtitle: 'Completa tu experiencia laboral' },
    { tipo: 'application', title: 'Postulación enviada', subtitle: 'Cocinero · Recibido por la empresa' },
  ]
  for (const n of notifs) {
    const base = await prisma.notificacion.create({
      data: { tipo: n.tipo, tipoDestinatario: 'postulante', mensaje: n.subtitle, estado: 'no_leida' },
    })
    await prisma.notificacionPostulante.create({
      data: { notId: base.id, postulanteId: sandra.id, mensaje: n.subtitle, estado: 'no_leida' },
    })
  }

  console.log(`Seed completado.
  Admin: 1  (admin@empleonow.com)
  Empresas: ${empresas.length}
  Vacantes: ${vacantes.length}
  Postulantes: Sandra (${sandra.id}), Juan (${juan.id}), Laura (${laura.id})
  Usuario demo: sandra.a@mail.com / ${DEMO_PASSWORD}
  Admin demo:  admin@empleonow.com / ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())