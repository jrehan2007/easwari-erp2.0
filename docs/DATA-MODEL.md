# Data model

17 entities. The design turns on one join — `SubjectOffering` — which is what makes
attendance and marks meaningful rather than ambiguous.

## The central join

```
Subject ──┐
          ├──▶ SubjectOffering ◀── Faculty
ClassSection ─┘        │
                       ├──▶ TimetableSlot     (when it meets)
                       ├──▶ AttendanceRecord  (who was there)
                       └──▶ Assessment ──▶ Mark
```

`SubjectOffering` = *this subject, taught to this section, by this member of staff,
in this academic year.* Attendance hangs off the offering, not the subject, because
"Computer Networks attendance" is meaningless until you know which section and which
lecturer.

## Identity and organisation

| Entity | Purpose | Notes |
|---|---|---|
| `User` | Login account | One table for all three roles. `username` is identifier-agnostic: roll number for students, employee code for staff. |
| `Department` | CSE, ECE, IT | |
| `Program` | B.E. CSE etc. | `durationYears` is a **field**, not a constant — a 3- or 5-year programme needs no code change. |
| `Student` | Enrolment record | `cgpa` and `creditsEarned` are cached rollups, recomputed on mark publication. |
| `Faculty` | Staff record | |
| `ClassSection` | A cohort: CSE Y3-A, sem 6, AY 2025-26 | |
| `Subject` | Catalogue entry | |

## Activity

| Entity | Purpose | Notes |
|---|---|---|
| `TimetableSlot` | Weekly recurring slot | `dayOfWeek` follows `java.time.DayOfWeek` (1 = Monday). Generates the faculty marking grid. |
| `AttendanceRecord` | One row per student × offering × date × period | Unique constraint `uk_attendance_slot` prevents double-marking. |
| `Assessment` | IA1, IA2, assignment, model exam | Carries the `published` flag — the gate. |
| `Mark` | One score | `score` nullable: null means not yet entered, distinct from zero. |

## Services and outcomes

| Entity | Purpose |
|---|---|
| `CmsRequest` | Fee, hostel, transport, ID card, exam cell, library requests |
| `Company` | Recruiter, with eligibility stored **as data** so the placement cell can change thresholds without a release |
| `PlacementApplication` | Student ↔ company, unique per pair |
| `Internship` | Openings, filtered by branch |
| `SkillScore` | Mock interview and aptitude results the model can't derive from marks |
| `AuditLog` | Who granted what, and when |

## Enumerations

```java
Role              ADMIN · FACULTY · STUDENT
AttendanceStatus  PRESENT · ABSENT · OD · MEDICAL   // countsAsAttended() excludes ABSENT only
AssessmentType    IA1 · IA2 · ASSIGNMENT · MODEL_EXAM
RequestStatus     OPEN · IN_PROGRESS · RESOLVED · REJECTED
ApplicationStatus APPLIED · SHORTLISTED · REJECTED · OFFERED · WITHDRAWN
```

## Seeded demonstration data

`DataSeeder` runs once on an empty database, with a fixed RNG seed (`20260808L`) so
every run produces the same institution and screenshots stay valid.

- 3 departments, 3 programmes, 6 sections
- ~102 students, 18 faculty, 18 subjects
- 35 timetable slots per section (7 periods × 5 days)
- 64,260 period-level attendance records (6 April – 7 August 2026, weekdays)
- Published IA1 and IA2 for every offering, with IA2 trending slightly higher
- 5 companies, 4 internships, 6 skill scores per student
