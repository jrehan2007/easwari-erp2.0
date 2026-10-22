# Live demo: bringing one student's record into existence

The most convincing thing you can show a panel is a record being *created* in
front of them — not a dashboard of data that was already there.

This takes about four minutes and uses all three portals.

---

## First, the honest answer about roles

**A faculty member cannot create a student.** That is deliberate, and if the
panel asks, it is the right answer:

> "Provisioning is an administrative function. A lecturer can record what
> happened in their classroom — attendance, marks — but they cannot create
> identities or grant access. Those are separate duties, and the audit trail
> records who did which."

So this demo switches roles. That switching *is* part of the story.

---

## Before you begin

- All three services running, seeded database in place.
- **Pick a weekday.** The attendance roster is built from the timetable, and
  the timetable only has Monday–Friday. On a Saturday you'll get an empty
  screen. If you're demoing on a weekend, use the date field to pick the most
  recent Friday.
- Have three browser tabs, or be ready to sign out and back in.

---

## Step 1 · Admin creates the student (60 seconds)

Sign in as `admin` / `Admin@123` → **Access Management** → **New account**.

| Field | Value |
|---|---|
| Role | Student |
| Username | `CSE23200` |
| Full name | Your relative's name, or the panel chair's |
| Programme | **BE-CSE** — from the dropdown |
| Class | **Year 3 · Section A** — from the dropdown |

> "Programme and class are dropdowns, not free text. A student created into a
> class that doesn't exist would be invisible to every lecturer's roster, so the
> system won't let that happen."

Create it. **The toast shows the temporary password — read it out.**

> "Created with a temporary password and a flag that forces a reset on first
> sign-in. The administrator never knows the password the student ends up with."

Go to **Audit Trail**. The creation is already logged, with your username on it.

---

## Step 2 · Faculty finds them, already there (90 seconds)

Sign out. Sign in as `EEC-CSE001` / `Faculty@123` → **Attendance**.

Class: the CSE Year 3 Section A roster. Date: today, or a recent weekday.

**Scroll to the bottom of the roster. CSE23200 is there.**

> "Nobody added them to this class. They joined a section, and the roster is
> generated from the section — so they appear in every period the timetable
> says this class has."

Now mark the period:

- Everyone defaults to present.
- Tap your new student to **A**.
- Tap two others to **A**, and one to **OD**.
- **Save this period.**

> "Four statuses, not two. On-duty counts as attended for the 75% calculation
> but is stored distinctly, so the register stays honest."

Switch to **Whole day** and save all seven periods at once.

> "Two entry paths over the same storage. One period between hours, or the whole
> day when you're catching up after being away."

---

## Step 3 · Faculty records marks (45 seconds)

**Marks Entry** → class `CS8591 — BE-CSE Y3-A`, assessment IA1, max 30.

Enter a score for your new student — say 24. Enter two or three others.

**Save draft.** Not publish. Draft.

> "That's saved, and no student can see it."

---

## Step 4 · The student signs in (60 seconds)

Sign out. Sign in as `CSE23200` with the temporary password.

**The password change screen appears.** Set a new one — `Demo@2026` works.

> "This is the flag from step one doing its job. Until they set their own
> password, the portal is out of reach."

Now you're in the portal:

- **Growth Journey** — a real profile, CGPA 0.00, no credits yet. *"This is what
  day one looks like."*
- **Attendance** — exactly the periods you marked minutes ago. Filter by subject.
  The absence you tapped is right there.
- **Internal Marks** — **empty.** The mark you entered is not here.

> "That's the publish gate. It's enforced in the database query, not by hiding
> something in the interface."

---

## Step 5 · Close the loop (30 seconds)

Back to faculty. **Marks Entry** → same class and assessment → **Publish to
students**.

Back to the student. Refresh. **The mark is there, with a grade, and the CGPA
has recomputed.**

> "One action by the lecturer, and the student's record updates. That's the whole
> system in one loop: something happens in a classroom, and the student sees the
> consequence while they can still act on it."

---

## What a fresh student's portal looks like

Worth knowing so nothing surprises you:

| Screen | With one day of data |
|---|---|
| Growth Journey | Profile fine. CGPA 0.00, 0 credits. |
| Attendance | Only the periods you marked. Percentages are real but based on a tiny sample. |
| Internal Marks | Empty until you publish. |
| Placement | Companies listed, but **ineligible** — CGPA 0.00 fails every threshold. |
| Learning Path | Sparse. The model has little to read. |
| Roadmap | Full four years. It comes from the programme, not from activity. |

If the panel asks why placement shows nothing available:

> "Because a student with no published results meets no company's CGPA
> threshold, and the check runs on the server. Sign in as CSE23001 — a student
> with a full semester behind them — and the same screen is full."

**Have `CSE23001` ready as the contrast.** New record for the mechanism, seeded
record for the depth.

---

## If something goes wrong

**The new student isn't in the roster.** They were created without a class.
Check Access Management — if the department column is blank, delete and recreate
using the dropdowns.

**The roster is empty.** You've picked a weekend. Change the date.

**"You are not assigned to this class."** `EEC-CSE001` teaches CSE sections. If
you created the student in ECE or IT, sign in as `EEC-ECE007` or `EEC-IT013`.

**Marks won't save.** The score exceeds max marks. The error names the range.

**The student portal looks broken after publishing.** Refresh. There's no live
push; the page fetches on load.

---

## The question to expect

> *"Could a lecturer add a student directly?"*

> "They could, if the college wanted it — the endpoint would move from the admin
> controller to the faculty one. We kept it separate because creating an identity
> and recording a grade are different kinds of authority. The lecturer owns what
> happened in the room. The office owns who is on the roll. And every
> provisioning action is signed and timestamped in the audit trail, which only
> works if the two stay apart."
