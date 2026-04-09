# PetHealth Tracker 🐾

Web application for tracking your pets' medical history. Record vet visits, medications, lab exams (with PDF), and photos of your dogs and cats — all in one place, with dark mode and English/Spanish interface support.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Lucide |
| Backend | Node.js, Express, better-sqlite3 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File uploads | Multer (photos and PDFs) |
| Containers | Docker (single image, frontend + backend) |

---

## Requirements

- [Docker](https://docs.docker.com/get-docker/) installed.
- No Node.js needed on the host to run in production.

---

## Quick start

### With Docker Compose (recommended)

**1. Create a `.env` file** in the project root:

```env
JWT_SECRET=change_this_to_a_long_random_secret
NODE_ENV=production
PORT=3001
```

**2. Start the app:**

```bash
docker compose up --build -d
```

**3. Open your browser:**

```
http://localhost:3000
```

Default credentials: **admin / admin123**
> Change them immediately. On login you can also select your preferred language (Spanish / English).

---

### With Docker directly

```bash
# Build the image
docker build -t pethealth:latest .

# Run
docker run -d \
  -p 3000:3001 \
  -e JWT_SECRET=change_this_to_a_long_random_secret \
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

> Variables are read from the `.env` file in the same folder.

---

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `JWT_SECRET` | Secret key for signing JWT tokens | **Yes** |
| `NODE_ENV` | Runtime environment | No (default: `production`) |
| `PORT` | Internal container port | No (default: `3001`) |
| `TRUST_PROXY` | Set to `true` if running behind a proxy/nginx | No (disabled by default) |

> ⚠️ Without `JWT_SECRET` login will fail with `secretOrPrivateKey must have a value`.

---

## Deploying behind a reverse proxy / nginx

If the app runs behind a reverse proxy, add `TRUST_PROXY=true` to the environment variables so Express reads the real client IP:

```yaml
environment:
  - JWT_SECRET=...
  - TRUST_PROXY=true
```

The nginx in front must forward these headers:

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

Without `TRUST_PROXY=true` the app works fine — logs will just show the proxy IP instead of the real client IP.

---

## Project structure

```
pethealth/
├── Dockerfile                 # Single image (builds frontend + serves with Express)
├── docker-compose.yml
├── .env                       # Environment variables (do not commit to git)
├── data/                      # Persistent volume (database + uploaded files)
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js           # Express server (also serves the compiled frontend)
│       ├── db.js              # SQLite + demo seed data
│       ├── middleware/
│       │   └── auth.js        # JWT token verification
│       └── routes/
│           ├── auth.js        # Login and registration
│           ├── pets.js        # Pet CRUD and photo upload
│           ├── checkups.js    # Vet visits and medications
│           └── exams.js       # Lab exams and values
└── frontend/
    ├── package.json
    └── src/
        ├── translations.js    # UI strings in Spanish and English
        ├── main.jsx
        ├── App.jsx
        ├── context/           # AuthContext, ThemeContext, LanguageContext
        ├── pages/             # Login, Dashboard, PetProfile, forms
        └── components/        # Navbar, PetCard, CheckupCard, ExamViewer, etc.
```

---

## API Reference

All endpoints (except auth) require the header:
```
Authorization: Bearer <token>
```

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Sign in → returns JWT token |
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

### Vet checkups
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/checkups` | List checkups for a pet |
| POST | `/api/pets/:id/checkups` | Create checkup with medications |
| GET | `/api/checkups/:id` | Get checkup details |
| PUT | `/api/checkups/:id` | Update a checkup |
| DELETE | `/api/checkups/:id` | Delete a checkup |

### Medications
| Method | Route | Description |
|---|---|---|
| GET | `/api/checkups/:id/medications` | List medications for a checkup |
| POST | `/api/checkups/:id/medications` | Add a medication |
| PUT | `/api/medications/:id` | Update a medication |
| DELETE | `/api/medications/:id` | Delete a medication |

### Lab exams
| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/exams` | List exams for a pet |
| POST | `/api/pets/:id/exams` | Create exam (multipart + optional PDF) |
| GET | `/api/exams/:id` | Get exam details |
| PUT | `/api/exams/:id` | Update an exam |
| DELETE | `/api/exams/:id` | Delete exam and its PDF |
| POST | `/api/exams/:id/values` | Add lab values |
| PUT | `/api/exam-values/:id` | Update a value |
| DELETE | `/api/exam-values/:id` | Delete a value |

---

## Useful commands

```bash
# Stream logs in real time
docker compose logs -f

# Stop the container
docker compose down

# Stop and delete all data (irreversible!)
docker compose down -v

# Rebuild after code changes
docker compose up --build -d

# Open a shell inside the container
docker exec -it pethealth sh

# Publish to Docker Hub
docker build -t username/pethealth:latest .
docker push username/pethealth:latest
```

---

## Data persistence

The `./data/` directory is mounted as a volume inside the container:

```
data/
├── pethealth.db          # SQLite database
└── uploads/
    ├── photos/           # Pet photos
    └── pdfs/             # Exam PDFs
```

To back up your data, just copy this folder.

---

## Security notes

- **Add `.env` to your `.gitignore`** to avoid exposing `JWT_SECRET`.
- Generate a secure key with: `openssl rand -hex 32`
- Passwords are stored hashed with bcrypt (10 salt rounds).
