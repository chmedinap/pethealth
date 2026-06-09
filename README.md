# PetHealth Tracker 🐾

Web application for tracking your pets' medical history. Record vet visits, medications, lab exams (with PDF support), and photos of your dogs and cats — all in one place, with dark mode and English/Spanish interface support.

---

## Features

- **Dashboard** — pet grid with search and species filters, animated cards with last-visit status
- **Pet profiles** — two-column layout with vitals, photos, and a full health timeline
- **Vet checkups** — log visits with diagnosis, observations, medications, and file attachments
- **Lab exams** — store results and upload PDFs/images per exam
- **Dark mode** — full light/dark theme with smooth transitions
- **Bilingual** — Spanish and English UI, switchable at any time
- **Responsive** — works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Lucide |
| Backend | Node.js, Express, better-sqlite3 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
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

**1. Create a `.env` file** in the project root:

```env
JWT_SECRET=change_this_to_a_long_random_secret
NODE_ENV=production
PORT=3001
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
version: '3.8'

services:
  app:
    image: martitoci/pethealth:latest
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

> Variables are read from the `.env` file in the same folder.

---

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `JWT_SECRET` | Secret key for signing JWT tokens | **Yes** |
| `NODE_ENV` | Runtime environment | No (default: `production`) |
| `PORT` | Internal container port | No (default: `3001`) |
| `TRUST_PROXY` | Set to `true` if running behind a proxy/nginx | No |

> ⚠️ Without `JWT_SECRET` login will fail with `secretOrPrivateKey must have a value`.

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
├── .env                       # Environment variables (do not commit)
├── data/                      # Persistent volume (database + uploads)
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js           # Express server + static frontend serving
│       ├── db.js              # SQLite schema + seed data
│       ├── middleware/
│       │   └── auth.js        # JWT verification
│       └── routes/
│           ├── auth.js
│           ├── pets.js
│           ├── checkups.js
│           └── exams.js
└── frontend/
    ├── package.json
    └── src/
        ├── index.css          # Design tokens, component classes, dark mode
        ├── translations.js    # UI strings (ES / EN)
        ├── App.jsx
        ├── context/           # AuthContext, ThemeContext, LanguageContext
        ├── pages/             # Login, Dashboard, PetProfile, AddPet, AddCheckup, AddExam
        └── components/        # Navbar, PetCard, CheckupCard, ExamViewer, MedicationForm
```

---

## API Reference

All endpoints (except `/api/auth/*`) require:
```
Authorization: Bearer <token>
```

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Sign in → returns JWT |
| POST | `/api/auth/register` | Register a new user |

### Pets
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets` | List all pets |
| POST | `/api/pets` | Create a pet |
| GET | `/api/pets/:id` | Get pet details |
| PUT | `/api/pets/:id` | Update a pet |
| DELETE | `/api/pets/:id` | Delete a pet |
| POST | `/api/pets/:id/photo` | Upload photo (multipart) |

### Checkups
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/checkups` | List checkups |
| POST | `/api/pets/:id/checkups` | Create checkup + medications |
| GET | `/api/checkups/:id` | Get checkup details |
| PUT | `/api/checkups/:id` | Update a checkup |
| DELETE | `/api/checkups/:id` | Delete a checkup |
| POST | `/api/checkups/:id/attachments` | Upload file attachment |

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
| POST | `/api/pets/:id/exams` | Create exam (multipart + optional PDF) |
| GET | `/api/exams/:id` | Get exam details |
| PUT | `/api/exams/:id` | Update an exam |
| DELETE | `/api/exams/:id` | Delete exam |
| POST | `/api/exams/:id/values` | Add lab values |
| PUT | `/api/exam-values/:id` | Update a value |
| DELETE | `/api/exam-values/:id` | Delete a value |
| POST | `/api/exams/:id/attachments` | Upload file attachment |

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

- Add `.env` to your `.gitignore` — never commit `JWT_SECRET`.
- Generate a strong secret: `openssl rand -hex 32`
- Passwords are hashed with bcrypt (10 rounds).
- The default **admin / admin123** account exists only for first-time setup — change it immediately.
