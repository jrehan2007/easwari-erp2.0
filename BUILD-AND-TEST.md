# Build and test — August 2026

Follow this top to bottom. Stop at the first thing that fails and tell me what
the console said.

---

## Phase 0 · Prerequisites (10 min, once)

Install these, then **open a brand-new terminal** so PATH updates take effect.

| Tool | Version | Download |
|---|---|---|
| JDK | 17 or 21 | https://adoptium.net |
| Maven | 3.9+ | https://maven.apache.org/download.cgi |
| Node.js | 20 LTS | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| VS Code | latest | https://code.visualstudio.com |

**Checkpoint — all four must print a version:**

```bash
java -version
mvn -version
node -v
python --version      # Windows: py --version
```

> If `mvn` isn't found on Windows: set `MAVEN_HOME` to the extracted folder, add
> `%MAVEN_HOME%\bin` to PATH, open a new terminal.

---

## Phase 1 · Open in VS Code (5 min)

```bash
unzip easwari-erp.zip
cd easwari-erp
code .
```

**Open the folder that contains `docker-compose.yml`** — not `backend`, not
`frontend`. The `.vscode` configuration only works from the root.

VS Code will prompt: *"This workspace has extension recommendations."* Click
**Install All**. You need:

| Extension | Why |
|---|---|
| Extension Pack for Java | Compiles, runs and debugs the backend |
| Spring Boot Extension Pack | The Spring Boot Dashboard |
| Python + Pylance | The scoring service |

**Wait for Java to finish importing.** The status bar shows a spinner and
*"Importing Maven project"*. This takes 2–5 minutes the first time — it is
downloading Spring Boot. Do not run anything until it's done.

**Checkpoint:** open `backend/src/main/java/edu/easwari/erp/ErpApplication.java`.
You should see a **Run | Debug** code lens above `public static void main`. If
you don't, the Java import hasn't finished or failed.

---

## Phase 2 · Build the backend — the real test (5 min)

**This is the step that matters most.** I was unable to compile the Java where I
built this, so any compile errors surface here.

```bash
cd backend
mvn clean package -DskipTests
```

**Expected:**
```
[INFO] BUILD SUCCESS
[INFO] Total time: 45.231 s
```

**If you see `BUILD FAILURE`:** copy every line starting with `[ERROR]` and send
them to me. That's what I need to fix them.

**Checkpoint:** `backend/target/erp-1.0.0.jar` exists.

---

## Phase 3 · Install the other two (3 min)

```bash
cd ../ml-service
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cd ../frontend
npm install
```

**Checkpoint:** `npm install` ends with `added NNN packages`. Warnings are fine;
errors are not.

---

## Phase 4 · Start all three, in order (5 min)

Order matters. Use three VS Code terminals (`Ctrl+Shift+\``).

**Terminal 1 — scoring service**
```bash
cd ml-service
source .venv/bin/activate            # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
Wait for: `Application startup complete.`

**Terminal 2 — backend**
```bash
cd backend
mvn spring-boot:run
```

First run seeds the database. **This takes 2–4 minutes.** Watch for:
```
Seeding Easwari Engineering College demonstration data...
Seed complete: 3 departments, 6 sections, 102 students, 64260 attendance records.
Started ErpApplication in 214.7 seconds
```

**Terminal 3 — frontend**
```bash
cd frontend
npm run dev
```
Wait for: `➜  Local:   http://localhost:5173/`

---

## Phase 5 · Smoke test (2 min)

Before touching the UI, confirm the plumbing:

```bash
curl http://localhost:8080/api/health
```
**Must return:** `{"status":"UP","scoringService":"UP"}`

If `scoringService` says `DOWN`, terminal 1 isn't running. The portal will still
work, but the intelligence panels will be hidden.

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"CSE23001","password":"Student@123"}'
```
**Must return** a JSON object with a `token`.

---

## Phase 6 · Functional test (15 min)

Open **http://localhost:5173**

### 6a · Student — `CSE23001` / `Student@123`

| # | Check | Pass looks like |
|---|---|---|
| 1 | Growth Journey loads | Name, CGPA ~7–9, attendance %, credits |
| 2 | Batch reads correctly | **2023 – 2027**, Year 3, Semester 6 |
| 3 | Attendance register | Coloured grid, months Apr–Aug 2026 |
| 4 | Hover a cell | Tooltip: date, period, subject, status |
| 5 | Filter by subject code | Grid narrows to that paper |
| 6 | Switch to **By day** | Grid changes shape, same data |
| 7 | **Export** | `attendance.xlsx` downloads, 3 sheets |
| 8 | Internal Marks | Table with IA1, IA2, grades |
| 9 | Placement | Radar chart + companies, **deadlines Aug–Sep 2026** |
| 10 | Apply to an ineligible company | Blocked, with the specific reason |
| 11 | Learning Path | Recommendations, each with a reason |
| 12 | Roadmap | 4 years, year 3 marked in progress |
| 13 | Campus Services | Raise one → ticket number returned |

### 6b · Faculty — `EEC-CSE001` / `Faculty@123`

| # | Check | Pass looks like |
|---|---|---|
| 14 | Command Centre | Classes with attendance averages |
| 15 | Attendance → pick a **weekday** | Roster appears, everyone Present |
| 16 | Tap a student to **A**, save period | Toast: "N records written" |
| 17 | Switch to **Whole day** | All 7 periods listed |
| 18 | Marks Entry → enter scores → **Save draft** | Toast says students can't see it |
| 19 | Needs Attention | Flagged students with reasons |

> **Weekend warning:** the roster comes from the timetable, which is Mon–Fri.
> On a Saturday you'll see "No classes scheduled that day." Pick a weekday.

### 6c · Admin — `admin` / `Admin@123`

| # | Check | Pass looks like |
|---|---|---|
| 20 | Institution Pulse | 102 students, 18 faculty, two bar charts |
| 21 | Access Management | 121 accounts listed |
| 22 | New account → Programme dropdown | **BE-CSE / BE-ECE / BE-IT** populated |
| 23 | Class dropdown | **Year 3 · Section A / B** |
| 24 | Create `CSE23200` | Toast shows the **temporary password** |
| 25 | Bulk import → Download template | `.xlsx` downloads (tests auth header) |
| 26 | Audit Trail | Your creation is logged, with your username |
| 27 | Revoke access on `CSE23200` | Row turns red, marked Deactivated |

### 6d · The end-to-end loop

| # | Check | Pass looks like |
|---|---|---|
| 28 | Restore `CSE23200`, sign in as them | **Password change screen appears** |
| 29 | Set a new password | Portal opens, CGPA 0.00 |
| 30 | As faculty, mark them absent, publish a mark | Saves |
| 31 | Back as `CSE23200`, refresh | The attendance and mark are there |

**Number 31 passing means the whole system works.**

---

## Phase 7 · Mobile (3 min)

```bash
ipconfig                     # Windows — IPv4 Address
ifconfig | grep "inet "      # macOS/Linux
```

On your phone, same Wi-Fi: `http://192.168.x.x:5173`

Check: bottom tab bar, drawer under "More", register scrolls sideways, crest
visible in the header.

If API calls fail, restart the backend with your address allowed:
```bash
CORS_ORIGINS=http://localhost:5173,http://192.168.1.20:5173 mvn spring-boot:run
```

---

## Reporting back

Tell me:

1. **Which phase you reached**, and the last thing that worked.
2. **The exact error text** — `[ERROR]` lines from Maven, red text from the
   browser console (F12), or the stack trace from the backend terminal.
3. **Which of the 31 checks failed**, by number.

Compile errors in Phase 2 are the ones I most expect. Send them verbatim and
I'll fix them.
