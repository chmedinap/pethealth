# PetHealth Tracker 🐾

**A self-hosted medical record for your pets.** Keep vet visits, prescriptions, lab results, vaccines, parasite treatments, weight and expenses in one place, and get reminded before anything is due — by email or right in your calendar.

One container, one SQLite file, no cloud account. Spanish and English interface, light and dark mode, mobile-friendly.

**Source, issues and full docs:** https://github.com/chmedinap/pethealth

![Dashboard](https://raw.githubusercontent.com/chmedinap/pethealth/main/docs/screenshots/dashboard.jpg)

## Features

- **Health record** — checkups with prescriptions and attachments, lab exams with PDF and trend charts, vaccines, parasite treatments, allergies and chronic conditions, weight history
- **Upcoming care** — overdue and upcoming visits, boosters and parasite treatments across all your pets
- **Dose tracking** — tap to log each dose of an active treatment; the daily target comes from the prescription ("every 8 hours" → 3)
- **Email reminders** (SMTP) and a private **calendar feed** (`.ics`) for Google, Apple or Outlook
- **Expenses** per pet and per year, **timeline** of every record, personal **vet directory**
- **Printable report** for a new vet, shareable text summary, **export / import** a pet as a ZIP
- **Multi-user** — share a pet as view-only or editor; automatic backups; demo data on first start

## Quick start

```bash
docker run -d --name pethealth --restart unless-stopped \
  -p 3000:3001 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e TZ=America/Bogota \
  -v "$(pwd)/data:/app/data" \
  martitoci/pethealth:latest
```

Open **http://localhost:3000** and sign in with **admin / admin123**. You'll be asked to set a new password first.

The first start creates 4 demo pets so you can explore everything. Set `SEED_DEMO=false` before that first start to begin with an empty install.

## Docker Compose

```yaml
services:
  pethealth:
    image: martitoci/pethealth:latest
    container_name: pethealth
    restart: unless-stopped
    ports:
      - "3000:3001"
    volumes:
      - ./data:/app/data
    environment:
      - JWT_SECRET=${JWT_SECRET:?set JWT_SECRET in .env}
      - TZ=America/Bogota
      # Optional: email reminders
      # - APP_URL=https://pets.example.com
      # - SMTP_HOST=smtp.gmail.com
      # - SMTP_PORT=465
      # - SMTP_SECURE=true
      # - SMTP_USER=you@gmail.com
      # - SMTP_PASS=your-app-password
      # - SMTP_FROM=PetHealth <you@gmail.com>
```

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | **Required.** Session signing secret (`openssl rand -hex 32`) |
| `TZ` | `UTC` | Time zone, e.g. `America/Bogota` |
| `ALLOW_REGISTRATION` | `false` | Show a sign-up option on the login screen |
| `SEED_DEMO` | `true` | Create 4 demo pets on the very first start |
| `APP_URL` | — | Public URL, used for links in emails and calendar events |
| `TRUST_PROXY` | `false` | `true` behind a reverse proxy |
| `LOGIN_RATE_LIMIT` | `10` | Failed logins per IP every 15 min (`0` disables) |
| `BACKUP_INTERVAL_HOURS` | `24` | Hours between automatic DB backups (`0` disables) |
| `BACKUP_KEEP` | `7` | Backups to keep |
| `SMTP_HOST` | — | SMTP server; without it email reminders are off |
| `SMTP_PORT` / `SMTP_SECURE` | `587` / `false` | `SMTP_SECURE=true` for port 465 |
| `SMTP_USER` / `SMTP_PASS` | — | SMTP credentials (Gmail: app password) |
| `SMTP_FROM` | `SMTP_USER` | Sender address |
| `NOTIFY_HOUR` | `8` | Local hour from which the daily digest is sent |

Currency, language, notification email and the calendar link are per-user settings under **My account**.

## Ports and volumes

| | |
|---|---|
| Port | `3001` (HTTP) inside the container |
| Volume | `/app/data` — SQLite database, uploaded files and `backups/` |

Back up by copying the `data/` folder. Automatic snapshots are kept in `data/backups/`; take one manually with `docker exec pethealth npm run backup`.

## Updating

```bash
docker compose pull && docker compose up -d
```

Database migrations run automatically on startup.

## Platforms and tags

- `latest` — the current version, built from the `main` branch
- Architecture: `linux/amd64`

## Security notes

- Change the default password right away (the app requires it), and use a long random `JWT_SECRET`.
- If the app is reachable from the internet, put it behind HTTPS (`TRUST_PROXY=true`) and keep `ALLOW_REGISTRATION=false` unless you want open sign-ups.
- The calendar link is a secret URL. Regenerate it from *My account* if it leaks.

Issues and contributions: https://github.com/chmedinap/pethealth
