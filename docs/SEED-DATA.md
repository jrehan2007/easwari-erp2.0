# Where the data comes from

**There is no data file.** No SQL dump, no JSON fixture, no CSV. Nothing to
import.

The entire institution is generated in Java, in code, the first time you start
the backend — by `backend/src/main/java/edu/easwari/erp/config/DataSeeder.java`.

## Where it ends up

```
backend/data/easwari.mv.db      ← the database. Created on first boot.
backend/data/easwari.trace.db   ← H2's log, if something goes wrong
```

That directory **does not exist in the zip**. It appears when you run the
backend, and it's in `.gitignore` — a generated artefact, not source.

Configured in `application.yml`:

```yaml
datasource:
  url: jdbc:h2:file:./data/easwari;AUTO_SERVER=TRUE;DB_CLOSE_ON_EXIT=FALSE
```

The path is relative to wherever the backend runs, so with `mvn spring-boot:run`
from `backend/`, the file lands in `backend/data/`.

## What gets created

| | Count |
|---|---|
| Departments | 3 — CSE, ECE, IT |
| Programmes | 3 — four-year B.E., 168 credits |
| Class sections | 6 — year 3, semester 6, sections A and B |
| Subjects | 18 — six per department, real Anna University codes |
| Faculty | 18 — six per department |
| Students | 102 — 17 per section |
| Subject offerings | 36 — six per section |
| Timetable slots | 210 — 7 periods × 5 days × 6 sections |
| **Attendance records** | **64,260** |
| Assessments | 72 — IA1 and IA2 per offering |
| Marks | 1,224 |
| Skill scores | 612 — six dimensions per student |
| Companies | 5 |
| Internships | 4 |
| User accounts | 121 |

## The one detail that matters

```java
private static final Random RNG = new Random(20260808L);
```

**A fixed seed.** The randomness is deterministic — every fresh run produces the
identical institution. The same student has the same attendance, the same marks,
the same risk band.

This is not incidental. It means your demo is repeatable, screenshots stay valid,
and if the panel asks you to reset and run it again, they see exactly what you
showed them the first time. Change that number and you get a different but
equally consistent institution.

## How each part is generated

**Students** — names assembled from a first-name and surname pool. Roll numbers
follow the real pattern: `CSE23001`, department code plus batch year plus serial.
Section A gets 001–017, section B gets 051–067.

**Attendance** — the interesting one. Each student is assigned a personal
*diligence factor* between 0.80 and 0.99:

```java
diligence.put(s.getId(), 0.80 + RNG.nextDouble() * 0.19);
```

Then, for every weekday between 6 April and 7 August 2026, for each of the 7
timetabled periods, that student's factor decides the outcome — mostly present,
sometimes absent, occasionally on-duty or medical leave.

That's why the cohort looks real rather than uniform. Some students land near
95%, others drift under 75% and get flagged by the risk model. Nobody's
attendance was hand-written; it emerged from the simulation.

**Marks** — IA1 scores fall between 15 and 30, IA2 between 17 and 30. The higher
floor on the second assessment means scores trend upward across the semester,
which gives the trajectory factor in the risk model something genuine to read.

**Timetable** — a fixed weekly pattern rotating six subjects across 7 periods and
5 days, so no subject clusters on one day.

**Skill scores** — 45 to 95 across six dimensions, feeding the readiness model.

## Resetting

Stop the backend, delete the directory, start again:

```bash
rm -rf backend/data          # Windows: Remove-Item -Recurse -Force backend\data
```

Or in VS Code: `Ctrl+Shift+P` → **Tasks: Run Task** →
`Reset: Delete the seeded database`.

The seeder only runs when the table is empty — it checks `userRepo.count() > 0`
and skips otherwise. So deleting the file is the only way to regenerate.

## Turning it off

For real data, set `app.seed.enabled: false`, or run with the `prod` profile,
which disables seeding and switches `ddl-auto` to `validate`.

```bash
SEED_ENABLED=false mvn spring-boot:run
```

## Inspecting it

With the backend running, open **http://localhost:8080/h2-console**

- JDBC URL: `jdbc:h2:file:./data/easwari`
- User: `sa`, password blank

```sql
SELECT COUNT(*) FROM attendance_records;
SELECT roll_no, name, cgpa FROM students ORDER BY cgpa DESC LIMIT 10;

-- who is short of the 75% line
SELECT s.roll_no, s.name,
       ROUND(100.0 * SUM(CASE WHEN a.status <> 'ABSENT' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct
FROM attendance_records a JOIN students s ON s.id = a.student_id
GROUP BY s.roll_no, s.name HAVING pct < 75 ORDER BY pct;
```
