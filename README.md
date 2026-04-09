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
| Servidor | Nginx (proxy + SPA routing) |
| Contenedores | Docker + Docker Compose |

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/) instalados.
- No se necesita Node.js en el host para ejecutar la app en producción.

---

## Inicio rápido

```bash
# 1. Clona el repositorio
git clone <repo-url>
cd pethealth

# 2. Levanta los contenedores
docker compose up --build -d

# 3. Abre el navegador
open http://localhost:3000
```

Credenciales por defecto: **admin / admin123**
> Cámbialas inmediatamente desde la interfaz o vía la API.

---

## Estructura del proyecto

```
pethealth/
├── docker-compose.yml
├── data/                      # Volumen persistente (DB + uploads)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js           # Servidor Express
│       ├── db.js              # SQLite + seed inicial
│       ├── middleware/
│       │   └── auth.js        # Verificación JWT
│       └── routes/
│           ├── auth.js        # Login / registro
│           ├── pets.js        # CRUD mascotas + foto
│           ├── checkups.js    # Checkups y medicamentos
│           ├── exams.js       # Exámenes y valores
│           └── users.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
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

El servicio `backend` en `docker-compose.yml` expone estas variables. Edítalas antes de desplegar en producción:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | `cambiar_esto_en_produccion_...` |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto interno del backend | `3001` |

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

# Detener los contenedores
docker compose down

# Detener y eliminar el volumen de datos (¡borra todo!)
docker compose down -v

# Reconstruir después de cambios en el código
docker compose up --build -d

# Acceder al shell del backend
docker exec -it pethealth-backend sh
```

---

## Persistencia de datos

El directorio `./data/` se monta como volumen en el backend:

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

- Cambia `JWT_SECRET` por una cadena aleatoria larga antes de exponer la app a Internet.
- El backend **no** es accesible directamente desde el host — solo el frontend en el puerto 3000.
- Las contraseñas se almacenan hasheadas con bcrypt (saltRounds: 10).
