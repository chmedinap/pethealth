# PetHealth API

JSON REST API under `/api`, used by the web app. Request and response bodies are JSON unless noted as multipart.

## Authentication

Sign in with `POST /api/auth/login` and send the returned token on every request:

```
Authorization: Bearer <token>
```

Tokens last 7 days; renew them with `POST /api/auth/refresh`. Login also sets an httpOnly cookie, scoped to `/uploads`, that authorizes `<img>` tags and file links.

Public endpoints (no token): `GET /api/auth/config`, `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout` and the calendar feed `GET /api/calendar/:token.ics`.

While an account still has the default password, every endpoint except `/api/users/me`, `/api/users/me/password` and `/api/auth/refresh` returns `403` with `code: "PASSWORD_CHANGE_REQUIRED"`.

## Access control

Every record belongs to a pet, and each user has one of these roles on a pet:

| Role | Can |
|---|---|
| `owner` | everything, including deleting the pet and managing sharing |
| `editor` | create, edit and delete records (checkups, exams, vaccines, parasites, conditions, weight, doses, photo, pet details) |
| `viewer` | read the pet, its history and files; export it |

A record the user can't see returns `404`, so its existence isn't revealed. A change attempted with view-only access returns `403`.

## Conventions

- Dates are `YYYY-MM-DD`; times are `HH:MM` (24 h).
- Optional fields accept `""` or `null` to clear them.
- `cost` is an optional number ≥ 0, in the currency the user picked in their preferences.
- Errors look like `{ "error": "message" }` with status `400` (validation), `401`, `403`, `404` or `413` (file too large).

---

## Auth

| Method | Route | Description |
|---|---|---|
| GET | `/api/auth/config` | Public options: `{ allowRegistration }` |
| POST | `/api/auth/login` | `{ username, password }` → `{ token, user }` |
| POST | `/api/auth/register` | Same body; only when `ALLOW_REGISTRATION=true` |
| POST | `/api/auth/refresh` | New token and cookie |
| POST | `/api/auth/logout` | Clears the file cookie |

## Account

| Method | Route | Description |
|---|---|---|
| GET | `/api/users/me` | Profile: `username`, `email`, `notifyEmail`, `currency`, `lang`, `calendarToken`, `emailEnabled` |
| PUT | `/api/users/me` | Update any of `{ email, notify_email, currency, lang }`. `currency` is an ISO code (`COP`, `USD`…), `lang` is `es` or `en` |
| PUT | `/api/users/me/password` | `{ current_password, new_password }`; signs out other sessions and returns a new token |
| POST | `/api/users/me/sessions/revoke` | Sign out of all other devices; returns a new token |
| POST | `/api/users/me/calendar-token` | Create or replace the private calendar link (the old one stops working) |
| DELETE | `/api/users/me/calendar-token` | Turn the calendar feed off |
| POST | `/api/users/me/test-email` | Send the reminder digest now. Optional `{ today }`; `400` if SMTP or the user's email isn't set |

## Pets

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets` | Own and shared pets, each with `access`, `owner_username` and `last_checkup` |
| POST | `/api/pets` | `{ name, species, breed, birth_date, gender, weight_kg, notes }` |
| GET | `/api/pets/:id` | Pet details |
| PUT | `/api/pets/:id` | Update fields; a new `weight_kg` is also logged in the weight history |
| DELETE | `/api/pets/:id` | Delete the pet and all its records and files (owner) |
| POST | `/api/pets/:id/photo` | Multipart `photo` (JPEG/PNG/GIF/WebP, max 5 MB) |
| GET | `/api/pets/:id/export` | ZIP with `pet.json` and every file |
| POST | `/api/pets/import` | Multipart `file` (a PetHealth ZIP, max 200 MB) → creates a new pet owned by the caller |

`species` is one of `dog`, `cat`, `bird`, `rabbit`, `rodent`, `ferret`, `reptile`, `fish`, `horse` or `other`.

### Sharing

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/shares` | People with access (owner) |
| POST | `/api/pets/:id/shares` | `{ username, role: "viewer" \| "editor" }` creates or updates access (owner) |
| DELETE | `/api/pets/:id/shares/:userId` | Remove access (owner), or stop following the pet (the user themselves) |

### Allergies & chronic conditions

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/conditions` | Allergies first, then chronic conditions |
| POST | `/api/pets/:id/conditions` | `{ kind: "allergy" \| "chronic", name, since, notes }` |
| PUT | `/api/conditions/:id` | Update |
| DELETE | `/api/conditions/:id` | Delete |

## Checkups and medications

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/checkups` | Checkups (newest first) with `medications` and `attachments` |
| POST | `/api/pets/:id/checkups` | `{ vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date, cost, medications: [...] }` |
| GET | `/api/checkups/:id` | One checkup |
| PUT | `/api/checkups/:id` | Update fields |
| DELETE | `/api/checkups/:id` | Delete with its medications, doses and files |
| GET | `/api/checkups/:id/medications` | Medications |
| POST | `/api/checkups/:id/medications` | `{ name, concentration, frequency, duration_days, notes }` |
| PUT | `/api/medications/:id` | Update |
| DELETE | `/api/medications/:id` | Delete |
| POST | `/api/checkups/:id/attachments` | Multipart `file` (image or PDF, max 10 MB, 3 per checkup) |

Each medication includes `dose_count` and `last_dose` (`"YYYY-MM-DD HH:MM"`).

### Doses

| Method | Route | Description |
|---|---|---|
| GET | `/api/medications/:id/doses` | Dose log (newest first) with `given_by_username` |
| POST | `/api/medications/:id/doses` | `{ given_on, given_time }` — logged as the caller (editor) |
| DELETE | `/api/doses/:id` | Undo a dose |

## Lab exams

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/exams` | Exams with `exam_values` and `attachments` |
| POST | `/api/pets/:id/exams` | Multipart: `exam_type`, `exam_date`, `lab_name`, `checkup_id`, `notes`, `cost`, `values` (JSON array) and optional `pdf` (max 15 MB) |
| GET | `/api/exams/:id` | One exam |
| PUT | `/api/exams/:id` | Update fields |
| DELETE | `/api/exams/:id` | Delete with its values and files |
| POST | `/api/exams/:id/values` | Array of `{ parameter_name, value, unit, reference_range, is_abnormal }` |
| PUT | `/api/exam-values/:id` | Update a value |
| DELETE | `/api/exam-values/:id` | Delete a value |
| POST | `/api/exams/:id/attachments` | Multipart `file` (image or PDF, max 10 MB, 3 per exam) |
| DELETE | `/api/attachments/:id` | Delete a checkup or exam attachment |

## Vaccines

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/vaccines` | All doses |
| POST | `/api/pets/:id/vaccines` | `{ name, date_given, next_due_date, vet_name, batch_number, notes, cost }` |
| PUT | `/api/vaccines/:id` | Update |
| DELETE | `/api/vaccines/:id` | Delete |

The most recent dose of each vaccine (by name, case-insensitive) sets the next booster.

## Parasite treatments

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/parasites` | All treatments |
| POST | `/api/pets/:id/parasites` | `{ kind: "internal" \| "external" \| "combined", product, date_given, next_due_date, cost, notes }` |
| PUT | `/api/parasites/:id` | Update |
| DELETE | `/api/parasites/:id` | Delete |

The most recent treatment of each `kind` sets the next reminder, so switching brands doesn't leave stale reminders.

## Weight

| Method | Route | Description |
|---|---|---|
| GET | `/api/pets/:id/weights` | History, oldest first |
| POST | `/api/pets/:id/weights` | `{ measured_on, weight_kg, notes }`; the same date updates the existing entry |
| DELETE | `/api/weights/:id` | Delete an entry |

## Reminders

| Method | Route | Description |
|---|---|---|
| GET | `/api/reminders?today=YYYY-MM-DD&days=30` | Reminders for every pet the user can see |

The response is `{ today, days, due, medications }`:

- `due` — overdue or upcoming items within `days`: `type` (`visit`, `vaccine`, `parasite`), `pet_id`, `pet_name`, `title`, `date`, `status` (`overdue` or `upcoming`)
- `medications` — active treatments, with `frequency`, `started_on`, end `date`, the caller's `access` and `doses_today`

`today` should be the browser's local date; it defaults to the server's.

## Vet directory

Personal to each user.

| Method | Route | Description |
|---|---|---|
| GET | `/api/vets` | The user's vets |
| POST | `/api/vets` | `{ name, clinic, phone, email, address, notes }` |
| POST | `/api/vets/import-history` | Add the vets found in the user's checkups and vaccines → `{ added, vets }` |
| PUT | `/api/vets/:id` | Update |
| DELETE | `/api/vets/:id` | Delete (existing checkups keep the name) |

## Calendar feed

| Method | Route | Description |
|---|---|---|
| GET | `/api/calendar/:token.ics` | iCalendar feed (no auth header; the token is the credential) |

It contains every overdue item, everything due in the next 365 days and the active treatments, written in the user's language.

## Export format

`GET /api/pets/:id/export` returns a ZIP:

```
pet.json        { format: "pethealth-pet", version: 1, pet, conditions, checkups, exams, vaccines, parasites, weights }
files/…         photo, exam PDFs and attachments, referenced from pet.json
```

On import, new IDs are assigned and the links between exams and checkups are preserved. Files are written under new random names, and only if their content really is a PDF or an image. Dose authors aren't kept. If any required data is missing, the import is rolled back completely.
