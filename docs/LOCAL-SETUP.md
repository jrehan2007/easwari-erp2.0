# Running on your laptop with VS Code

This is the path for a full test on your own machine, without Docker.

---

## 1 · Install the three toolchains

| Tool | Version | Where |
|---|---|---|
| **JDK** | 17 or 21 | [Eclipse Temurin](https://adoptium.net) |
| **Maven** | 3.9+ | [maven.apache.org](https://maven.apache.org/download.cgi) |
| **Node.js** | 18 or 20 LTS | [nodejs.org](https://nodejs.org) |
| **Python** | 3.11+ | [python.org](https://python.org) |

Verify each one before going further:

```bash
java -version     # openjdk 17 or 21
mvn -version
node -v
python --version  # Windows may need: py --version
```

**Windows note:** tick "Add to PATH" in each installer. If `mvn` isn't found
afterwards, set `MAVEN_HOME` and add `%MAVEN_HOME%\bin` to PATH, then open a new
terminal.

**There is no `mvnw` wrapper in this project** — install Maven properly, or let
VS Code's Java extension build it for you (see step 3).

---

## 2 · Open the project

```bash
unzip easwari-erp.zip
cd easwari-erp
code .
```

VS Code will prompt to install the recommended extensions. Accept — the list in
`.vscode/extensions.json` is what makes the run configurations work:

- **Extension Pack for Java** — build, run, debug
- **Spring Boot Extension Pack** — the Spring Boot Dashboard
- **Python + Pylance** — the scoring service

Give the Java extension a minute on first open. It resolves the Maven
dependencies and you'll see progress in the status bar. Wait for it to finish
before running anything.

---

## 3 · Install dependencies

Press `Ctrl+Shift+P` → **Tasks: Run Task**, then run these two:

- `Install: Python dependencies`
- `Install: Frontend dependencies`

Or from a terminal:

```bash
cd ml-service && python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cd ../frontend && npm install

cd ../backend && mvn clean package -DskipTests
```

That last command is the real test of whether the Java compiles. **Run it before
anything else** — I was unable to compile the Java where I built this, so if
there are errors, this is where they surface.

---

## 4 · Run all three services

**The order matters.** Scoring service first, then backend, then frontend.

### The VS Code way

Open the **Run and Debug** panel (`Ctrl+Shift+D`) and pick **▶ Run everything**.
That starts the scoring service and the backend together, both with breakpoints
available.

Then `Ctrl+Shift+P` → **Tasks: Run Task** → `Run: Frontend dev server`.

### The terminal way

Three terminals in VS Code (`Ctrl+Shift+\`` for each):

```bash
# Terminal 1 — scoring service
cd ml-service
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2 — backend (wait for terminal 1 to say "Application startup complete")
cd backend
mvn spring-boot:run
```

```bash
# Terminal 3 — frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**

| Role | Username | Password |
|---|---|---|
| Student | `CSE23001` | `Student@123` |
| Faculty | `EEC-CSE001` | `Faculty@123` |
| Administration | `admin` | `Admin@123` |

---

## 5 · What happens on first boot

The backend takes **2–4 minutes** the first time. It is generating the entire
institution. Watch the console for:

```
Seeding Easwari Engineering College demonstration data...
Administrator account created (id 1)
Seed complete: 3 departments, 6 sections, 102 students, 64260 attendance records.
```

Every boot after that is a few seconds, because the seeder checks
`userRepo.count() > 0` and skips.

---

## Debugging

**Breakpoints in Java:** click the gutter in any `.java` file, run
**1 · Backend** from the debug panel, hit the endpoint. Try
`AttendanceService.markPeriod` while marking attendance in the faculty portal.

**Breakpoints in Python:** same, with **2 · Scoring service**. `scoring.py`
`score_risk` is the interesting one — you can watch each factor being weighted.

**Frontend:** browser DevTools, or run **3 · Frontend (browser debug)** to
attach VS Code to Chrome.

**Inspect the database:** http://localhost:8080/h2-console

- JDBC URL: `jdbc:h2:file:./data/easwari`
- User: `sa`
- Password: *(leave blank)*

Then try `SELECT COUNT(*) FROM attendance_records;`

---

## Common problems

**`mvn` not recognised** — Maven isn't on PATH. Reinstall, or use the Spring Boot
Dashboard in VS Code, which uses its own bundled build.

**Port 8080 already in use**
```bash
lsof -i :8080                      # macOS/Linux
netstat -ano | findstr :8080       # Windows
```
Or change `server.port` in `backend/src/main/resources/application.yml`.

**Intelligence panels are missing** — the scoring service isn't running. Check
`curl http://localhost:8080/api/health`; it reports `scoringService` status.
The portal deliberately keeps working without it.

**`ModuleNotFoundError: fastapi`** — the virtual environment isn't active. You
should see `(.venv)` in your prompt.

**CORS errors in the browser console** — you're on a different port than the
backend expects. Set it explicitly:
```bash
CORS_ORIGINS=http://localhost:5173 mvn spring-boot:run
```

**Login fails after deleting the database** — the browser is holding a token for
a user id that no longer exists. Refresh the page.

**Want to start over with fresh data** — run the task
`Reset: Delete the seeded database`, or delete `backend/data/` by hand, then
restart the backend.

---

## Testing on your phone

The Vite dev server already binds to your network. Find your laptop's LAN
address:

```bash
ipconfig                    # Windows — the IPv4 Address line
ifconfig | grep "inet "     # macOS / Linux
```

On your phone, connected to the same Wi-Fi, open `http://192.168.x.x:5173`.

If the API calls fail, the backend is rejecting the origin. Restart it with your
laptop's address included:

```bash
CORS_ORIGINS=http://localhost:5173,http://192.168.1.20:5173 mvn spring-boot:run
```
