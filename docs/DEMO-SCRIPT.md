# Demonstration script

Ten minutes, three portals. The order matters: it tells a story about one student
rather than touring features.

**Before you start:** all three services running, browser at http://localhost:5173,
and a phone on the same Wi-Fi with `http://<your-ip>:5173` already open.

---

## 1 · Sign-in and roles (1 min)

Show the login screen. Point out that students use a roll number and staff an
employee code — one account table, one login, role decided server-side.

Tap the **Student** chip and sign in.

---

## 2 · Student: the problem surfaces itself (3 min)

**Growth Journey** — the identity strip carries CGPA, attendance and credits.
Below it, an alert names the subject that is below 75%.

> "The student isn't told they're 'at risk'. They're told *Computer Networks is at
> 68%, which blocks the exam*. That's actionable."

**Attendance** — switch **By period** to **By day**, then filter to a single
subject with the chips.

> "One row per student, per period, per date. The day view and subject view are
> both rollups of the same records, so they can never disagree."

Hover a cell to show date, period, subject and status. Then **Export** — a real
`.xlsx` with three sheets.

**Learning Path** — every recommendation carries its reason, and attendance
recovery outranks everything else.

> "The model isn't guessing. Recovering attendance is ranked first because it
> gates the exam regardless of marks."

---

## 3 · Faculty: where the data comes from (3 min)

Sign out. Sign in as **Faculty**.

**Attendance** — pick a class and a weekday. The roster is pre-filled as present,
because on a normal day most students are.

- **One period** — tap two students to absent, save. Note the live counts.
- Switch to **Whole day** — every scheduled period at once, for catching up.

> "Two paths because the real behaviour is different: between hours you mark one
> period; on Friday evening you're clearing a backlog."

Save the same period twice — it updates, it doesn't duplicate. That's a database
constraint, not a check in the UI.

**Marks Entry** — enter a few scores, **Save draft**. Point out that the student
view still shows nothing.

> "Half-entered marks are the classic way these systems embarrass a college.
> Drafts are invisible until published."

Then **Publish** — and note it lands in the audit trail.

**Needs Attention** — flagged students, each with the specific reason.

---

## 4 · Administration: control (2 min)

Sign in as **admin**.

**Institution Pulse** — attendance by department, high-risk counts.

**Access Management**
- **New account** — show that a temporary password is issued and a change is forced.
- **Bulk import** — download the template, mention that a bad row reports its row
  number and reason while the rest still imports.
- **Revoke** an account.

**Audit Trail** — the revoke is already there, with actor and timestamp.

> "Every privileged action is attributable. That's the difference between a project
> and something a college could actually run."

---

## 5 · The phone (1 min)

Hold up the phone showing the same student portal.

> "Same code, no separate app. Bottom bar for thumb reach, tap targets sized for
> fingers, and the register still scrolls horizontally because a register is wide."

---

## Questions you should expect

**"Why not a real database?"**
It is one. H2 is a relational database with real constraints, running embedded so
nothing has to be installed. The unique constraint on *(student, subject, date,
period)* is exactly what a spreadsheet cannot enforce. Moving to PostgreSQL changes
configuration, not code — show the `prod` profile.

**"Is the AI real, or hardcoded?"**
Open http://localhost:8000/docs and post a payload live. Then show `scoring.py` — a
weighted model that returns its contributing factors. Explain the choice: an
unexplainable flag is unusable to a tutor.

**"What if the Python service is down?"**
Stop it. The portal keeps working; intelligence panels report unavailable. Failure
is contained by design.

**"Could a student see another student's marks?"**
No. `StudentController` resolves the student from the token, never a path
parameter. There is no URL to change.

**"How would this scale?"**
Swap the profile for PostgreSQL, and the scoring service scales independently
because it is stateless and holds no database connection.
