# PetHealth Tracker 🐾

Aplicación web para llevar el historial médico de tus mascotas. Registra checkups veterinarios, medicamentos, exámenes de laboratorio (con PDF) y fotos de tus perros y gatos — todo en un solo lugar, con soporte para modo oscuro.

---

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Lucide |
| Backend | Node.js, Express, better-sqlite3 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Archivos | Multer (fotos y PDFs) |
| Contenedores | Docker (imagen única, frontend + backend) |

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/) instalados.
- No se necesita Node.js en el host para ejecutar la app en producción.

---

## Inicio rápido

### Con Docker Compose (recomendado)

**1. Crea el archivo `.env`** en la raíz del proyecto:

```env
JWT_SECRET=cambia_esto_por_una_clave_larga_y_segura
NODE_ENV=production
PORT=3001
```

**2. Levanta la app:**

```bash
docker compose up --build -d
```

**3. Abre el navegador:**

```
http://localhost:3000
```

Credenciales por defecto: **admin / admin123**
> Cámbialas inmediatamente desde la interfaz o vía la API.

---

### Con Docker directamente

```bash
# Construir la imagen
docker build -t pethealth:latest .

# Ejecutar
docker run -d \
  -p 3000:3001 \
  -e JWT_SECRET=cambia_esto_por_una_clave_larga_y_segura \
  -e NODE_ENV=production \
  -v "$(pwd)/data:/app/data" \
  --name pethealth \
  pethealth:latest
```

---

## docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pethealth
    restart: unless-stopped
    ports:
      - "3000:3001"
    volumes:
      - ./data:/app/data
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-3001}
```

> Las variables se leen del archivo `.env` en la misma carpeta que el `docker-compose.yml`.

---

## Estructura del proyecto

```
pethealth/
├── Dockerfile                 # Imagen única (build frontend + backend)
├── docker-compose.yml
├── .env                       # Variables de entorno (no subir a git)
├── data/                      # Volumen persistente (DB + uploads)
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js           # Servidor Express (sirve también el frontend)
│       ├── db.js              # SQLite + seed inicial
│       ├── middleware/
│       │   └── auth.js        # Verificación JWT
│       └── routes/
│           ├── auth.js        # Login / registro
│           ├── pets.js        # CRUD mascotas + foto
│           ├── checkups.js    # Checkups y medicamentos
│           └── exams.js       # Exámenes y valores
└── frontend/
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── context/           # AuthContext, ThemeContext
        ├── pages/             # Login, Dashboard, PetProfile, etc.
        └── components/        # Navbar, PetCard, CheckupCard, etc.
```

---

## Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | **Sí** |
| `NODE_ENV` | Entorno de ejecución | No (default: `production`) |
| `PORT` | Puerto interno del contenedor | No (default: `3001`) |

> ⚠️ Sin `JWT_SECRET` el login falla con `secretOrPrivateKey must have a value`.

---

## API — Endpoints principales

Todos los endpoints (excepto auth) requieren el header:
```
Authorization: Bearer <token>
```

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login → devuelve JWT |
| POST | `/api/auth/register` | Registrar usuario |

### Mascotas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pets` | Listar mascotas |
| POST | `/api/pets` | Crear mascota |
| GET | `/api/pets/:id` | Detalle de mascota |
| PUT | `/api/pets/:id` | Actualizar mascota |
| DELETE | `/api/pets/:id` | Eliminar mascota |
| POST | `/api/pets/:id/photo` | Subir foto (multipart) |

### Checkups
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pets/:id/checkups` | Checkups de una mascota |
| POST | `/api/pets/:id/checkups` | Crear checkup + medicamentos |
| GET | `/api/checkups/:id` | Detalle de checkup |
| PUT | `/api/checkups/:id` | Actualizar checkup |
| DELETE | `/api/checkups/:id` | Eliminar checkup |

### Medicamentos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/checkups/:id/medications` | Medicamentos de un checkup |
| POST | `/api/checkups/:id/medications` | Agregar medicamento |
| PUT | `/api/medications/:id` | Actualizar medicamento |
| DELETE | `/api/medications/:id` | Eliminar medicamento |

### Exámenes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pets/:id/exams` | Exámenes de una mascota |
| POST | `/api/pets/:id/exams` | Subir examen (multipart + PDF) |
| GET | `/api/exams/:id` | Detalle de examen |
| PUT | `/api/exams/:id` | Actualizar examen |
| DELETE | `/api/exams/:id` | Eliminar examen + PDF |
| POST | `/api/exams/:id/values` | Agregar valores de laboratorio |
| PUT | `/api/exam-values/:id` | Actualizar valor |
| DELETE | `/api/exam-values/:id` | Eliminar valor |

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Detener el contenedor
docker compose down

# Detener y eliminar el volumen de datos (¡borra todo!)
docker compose down -v

# Reconstruir después de cambios en el código
docker compose up --build -d

# Acceder al shell del contenedor
docker exec -it pethealth sh

# Publicar en Docker Hub
docker build -t usuario/pethealth:latest .
docker push usuario/pethealth:latest
```

---

## Persistencia de datos

El directorio `./data/` se monta como volumen en el contenedor:

```
data/
├── pethealth.db          # Base de datos SQLite
└── uploads/
    ├── photos/           # Fotos de mascotas
    └── pdfs/             # PDFs de exámenes
```

Para hacer un backup, basta con copiar esta carpeta.

---

## Notas de seguridad

- **Agrega `.env` a tu `.gitignore`** para no exponer el `JWT_SECRET`.
- Usa una clave larga y aleatoria: `openssl rand -hex 32`
- Las contraseñas se almacenan hasheadas con bcrypt (saltRounds: 10).
