# API reference

Base URL `http://localhost:8080/api`. All responses are JSON unless noted.

## Authentication

Every endpoint except `/auth/login` and `/health` requires:

```
Authorization: Bearer <token>
```

### `POST /auth/login`
```json
{ "username": "CSE23001", "password": "Student@123" }
```
```json
{ "token": "eyJ...", "username": "CSE23001", "role": "STUDENT",
  "displayName": "Priya Nair", "mustChangePassword": false, "profileId": 1 }
```

| Also | |
|---|---|
| `GET /auth/me` | Current identity |
| `POST /auth/change-password` | `{currentPassword, newPassword}` — min 8 characters |
| `GET /health` | Includes whether the scoring service is reachable |

---

## Student — `/api/student/**`

The student is resolved **from the token**. No endpoint takes a student ID, so
changing a URL cannot reach another student's record.

| Endpoint | Returns |
|---|---|
| `GET /me` | Profile, CGPA, credits, programme duration |
| `GET /attendance?subject=all` | Overall %, per-subject rollup, per-day rollup, raw period cells. `subject` accepts a code such as `CS8591`. |
| `GET /marks` | Published marks only, with computed grade |
| `GET /cms-requests` · `POST /cms-requests` | Campus service tickets |
| `GET /placement/companies` | With `eligible`, `ineligibleReason`, `matchPercentage` |
| `POST /placement/companies/{id}/apply` | **Re-checks eligibility server-side** |
| `GET /placement/readiness` | Six-dimension score with narrative |
| `GET /internships` | Filtered to the student's branch |
| `GET /learning-path` | Ordered recommendations, each with its reason |
| `GET /risk` | Score, band, contributing factors |
| `GET /roadmap` | Years derived from `Program.durationYears` |
| `POST /assistant/chat` | `{message}` → grounded reply |
| `GET /export/attendance.xlsx` · `/export/marks.xlsx` | Excel download |

**Attendance response shape**
```json
{ "overallPercentage": 82, "conducted": 1050, "attended": 861,
  "statusCounts": { "PRESENT": 840, "ABSENT": 189, "OD": 15, "MEDICAL": 6 },
  "subjects": [{ "subjectCode": "CS8591", "conducted": 150, "attended": 102,
                 "percentage": 68, "eligible": false, "periodsCanStillMiss": 0 }],
  "days":     [{ "date": "2026-04-06", "conducted": 7, "attended": 6, "percentage": 86 }],
  "cells":    [{ "date": "2026-04-06", "period": 1, "subjectCode": "CS8591", "status": "PRESENT" }] }
```

---

## Faculty — `/api/faculty/**`

| Endpoint | Purpose |
|---|---|
| `GET /classes` | Assigned classes with average attendance and at-risk counts |
| `GET /classes/{sectionId}/students` | Roster with CGPA and attendance |
| `GET /attention` | Flagged students, ranked, each with reasons |
| `GET /attendance/roster?classSectionId=&date=` | Pre-filled day grid, defaulted to present |
| `POST /attendance/period` | **Path one** — a single period |
| `POST /attendance/day` | **Path two** — the whole day in one submit |
| `POST /marks` | Draft or publish |
| `POST /assistant/chat` | |

**Mark one period**
```json
{ "subjectOfferingId": 3, "date": "2026-08-08", "period": 2,
  "entries": [ { "studentId": 11, "status": "PRESENT" },
               { "studentId": 12, "status": "ABSENT", "remarks": "Informed" } ] }
```

**Mark a whole day**
```json
{ "classSectionId": 1, "date": "2026-08-08",
  "periods": [ { "subjectOfferingId": 3, "period": 1, "entries": [...] },
               { "subjectOfferingId": 5, "period": 2, "entries": [...] } ] }
```

Re-posting the same slot **updates** rather than duplicating — the unique constraint
on *(student, offering, date, period)* guarantees it.

**Marks with the publish gate**
```json
{ "subjectOfferingId": 3, "type": "IA1", "maxMarks": 30,
  "scores": [ { "studentId": 11, "score": 27 } ],
  "publish": false }
```
`publish: false` saves a draft invisible to students. `true` publishes, recomputes
CGPA for the section, and writes to the audit trail.

---

## Administration — `/api/admin/**`

| Endpoint | Purpose |
|---|---|
| `GET /dashboard` | Counts, attendance by department, risk distribution |
| `GET /users?role=` | `ALL`, `STUDENT`, `FACULTY`, `ADMIN` |
| `POST /users` | Provision one account |
| `PATCH /users/{id}/access?active=` | Grant or revoke sign-in |
| `POST /users/{id}/reset-password` | Returns a one-time temporary password |
| `POST /users/bulk-import` | `multipart/form-data`, field `file`, `.xlsx` |
| `GET /users/import-template.xlsx` | Blank template with the expected columns |
| `GET /audit` | Most recent 200 privileged actions |
| `GET /cms-requests` · `PATCH /cms-requests/{id}?status=&note=` | Service queue |

**Bulk import columns**

`username · name · role · email · phone · departmentCode · programCode · section · year · semester · staffCode · designation`

Returns `{ created, skipped, errors[] }`. A bad row is reported with its row number
and reason; the rest of the file still imports.

---

## Scoring service — `http://localhost:8000`

Called by Spring Boot, not the browser. Interactive docs at `/docs`.

| Endpoint | Returns |
|---|---|
| `POST /risk-score` | `{risk_score, band, factors[], headline}` |
| `POST /placement-readiness` | `{overall, skills{}, weakest_skill, narrative}` |
| `POST /recommendations` | `{recommendations[]}` each with `reason` and `priority` |
| `POST /chat` | `{reply, suggestions[], intent}` |
| `GET /health` | |

---

## Errors

```json
{ "status": 403, "message": "You don't meet the criteria: CGPA 6.40 is below the required 7.5",
  "timestamp": "2026-08-08T09:14:22Z" }
```

Messages are written for the person reading them. Stack traces never reach the browser.

| Code | Meaning |
|---|---|
| 400 | Validation failed — the message names the field |
| 401 | Missing, expired or invalid token |
| 403 | Authenticated, but not permitted (wrong role, not your class, not eligible) |
| 404 | No such record |
| 409 | Conflict — duplicate username, or already applied |
