# Easwari Student ERP

Attendance, academic progress and placement platform for **Easwari Engineering College**,
SRM Group of Institutions, Ramapuram, Chennai.

Three portals — Student, Faculty and Administration — on one codebase, one login,
and one role-aware API.

---

## Running it

Everything is embedded. There is no database server to install.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Portal | http://localhost:5173 |
| API | http://localhost:8080/api |
| Scoring service | http://localhost:8000/docs |
| Database console | http://localhost:8080/h2-console |

### Without Docker

```bash
# 1. Scoring service
cd ml-service && pip install -r requirements.txt && uvicorn app.main:app --port 8000

# 2. Backend
cd backend && mvn spring-boot:run

# 3. Frontend
cd frontend && npm install && npm run dev
```

`vite.config.js` sets `host: true`, so a phone on the same Wi-Fi can open the dev
server at `http://<your-laptop-ip>:5173`.

---

## Sign-in

A fresh database (default `SEED_MODE=minimal`) contains only the administrator,
`admin` / `Admin@123`. Accounts created from the Admin portal get a random
one-time password, shown once with a copy button.

To load a fully populated college instead (5 departments, 25 faculty including
the HODs, 10 classes, 59 students, a semester of attendance, marks, university
results and fees), start the backend once on an empty `backend/data/`:

```bash
cd backend && rm -rf data && SEED_MODE=full mvn spring-boot:run
```

Every seeded login is written to `backend/data/seed-credentials.csv` (git-ignored).
Students sign in with their roll number, staff with their employee code (e.g. `EEC-CSE01`).

---

## The logo

Save the college crest as `frontend/public/logo.png`. The interface already
references it in the sidebar, header, footer, login screen and ID card. If the
file is missing, a drawn fallback crest renders instead, so nothing breaks.

---

## What's inside

```
backend/      Spring Boot 3.2 · Java 17 · H2 (file) · Apache POI · JWT
ml-service/   FastAPI · risk, readiness, recommendations, assistant
frontend/     React 18 · Vite · Recharts · glassmorphic light UI
docs/         Architecture, data model, API reference, demo script
```

## Documentation

| Document | Covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the three services fit together, and why |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | All 17 entities and the relationships between them |
| [docs/API.md](docs/API.md) | Every endpoint, with request and response shapes |
| [docs/SETUP.md](docs/SETUP.md) | Install, run, troubleshoot |
| [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) | A 10-minute walkthrough for the review panel |
