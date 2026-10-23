# PetHealth Tracker 🐾

Web application for tracking your pets' medical history. Record vet visits, medications, lab exams (with PDF support), and photos of your dogs and cats — all in one place, with dark mode and English/Spanish interface support.

---

## Features

- **Dashboard** — pet grid with search and species filters, animated cards with last-visit status
- **Pet profiles** — two-column layout with vitals, photos, and a full health timeline
- **Vet checkups** — log visits with diagnosis, observations, medications, and file attachments
- **Lab exams** — store results and upload PDFs/images per exam
- **Dark mode** — full light/dark theme with smooth transitions
- **Private per user** — each account only sees its own pets, records and files
- **Shareable summary** — send a pet's health summary (meds, next visit, abnormal values) to your vet
- **Bilingual** — Spanish and English UI, switchable at any time
- **Responsive** — works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Lucide |
| Backend | Node.js, Express, better-sqlite3 |
| Auth | JWT (jsonwebtoken) + bcryptjs; httpOnly cookie for file access |
| File uploads | Multer (photos, PDFs, attachments) |
| Containers | Docker (single image — frontend built in and served by Express) |

---

## Requirements

- [Docker](https://docs.docker.com/get-docker/) installed.
- No Node.js needed on the host to run in production.

---

## Quick start

### Option A — Docker Hub image (fastest)

```bash
docker run -d \
  -p 3000:3001 \
  -e JWT_SECRET=change_this_to_a_long_random_secret \
  -e NODE_ENV=production \
  -v "$(pwd)/data:/app/data" \
  --name pethealth \
  martitoci/pethealth:latest
```

Open `http://localhost:3000` — default credentials: **admin / admin123**

---

### Option B — Docker Compose (recommended for self-hosting)

**1. Create a `.env` file** in the project root (see `.env.example`):

```bash
cp .env.example .env
# then set JWT_SECRET, e.g.:
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

**2. Start:**

```bash
docker compose up -d
```

**3. Open:** `http://localhost:3000`

> Change the default credentials immediately after first login.

---

### Option C — Build from source

```bash
git clone https://github.com/martitoci/pethealth.git
cd pethealth
docker compose up --build -d
```

---

## docker-compose.yml

```yaml
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
      - JWT_SECRET=${JWT_SECRET:?Define JWT_SECRET en .env (openssl rand -hex 32)}
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-3001}
      - ALLOW_REGISTRATION=${ALLOW_REGISTRATION:-false}
      - TRUST_PROXY=${TRUST_PROXY:-false}
```

> Variables are read from the `.env` file in the same folder. Compose refuses to start if `JWT_SECRET` is missing.

---

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `JWT_SECRET` | Secret key for signing JWT tokens | **Yes** (the server exits without it) |
| `NODE_ENV` | Runtime environment | No (default: `production`) |
| `PORT` | Internal container port | No (default: `3001`) |
| `ALLOW_REGISTRATION` | `true` shows a sign-up option on the login screen | No (default: `false`) |
| `TRUST_PROXY` | Set to `true` if running behind a proxy/nginx | No |
| `DATA_DIR` | Where the database and uploads live | No (default: `/app/data` in Docker, `backend/data` locally) |

---

## Deploying behind a reverse proxy / nginx

Add `TRUST_PROXY=true` to environment variables, then configure nginx:

```nginx
location / {
    proxy_pass http://pethealth:3001;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 20m;
}
```

---

## Project structure

```
pethealth/
├── Dockerfile                 # Multi-stage: builds frontend → serves with Express
├── docker-compose.yml
├── .env.example               # Copy to .env (never commit .env)
├── data/                      # Persistent volume (database + uploads)
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js           # Express server, protected /uploads, SPA serving
│       ├── config.js          # Env vars and data paths
│       ├── db.js              # SQLite schema, migrations, triggers, seed data
│       ├── access.js          # Ownership checks (every record belongs to a user)
│       ├── files.js           # Upload validation, random file names, safe deletion
│       ├── middleware/
│       │   └── auth.js        # JWT verification (Bearer for API, cookie for files)
│       └── routes/            # auth, users, pets, checkups, exams, attachments
├── frontend/
│   ├── package.json
│   └── src/
│       ├── index.css          # Design tokens, component classes, dark mode
│       ├── translations.js    # UI strings (ES / EN)
│       ├── utils/format.js    # Locale-aware dates, ages, relative times
│       ├── App.jsx
│       ├── context/           # AuthContext, ThemeContext, LanguageContext
│       ├── pages/             # Login, Dashboard, PetProfile, AddPet, AddCheckup, AddExam, Account
│       └── components/        # Navbar, PetCard, CheckupCard, ExamViewer, MedicationForm, Attachments
└── pethealth-desing/          # Standalone HTML prototype of the redesign
```

---

## Local development

Requires Node.js 20+.

```bash
# Terminal 1 — backend on :3001 (data goes to backend/data)
cd backend && npm install && JWT_SECRET=dev ALLOW_REGISTRATION=true npm run dev

# Terminal 2 — frontend on :5173, proxies /api and /uploads to the backend
cd frontend && npm install && npm run dev
```

---

## API Reference

All endpoints (except `/api/auth/config`, `login`, `register` and `logout`) require:
```
Authorization: Bearer <token>
```

Every resource is scoped to the signed-in user: requesting another user's pet, checkup, exam or file returns `404`.

Uploaded files (`/uploads/...`) are served only to their owner, authenticated by the httpOnly session cookie set at login.

### Auth
| Method | Route | Description |
|---|---|---|
| GET | `/api/auth/config` | Public options (`allowRegistration`) |
| POST | `/api/auth/login` | Sign in → returns JWT and sets the file-access cookie |
| POST | `/api/auth/register` | Register a new user (only if `ALLOW_REGISTRATION=true`) |
| POST | `/api/auth/refresh` | Renew the JWT and cookie |
| POST | `/api/auth/logout` | Clear the file-access cookie |

### Users
| Method | Route | Description |
|---|---|---|
| GET | `/api/users/me` | Current user |
| PUT | `/api/users/me/password` | Change password (`current_password`, `new_password`) |

### Pets
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets` | List all pets |
| POST | `/api/pets` | Create a pet |
| GET | `/api/pets/:id` | Get pet details |
| PUT | `/api/pets/:id` | Update a pet |
| DELETE | `/api/pets/:id` | Delete a pet |
| POST | `/api/pets/:id/photo` | Upload photo (multipart, JPEG/PNG/GIF/WebP, max 5 MB) |

### Checkups
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/checkups` | List checkups |
| POST | `/api/pets/:id/checkups` | Create checkup + medications |
| GET | `/api/checkups/:id` | Get checkup details |
| PUT | `/api/checkups/:id` | Update a checkup |
| DELETE | `/api/checkups/:id` | Delete a checkup |
| POST | `/api/checkups/:id/attachments` | Upload file attachment (image or PDF, max 10 MB, 3 per checkup) |

### Medications
| Method | Route | Description |
|---|---|---|
| GET | `/api/checkups/:id/medications` | List medications |
| POST | `/api/checkups/:id/medications` | Add a medication |
| PUT | `/api/medications/:id` | Update a medication |
| DELETE | `/api/medications/:id` | Delete a medication |

### Lab Exams
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/exams` | List exams |
| POST | `/api/pets/:id/exams` | Create exam (multipart + optional PDF, max 15 MB) |
| GET | `/api/exams/:id` | Get exam details |
| PUT | `/api/exams/:id` | Update an exam |
| DELETE | `/api/exams/:id` | Delete exam |
| POST | `/api/exams/:id/values` | Add lab values |
| PUT | `/api/exam-values/:id` | Update a value |
| DELETE | `/api/exam-values/:id` | Delete a value |
| POST | `/api/exams/:id/attachments` | Upload file attachment (image or PDF, max 10 MB, 3 per exam) |
| DELETE | `/api/attachments/:id` | Delete an attachment |

---

## Useful commands

```bash
# Pull latest image
docker pull martitoci/pethealth:latest

# Start / restart
docker compose up -d

# Stream logs
docker compose logs -f

# Stop
docker compose down

# Stop and wipe all data (irreversible)
docker compose down -v

# Rebuild from source after code changes
docker compose up --build -d

# Shell into container
docker exec -it pethealth sh

# Publish to Docker Hub
docker build -t martitoci/pethealth:latest .
docker push martitoci/pethealth:latest
```

---

## Data persistence

The `./data/` directory is mounted as a Docker volume:

```
data/
├── pethealth.db          # SQLite database
└── uploads/
    ├── photos/           # Pet photos
    ├── pdfs/             # Exam PDFs
    └── attachments/      # Checkup and exam file attachments
```

To back up, copy this folder. To restore, place it back before starting the container.

---

## Security notes

- Never commit `.env` (it is in `.gitignore`). Generate a strong secret: `openssl rand -hex 32`
- Passwords are hashed with bcrypt (10 rounds); new passwords need at least 8 characters.
- The default **admin / admin123** account exists only for first-time setup — change it from **My account** (click your avatar).
- Uploads are restricted by type and size, stored under random names, and only served to their owner.
- Upgrading from an older version: pets that existed before per-user ownership are assigned to the first user (admin) automatically on startup.
