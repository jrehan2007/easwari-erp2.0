# Architecture

## Three services, one boundary that matters

```
   Browser  ──HTTP/JWT──▶  Spring Boot  ──HTTP──▶  FastAPI
   (React)                 (owns data)            (owns models)
                                │
                                ▼
                         H2 file  →  PostgreSQL
                         (demo)      (funded stage)
```

**Java owns the data. Python owns the models. Neither reaches into the other's storage.**

The scoring service holds no database connection and stores nothing. Spring Boot
assembles a feature payload and posts it; Python returns a score. That boundary is
what allows the two to be scaled, replaced or retrained independently later, and it
is why the demo still works when the scoring service is switched off — dashboards
render, intelligence panels degrade to "unavailable" rather than erroring.

## Why H2 in file mode

The brief was "Excel-based, no new tools to install." A spreadsheet cannot enforce
a unique constraint on *(student, subject, date, period)*, and without that
constraint the same period gets marked twice and every percentage in the system is
wrong.

H2 in file mode resolves the tension: it is a single `.jar` dependency with a file
on disk, so nothing is installed, but it is a real relational database with real
constraints. Excel remains the interchange format — bulk user import and every
report round-trips through `.xlsx` via Apache POI.

Migration to PostgreSQL touches configuration only:

```yaml
# application.yml — the prod profile changes the connection, not the code
spring:
  config: { activate: { on-profile: prod } }
  datasource:
    url: ${DB_URL}
```

The application talks to Spring Data interfaces throughout; no service knows which
database is behind them.

## Security

One `users` table with a role column, one login endpoint, one JWT. Three separate
authentication systems would have meant three places to get session handling wrong.

Defence is layered, because hiding a menu item is presentation, not security:

1. **Route guards** — `SecurityConfig` maps URL prefixes to roles.
2. **Method guards** — `@PreAuthorize` on every controller.
3. **Ownership checks** — services assert the actor owns the record. `StudentController`
   resolves the student *from the token*, never from a path parameter, so changing a
   URL cannot expose another student's marks. `AttendanceService.resolveFaculty`
   rejects a staff member marking a class they don't teach.
4. **Server-side eligibility** — `PlacementService.apply` re-checks CGPA, attendance
   and branch. Disabling the button in the browser is a courtesy; the rule lives here.

Passwords are BCrypt-hashed. Provisioned accounts carry `mustChangePassword`, so a
shared temporary password cannot persist.

## Attendance: stored once, read three ways

The requirement was period-level detail *and* a per-day view *and* a per-subject
filter. Storing all three would mean three things to keep in sync.

One row per *(student, subject offering, date, period)* is the finest grain any of
those views needs. Day and subject rollups are aggregations over it. The unique
constraint makes re-marking a period an update rather than a duplicate.

OD and medical leave count as attended for the 75% eligibility calculation but are
reported separately — the register stays honest about what actually happened.

## The publish gate

Marks have a `published` flag on the assessment. `MarkRepo.publishedMarks` filters
on it, so a student query cannot return a draft. Faculty save drafts freely; nothing
reaches a student record until they publish, and publication is written to the audit
trail.

## Why the risk model is deliberately simple

`ml-service/app/scoring.py` is a weighted linear model, not a neural network, and it
returns its contributing factors alongside the score.

In an academic setting an unexplainable flag is an unusable flag. A tutor who sees
"high risk" needs to know it is attendance in one paper, not a general judgement
about the student. The weights sit in one dictionary so the college can tune them
against real outcome data later, once such data exists to calibrate against.

The assistant follows the same principle: it computes from the student's own record
and cannot invent a percentage. If it doesn't recognise the question, it says so.
