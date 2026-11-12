# EmpleoNow

Plataforma de empleo con dos experiencias en un **único layout responsive**:
candidatos que buscan y se postulan, y empresas que publican vacantes y
gestionan postulantes. Portada de Figma Make a **Vite + React + TypeScript +
Tailwind v4**, con API **Express 5 + Prisma + MySQL**.

El panel de administración existe como ruta protegida (`/admin`) y placeholder
"en construcción": la moderación/aprobación de empresas se implementará después.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind v4, React Router 7 |
| Backend | Node 20 LTS, Express 5, TypeScript, Zod |
| Datos | MySQL 8 + Prisma 7 (driver adapter MariaDB) |
| Cache/rate limit | Redis 7 (opcional, fallback en memoria) |
| Archivos | S3 (opcional, fallback local en `server/uploads`) |
| Correo | Nodemailer + SendGrid/SMTP (opcional, fallback en logs) |
| Anti-bots | Cloudflare Turnstile (opcional en desarrollo) |
| Docs API | OpenAPI 3.0 + Swagger UI en `/api/docs` |
| PWA/Nativo | vite-plugin-pwa + Capacitor (Android/iOS) |
| CI | GitHub Actions (tests, builds, gitleaks, Trivy) |

## Requisitos

- Node 20+
- MySQL local (XAMPP: `C:\xampp\mysql_start.bat`)

## Levantar en local

1. **MySQL**:
   ```powershell
   C:\xampp\mysql_start.bat
   ```
   Si MySQL está apagado el frontend muestra `AggregateError [ECONNREFUSED]`.

2. **Backend** (puerto 3000):
   ```powershell
   cd server
   npm install
   npx prisma migrate deploy
   npx prisma generate
   npm run seed        # datos demo
   npm run dev
   ```

3. **Frontend** (puerto 5173, proxy `/api` y `/uploads` a :3000):
   ```powershell
   npm install
   npm run dev
   ```

Abre http://localhost:5173 y la documentación en http://localhost:3000/api/docs.

### Variables de entorno

- `server/.env` se crea desde `server/.env.example` (JWT, `DATA_ENCRYPTION_KEY`,
  DB, Redis/S3/SendGrid/Turnstile opcionales).
- `VITE_TURNSTILE_SITE_KEY` en el frontend activa el widget; sin site key no se
  renderiza y el backend opera en bypass si tampoco hay secret key.
- `DATA_ENCRYPTION_KEY` (mínimo 32 caracteres) cifra la ubicación del postulante
  con AES-256-GCM.

## Credenciales demo

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Candidata | `sandra.a@mail.com` | `EmpleoNow123!` |
| Empresa | `transbogota@ejemplo.com` | `EmpleoNow123!` |
| Admin (placeholder) | `admin@empleonow.com` | `EmpleoNow123!` |

## Rutas principales

| Ruta | Rol | Descripción |
| --- | --- | --- |
| `/` | público | Splash con acceso a login/registro |
| `/login`, `/register` | público | Autenticación de candidatos |
| `/register/company` | público | Registro de empresa (queda `activo`) |
| `/candidate/complete-profile` | postulante | Onboarding tras registro |
| `/candidate/desktop` | postulante | Panel responsive de candidato |
| `/company/desktop` | empresa | Panel de empresa: vacantes, postulantes, perfil |
| `/admin` | admin | Placeholder de administración |

Rutas antiguas (`/candidate/mobile`, `/company/mobile`, `/company/register`) se
redirigen a las nuevas para no romper enlaces.

## Panel de empresa

- **Dashboard** con métricas (vacantes, activas, postulaciones, por revisar).
- **Vacantes**: crear, editar, pausar, cerrar, eliminar y contar postulantes.
- **Postulantes**: filtrar por vacante, ver CV, experiencia y habilidades, y
  cambiar estado (`en_revision`, `aceptado`, `rechazado`).
- **Perfil** de empresa y **notificaciones**.
- Vista de **cuenta pendiente** preparada para la futura aprobación del admin.

## Seguridad

- Access token **solo en memoria**; refresh token en cookie `httpOnly`,
  `SameSite=Strict`, `Secure` en producción y `Path=/`.
- **Row scoping** por `empresaId`/`postulanteId` firmado en el JWT en todos los
  endpoints de empresa y candidato (MySQL no tiene RLS nativo).
- Cifrado **AES-256-GCM** de `Postulante.ubicacion` en reposo, con
  compatibilidad para valores antiguos en texto plano.
- Turnstile en login/registro (backend con `siteverify`), rate limit en
  `/api/auth` (Redis o memoria), Helmet con CSP/HSTS, verificación de `Origin`
  en métodos mutables, validación Zod estricta y CORS con credenciales.
- Subida de CV: límite 5 MB, validación de **magic bytes** (PDF/DOC/DOCX),
  nombre UUID, almacenamiento en memoria antes de escribir y S3 con SSE AES256.

## Tests

### API (Vitest + Supertest)

```powershell
cd server
npm test
```

- `src/app.test.ts` — smoke de auth, vacantes, favoritos, postulaciones, perfil.
- `src/auth.flow.test.ts` — registro, duplicados, login, rotación/reuso de
  refresh, logout y guards por rol.
- `src/candidate.flow.test.ts` — perfil, CRUD, CV, postulaciones, cifrado en
  reposo y notificaciones.
- `src/company.flow.test.ts` — registro de empresa, CRUD de vacantes,
  postulantes, estados y **aislamiento entre empresas**.

La suite re-siembra la base antes de correr (`src/test/global-setup.ts`).

### E2E (Playwright)

```powershell
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

Corre en proyectos `mobile` y `desktop`; Playwright levanta backend y frontend
(`webServer`) y re-siembra la BD. Cubre login, errores, guards y onboarding.

## Producción

Guía completa: [`docs/DEPLOY.md`](docs/DEPLOY.md) (Ubuntu 22.04 / EC2, MySQL 8,
Redis 7, Nginx + Let's Encrypt, S3, SendGrid, systemd, backups).

Inicio rápido con Docker:

```bash
cp docker.env.example .env     # completa secretos
docker compose up -d --build
curl http://localhost:8080/api/health
```

El `Dockerfile` tiene dos targets: `web` (Nginx + dist de Vite) y `api`
(Node 20 + Prisma, ejecuta `prisma migrate deploy` al arrancar). En el VPS se
recomienda Nginx del host con TLS y `nginx/empleonow.conf`.

## PWA y apps nativas

- PWA: `npm run build` genera manifest y service worker; el shell se cachea y
  `/api` y `/uploads` quedan fuera del cache.
- Iconos: `npm run icons`.
- Capacitor: `npx cap add android` (o `ios`) una vez, luego
  `npm run cap:android` / `npm run cap:ios`.

## Licencia

Código bajo **MIT** (ver [`LICENSE`](LICENSE)). La marca, los datos reales y la
lógica de negocio propietaria se reservan (ver [`NOTICE`](NOTICE)).
