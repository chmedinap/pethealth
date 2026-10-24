# PetHealth Tracker 🐾

Web application for tracking your pets' medical history. Record vet visits, medications, lab exams (with PDF support), and photos of your dogs and cats — all in one place, with dark mode and English/Spanish interface support.

---

## Features

- **Dashboard** — pet grid with search, species filters, and an **upcoming care** panel: overdue/upcoming vet visits, vaccine boosters and active treatments
- **Pet profiles** — vitals, photos, and tabs for checkups, lab exams, vaccines and weight
- **Vet checkups** — diagnosis, observations, editable medications, file attachments
- **Lab exams** — values, PDFs, attachments, and a **trend chart** for any parameter measured more than once (with its reference range)
- **Vaccines** — doses and boosters with status (up to date / due soon / overdue)
- **Weight history** — chart and log; the pet's current weight is always the latest entry
- **Parasite control** — internal, external and combined treatments with next-dose reminders
- **Dose tracking** — log each dose of an active treatment (who and when) right from the dashboard; the daily target comes from the frequency ("every 8 hours" → 3)
- **Allergies & chronic conditions** — highlighted on the profile, the summary and the printable report
- **Expenses** — optional cost on checkups, exams, vaccines and parasite treatments, with totals per pet and per year
- **Timeline** — every record of a pet in a single chronological view
- **Vet directory** — personal list of vets and clinics (phone, email, address) that autocompletes forms; can be imported from your history
- **Email reminders** — a digest when something is due in 7 days, tomorrow, today, or has been overdue for 3 days (needs SMTP)
- **Calendar feed** — private `.ics` link to subscribe from Google Calendar, Apple Calendar or Outlook
- **Export / import** — move a pet with its full history and files between accounts or installations as a ZIP
- **Printable report** — full medical history, ready to "Save as PDF" for a new vet
- **Sharing** — give another user view-only or edit access to a pet
- **Species** — dogs, cats, birds, rabbits, rodents, ferrets, reptiles, fish, horses and more
- **Shareable summary** — send a pet's health summary to your vet
- **Account security** — forced change of the default password, login rate limiting, "sign out of other devices"
- **Automatic backups** — consistent SQLite snapshots with rotation
- **Dark mode**, **Spanish/English**, responsive

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

Open `http://localhost:3000` — default credentials: **admin / admin123** (you'll be asked to change the password).

A fresh install comes with **4 demo pets** — Milo (dog), Luna (cat), Copito (rabbit) and Rocky (puppy) — with checkups, exams, vaccines and weight history dated relative to the first start, so reminders, active treatments and charts all have data. Set `SEED_DEMO=false` to start empty.

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
      - LOGIN_RATE_LIMIT=${LOGIN_RATE_LIMIT:-10}
      - BACKUP_INTERVAL_HOURS=${BACKUP_INTERVAL_HOURS:-24}
      - BACKUP_KEEP=${BACKUP_KEEP:-7}
      - TZ=${TZ:-UTC}
      - SEED_DEMO=${SEED_DEMO:-true}
      - APP_URL=${APP_URL:-}
      - SMTP_HOST=${SMTP_HOST:-}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_SECURE=${SMTP_SECURE:-false}
      - SMTP_USER=${SMTP_USER:-}
      - SMTP_PASS=${SMTP_PASS:-}
      - SMTP_FROM=${SMTP_FROM:-}
      - NOTIFY_HOUR=${NOTIFY_HOUR:-8}
```

> Variables are read from the `.env` file in the same folder. Compose refuses to start if `JWT_SECRET` is missing.

---

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `JWT_SECRET` | Secret key for signing JWT tokens | **Yes** (the server exits without it) |
| `NODE_ENV` | Runtime environment | No (default: `production` in the image) |
| `PORT` | Internal container port | No (default: `3001`) |
| `ALLOW_REGISTRATION` | `true` shows a sign-up option on the login screen | No (default: `false`) |
| `TRUST_PROXY` | Set to `true` if running behind a proxy/nginx (also needed for per-IP rate limiting) | No |
| `LOGIN_RATE_LIMIT` | Failed login/sign-up attempts allowed per IP every 15 min (`0` disables) | No (default: `10`) |
| `BACKUP_INTERVAL_HOURS` | Hours between automatic database backups (`0` disables) | No (default: `24`) |
| `BACKUP_KEEP` | Number of backups to keep | No (default: `7`) |
| `SEED_DEMO` | Load 4 demo pets on first start (`false` to start empty) | No (default: `true`) |
| `APP_URL` | Public URL of the app, used for links in emails and calendar events (e.g. `https://pets.example.com`) | No |
| `SMTP_HOST` | SMTP server for email reminders. Without it, email is turned off | No |
| `SMTP_PORT` / `SMTP_SECURE` | SMTP port, and `true` for implicit TLS (port 465) | No (default: `587` / `false`) |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (for Gmail, use an app password) | No |
| `SMTP_FROM` | Sender address, e.g. `PetHealth <pets@example.com>` | No (default: `SMTP_USER`) |
| `NOTIFY_HOUR` | Local hour (0–23) from which the daily digest is sent | No (default: `8`) |
| `TZ` | Server time zone (e.g. `America/Bogota`) | No (default: `UTC`) |
| `DATA_DIR` | Where the database, uploads and backups live | No (default: `/app/data` in Docker, `backend/data` locally) |

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
│       ├── app.js             # Express app (imported by the tests)
│       ├── access.js          # Role-based access: owner / editor / viewer per pet
│       ├── session.js         # JWT + file-access cookie, session revocation
│       ├── backup.js          # Scheduled SQLite backups (also `npm run backup`)
│       ├── validate.js        # Shared input validation
│       ├── files.js           # Upload validation, random file names, safe deletion
│       ├── middleware/
│       │   └── auth.js        # JWT verification (Bearer for API, cookie for files)
│       ├── reminders.js       # Due items shared by the dashboard, email digest and calendar feed
│       ├── notify.js          # Daily email digest (nodemailer)
│       ├── ics.js             # iCalendar feed builder
│       └── routes/            # auth, users, pets, checkups (+ doses), exams, vaccines, parasites, conditions,
│                              # weights, vets, reminders, calendar, transfer (export/import), attachments
│   └── test/                  # API, access, care features, calendar/email, export/import, migration… (node:test + supertest)
└── frontend/
    ├── package.json
    └── src/
        ├── index.css          # Design tokens, component classes, dark mode
        ├── translations.js    # UI strings (ES / EN)
        ├── utils/             # dates, money, species, vaccines, parasites, doses, expenses, timeline, labs (+ Vitest tests)
        ├── App.jsx
        ├── context/           # AuthContext, ThemeContext, LanguageContext
        ├── pages/             # Login, Dashboard, PetProfile, PetReport, AddPet, AddCheckup, AddExam, Account, Vets
        └── components/        # PetCard, CheckupCard, ExamViewer, VaccineList, ParasiteList, ConditionsCard,
                               # ExpensesPanel, TimelinePanel, RemindersPanel, VetInput, WeightPanel, LineChart, …
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

## Tests

```bash
cd backend && npm test     # 57 API tests: access control, sharing, migrations, backups, rate limiting
cd frontend && npm test    # unit tests for dates, lab parsing, vaccines and chart ticks
```

GitHub Actions (`.github/workflows/ci.yml`) runs both suites, the frontend build and a Docker smoke test on every push and pull request.

---

## API Reference

All endpoints (except `/api/auth/config`, `login`, `register` and `logout`) require:
```
Authorization: Bearer <token>
```

Every resource is scoped to the pets the signed-in user can access. Without access the API returns `404`; with view-only access, changes return `403`.

| Role | Can |
|---|---|
| owner | everything, including deleting the pet and managing sharing |
| editor | add/edit/delete checkups, exams, vaccines, weight, photo and pet details |
| viewer | read the pet, its history and files |

While an account still has the default password, every endpoint except `/api/users/me`, `/api/users/me/password` and `/api/auth/refresh` returns `403` with `code: "PASSWORD_CHANGE_REQUIRED"`.

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
| PUT | `/api/users/me/password` | Change password (`current_password`, `new_password`); signs out other sessions and returns a new token |
| POST | `/api/users/me/sessions/revoke` | Sign out of all other devices; returns a new token |

### Pets
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets` | List all pets |
| POST | `/api/pets` | Create a pet |
| GET | `/api/pets/:id` | Get pet details |
| PUT | `/api/pets/:id` | Update a pet |
| DELETE | `/api/pets/:id` | Delete a pet |
| POST | `/api/pets/:id/photo` | Upload photo (multipart, JPEG/PNG/GIF/WebP, max 5 MB) |
| GET | `/api/pets/:id/shares` | List people with access (owner) |
| POST | `/api/pets/:id/shares` | Share with `{ username, role: "viewer" \| "editor" }` (owner) |
| DELETE | `/api/pets/:id/shares/:userId` | Remove access (owner), or stop viewing (the user themselves) |

### Vaccines
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/vaccines` | List vaccines |
| POST | `/api/pets/:id/vaccines` | Log a dose (`name`, `date_given`, optional `next_due_date`, `vet_name`, `batch_number`, `notes`) |
| PUT | `/api/vaccines/:id` | Update |
| DELETE | `/api/vaccines/:id` | Delete |

### Weight
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/weights` | Weight history (oldest first) |
| POST | `/api/pets/:id/weights` | Log `{ measured_on, weight_kg, notes }` (same date updates the entry) |
| DELETE | `/api/weights/:id` | Delete an entry |

### Reminders
| Method | Route | Description |
|---|---|---|
| GET | `/api/reminders?today=YYYY-MM-DD&days=30` | Due/overdue visits and vaccine boosters, and active treatments, for all accessible pets |

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
├── backups/              # Automatic snapshots (pethealth-YYYYMMDD-HHMMSS-mmm.db)
└── uploads/
    ├── photos/           # Pet photos
    ├── pdfs/             # Exam PDFs
    └── attachments/      # Checkup and exam file attachments
```

The server keeps `BACKUP_KEEP` consistent snapshots of the database in `data/backups/` (taken with SQLite's online backup API, safe while the app is running). Run one manually with `docker exec pethealth npm run backup`.

Uploaded files never change once written, so a full backup is simply a copy of the `data/` folder. To restore, stop the container, put the folder back (or copy a snapshot over `pethealth.db`) and start it again.

Schema changes are applied automatically on startup (versioned migrations tracked with `PRAGMA user_version`).

---

## Security notes

- Never commit `.env` (it is in `.gitignore`). Generate a strong secret: `openssl rand -hex 32`
- Passwords are hashed with bcrypt (10 rounds); new passwords need at least 8 characters.
- The default **admin / admin123** account must change its password on first sign-in before it can use the app.
- Failed logins are rate-limited per IP (`LOGIN_RATE_LIMIT`). Behind a reverse proxy, set `TRUST_PROXY=true` so the real client IP is used.
- Changing the password signs out every other session; **My account → Sign out of all other devices** does the same on demand.
- Uploads are restricted by type and size, stored under random names, and only served to their owner.
- Upgrading from an older version: pets that existed before per-user ownership are assigned to the first user (admin) automatically on startup.
