# Despliegue en producción — EmpleoNow

Arquitectura objetivo de la ficha: **VPS Ubuntu 22.04 (EC2)** con Node 20 LTS,
MySQL 8, Redis 7, Nginx + Let's Encrypt, S3 para CVs, SendGrid/Nodemailer para
correo y GitHub Actions como CI. El frontend es una SPA React (PWA) y el
backend una API Express 5 + Prisma.

```
Internet
   │ 443/80
   ▼
 Nginx (TLS, gzip, rate limit /api/auth, SPA)
   ├── /            → /var/www/empleonow/current  (dist de Vite)
   ├── /api/*       → 127.0.0.1:3000 (Node/Express)
   └── /uploads/*   → 127.0.0.1:3000 (fallback local; en prod usar S3)
                         │
                         ├── MySQL 8 (3306, solo localhost)
                         └── Redis 7 (6379, solo localhost)
```

## 1. Requisitos del servidor

- Ubuntu 22.04 LTS, 2 vCPU / 4 GB RAM recomendado.
- Dominio apuntando al Elastic IP (`A` para `empleonow.com` y `www`).
- Puertos 22, 80 y 443 abiertos en el Security Group (3306/6379 **no**).
- Node 20 LTS, MySQL 8, Redis 7, Nginx, Certbot.

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server redis-server certbot python3-certbot-nginx git
node -v    # v20.x
```

## 2. Base de datos y Redis

```bash
sudo mysql_secure_installation

sudo mysql <<'SQL'
CREATE DATABASE empleonow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'empleonow'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';
GRANT ALL PRIVILEGES ON empleonow.* TO 'empleonow'@'localhost';
FLUSH PRIVILEGES;
SQL

sudo systemctl enable --now mysql redis-server
redis-cli ping   # PONG
```

MySQL solo debe escuchar en `127.0.0.1`. Verifica `bind-address = 127.0.0.1`
en `/etc/mysql/mysql.conf.d/mysqld.cnf`.

## 3. Variables de entorno

```bash
sudo mkdir -p /var/www/empleonow
sudo chown -R $USER:$USER /var/www/empleonow
git clone https://github.com/TU_USUARIO/empleonow.git /var/www/empleonow/repo
cd /var/www/empleonow/repo
cp server/.env.example server/.env
nano server/.env
```

Genera secretos fuertes:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # x3
```

`server/.env` mínimo en producción:

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://empleonow:CAMBIA_ESTA_CLAVE@127.0.0.1:3306/empleonow"
CLIENT_ORIGIN="https://empleonow.com"
JWT_ACCESS_SECRET="<64 hex>"
JWT_REFRESH_SECRET="<64 hex>"
DATA_ENCRYPTION_KEY="<64 hex>"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS="7"
UPLOAD_DIR="./uploads"
REDIS_URL="redis://127.0.0.1:6379"

# Anti-bots (obligatorio en producción)
TURNSTILE_SECRET_KEY="..."

# Correo (elige uno)
SENDGRID_API_KEY="SG...."
# o SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
MAIL_FROM="EmpleoNow <no-reply@empleonow.com>"

# S3 (recomendado para CVs)
S3_BUCKET="empleonow-cvs"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
# S3_PUBLIC_URL="https://cdn.empleonow.com"
```

> `DATA_ENCRYPTION_KEY` cifra la ubicación de los postulantes con AES-256-GCM.
> No la cambies sin un plan de re-cifrado: los valores antiguos no se podrán
> descifrar y el campo se devolverá vacío.

En el frontend, el build usa `VITE_TURNSTILE_SITE_KEY`:

```bash
echo "VITE_TURNSTILE_SITE_KEY=tu-site-key" >> .env.production.local
```

## 4. Build y migraciones

```bash
cd /var/www/empleonow/repo
npm ci
npm run typecheck && npm run build          # genera dist/ + service worker

cd server
npm ci
npx prisma generate
npx prisma migrate deploy                   # nunca `migrate dev` en prod
npm run build
```

## 5. Servicio systemd (API)

`/etc/systemd/system/empleonow-api.service`:

```ini
[Unit]
Description=EmpleoNow API
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/empleonow/repo/server
EnvironmentFile=/var/www/empleonow/repo/server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/empleonow/repo/server/uploads
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /var/www/empleonow/repo/server/uploads
sudo systemctl daemon-reload
sudo systemctl enable --now empleonow-api
sudo systemctl status empleonow-api
curl -s http://127.0.0.1:3000/api/health   # {"status":"ok"}
```

## 6. Nginx + Let's Encrypt

Publica el build en la ruta que usa Nginx:

```bash
sudo mkdir -p /var/www/empleonow/current
sudo rsync -a --delete /var/www/empleonow/repo/dist/ /var/www/empleonow/current/
sudo cp /var/www/empleonow/repo/nginx/empleonow.conf /etc/nginx/sites-available/empleonow.conf
sudo ln -sf /etc/nginx/sites-available/empleonow.conf /etc/nginx/sites-enabled/empleonow.conf
sudo rm -f /etc/nginx/sites-enabled/default
```

Antes del primer certificado, comenta las líneas `listen 443 ssl` o usa el
bloque HTTP únicamente; luego:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d empleonow.com -d www.empleonow.com --redirect
sudo certbot renew --dry-run
```

Renovación automática vía `systemd timers` de Certbot (viene habilitada).

Si usas S3, el bucket debe permitir lectura pública **solo** de `cvs/*` (o
servir por CloudFront). El backend sube con `ServerSideEncryption: AES256`.

## 7. Despliegues y ramas

- `main`: producción. Cada push dispara CI y, si pasa, despliega.
- `develop`: integración.
- `feature/*`: ramas cortas que se mergean a `develop`.

Flujo recomendado:

```bash
git checkout develop
git pull
git checkout -b feature/mi-cambio
# ... commits ...
git push -u origin feature/mi-cambio
# Pull Request a develop; luego develop → main para release
```

Script de actualización en el VPS (`/var/www/empleonow/deploy.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/empleonow/repo
git fetch origin main && git checkout main && git pull --ff-only
npm ci && npm run build
(cd server && npm ci && npx prisma migrate deploy && npm run build)
sudo rsync -a --delete dist/ /var/www/empleonow/current/
sudo systemctl restart empleonow-api
```

Endurece permisos: `chmod 750 deploy.sh` y ejecútalo con un usuario con sudo
restringido a `systemctl restart empleonow-api` y `rsync`.

## 8. Alternativa con Docker Compose

El repo incluye `Dockerfile` multi-stage, `docker-compose.yml` (MySQL 8,
Redis 7, API y Nginx) y `nginx/default.conf`.

```bash
cp docker.env.example .env      # completa secretos
docker compose up -d --build
docker compose ps
curl http://localhost:8080/api/health
```

El contenedor `api` ejecuta `prisma migrate deploy` al arrancar. Para TLS en
producción usa Nginx del host (sección 6) apuntando a `127.0.0.1:8080`, o
añade un proxy TLS delante.

## 9. Backups y operación

```bash
# Backup diario de MySQL (cron 03:00)
mysqldump -u empleonow -p --single-transaction empleonow | gzip > /backups/empleonow-$(date +%F).sql.gz
```

- Retención sugerida: 14 días locales + copia semanal en S3 con cifrado.
- Monitorea `/api/health`, logs de `journalctl -u empleonow-api -f` y alertas de
  CPU/disco.
- Rota `JWT_*` y `DATA_ENCRYPTION_KEY` con procedimiento planificado.

## 10. PWA y apps nativas

- PWA: `npm run build` genera `manifest.webmanifest` y `sw.js`; Nginx sirve
  `sw.js` y el manifest con `Cache-Control: no-cache`.
- Capacitor: `npm run cap:android` (o `cap:ios`) construye, sincroniza y abre
  el proyecto nativo. La primera vez ejecuta `npx cap add android`/`ios`.
- `capacitor.config.ts` usa `webDir: dist` y esquema HTTPS.

## 11. Checklist de seguridad

- [ ] HTTPS forzado y HSTS activo.
- [ ] `server/.env` con permisos `600` y fuera de git.
- [ ] `TURNSTILE_SECRET_KEY` configurada (sin ella el anti-bot está en bypass).
- [ ] Cookies de refresh `httpOnly`, `Secure`, `SameSite=Strict`.
- [ ] Row scoping por `empresaId`/`postulanteId` del JWT verificado con tests.
- [ ] `DATA_ENCRYPTION_KEY` respaldada en un gestor de secretos.
- [ ] MySQL/Redis escuchando solo en localhost.
- [ ] S3 con bloqueo de acceso público salvo `cvs/*` (o CloudFront firmado).
- [ ] `npm audit` y Trivy sin vulnerabilidades críticas.
- [ ] Backups probados con restauración.
- [ ] Rotar la API key de Figma si estuvo expuesta durante el desarrollo.
