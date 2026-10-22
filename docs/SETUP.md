# Setup

## Requirements

| | Version | Needed for |
|---|---|---|
| Java | 17+ | Backend |
| Node | 18+ | Frontend |
| Python | 3.11+ | Scoring service |
| Docker | any recent | Optional, runs all three at once |

No database server. H2 runs embedded and writes to `backend/data/easwari.mv.db`.

---

## Fastest path

```bash
docker compose up --build
```

Open http://localhost:5173. First start takes a few minutes: Maven downloads
dependencies, then the seeder writes roughly 107,000 attendance records. Watch for:

```
Seed complete: 3 departments, 6 sections, 102 students, 107100 attendance records.
```

---

## Running the three services separately

**1. Scoring service**
```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Check http://localhost:8000/health

**2. Backend**
```bash
cd backend
mvn spring-boot:run
```
Check http://localhost:8080/api/health — `scoringService` should read `UP`.

**3. Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Opening it on a phone

`vite.config.js` sets `host: true`, so the dev server binds to your network address.

1. Find your machine's IP — `ipconfig` on Windows, `ifconfig` or `ip addr` otherwise.
2. On the phone, browse to `http://<that-ip>:5173`.
3. Both devices must be on the same Wi-Fi.

If the API calls fail from the phone, add your IP to `CORS_ORIGINS`:
```bash
CORS_ORIGINS=http://localhost:5173,http://192.168.1.42:5173 ./mvnw spring-boot:run
```

---

## The college crest

Save the crest as `frontend/public/logo.png`. It then appears in the sidebar,
header, footer, login screen and student ID card. Without the file, a drawn
fallback crest renders — the interface never breaks over a missing asset.

---

## Resetting the demonstration data

```bash
rm -rf backend/data          # or: docker compose down -v
```
The seeder repopulates on next start. It only runs when the user table is empty.

---

## Inspecting the database

http://localhost:8080/h2-console

| Field | Value |
|---|---|
| JDBC URL | `jdbc:h2:file:./data/easwari` |
| User | `sa` |
| Password | *(blank)* |

---

## Moving to PostgreSQL

No code changes. Set the `prod` profile and supply a connection:

```bash
SPRING_PROFILES_ACTIVE=prod \
DB_URL=jdbc:postgresql://host:5432/easwari \
DB_USER=erp DB_PASSWORD=... \
JWT_SECRET=<a real 256-bit secret> \
java -jar target/erp-1.0.0.jar
```

The `prod` profile sets `ddl-auto: validate` and disables both the seeder and the
H2 console.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Intelligence panels say unavailable | Scoring service is down. The rest of the portal is designed to keep working — start it on port 8000. |
| `Port 8080 already in use` | `server.port=8081` in `application.yml`, and update the Vite proxy. |
| Seeder didn't run | It skips when the user table has rows. Delete `backend/data/`. |
| Blank page after `npm run build` | Serve `dist/` over HTTP, not by opening the file directly. |
| 401 on every call after a while | Tokens last 8 hours. Sign in again. |
| Logo missing | Add `frontend/public/logo.png`; the fallback crest is drawn until you do. |
