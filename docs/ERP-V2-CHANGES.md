# Easwari ERP v2: what changed and how to run it

## Sign-in flow (frontend)
1. Crest splash (logo pops in over the LiquidEther background, about 3 s; click or press any key to skip)
2. Choose portal: Student / Faculty / Administrator
3. Sign in
   - Password sign-in for all three roles.
   - **Students also get a "Quick code" tab.** On a device that has signed in before, it shows "Welcome back, <name>" and only asks for the 6 digits (React Bits style CodeSlots). On a new device it also asks for the roll number.
4. First login with the administrator's temporary password: set your own password, then (students) create a 6-digit quick code (enter twice). Skippable; can be changed or removed later in **Settings**.
5. Portal. The dashboard has colourful summary tiles on a plain light background with a soft live LiquidEther flow behind it.

Quick code security: stored as a BCrypt hash, 5 wrong tries lock the code for 15 minutes (password still works), quick code is refused for non-students and for accounts that still have a temporary password.

## Who can do what
- **Administrator**: creates departments, programmes (new screen), class sections, faculty and student accounts (temporary password is shown once), assigns the class coordinator, and (new **Courses & Timetable** screen) adds subjects to a class with teacher and weekly periods, and can change a subject's teacher.
- **Class coordinator (faculty)**: can mark and correct attendance for every period of their class, and enter/publish marks for every subject of their class.
- **Subject faculty**: can mark attendance and enter marks only for their own subject. Other periods are shown view-only.
- **Student**: sees only what faculty have saved/published. Marks stay hidden until published.

## No dummy data
`SEED_MODE=minimal` (default) now creates **only** the `admin / Admin@123` account. Everything else is created through the Admin portal.
To start clean: stop the backend, delete `backend/data/`, start again.

## New backend endpoints
- `POST /api/auth/login-code`, `POST /api/auth/quick-code`, `DELETE /api/auth/quick-code`
- `GET/POST /api/admin/programs`, `GET/POST /api/admin/offerings`, `PATCH /api/admin/offerings/{id}/faculty`
- `GET /api/faculty/classes/{sectionId}/offerings` (each row has `editable`)
- New columns on `users` (quick code hash, failure counter, lock time) are added automatically (`ddl-auto: update`).
- Assessment types `UNIT_TEST` and `GROUP_PRESENTATION` added; the marks screen defaults to IA 50, Unit Test 25, Group Presentation 10.

## Career Hub (student portal, modelled on the CareerOS recording)
Resume Analyzer, GitHub Analyzer, Skill Gap, Courses, Certifications, Projects, Study Assistant.
These run in the browser and keep their data in that browser per student (localStorage); nothing is sent to the server except the GitHub lookup, which calls GitHub's public API.
Limits to know: resume input is pasted text or a .txt file (no PDF/Word reading yet); scores are rule-based, not AI; the Study Assistant summary/quiz is extractive, not generative.

## Run
```
cd backend && rm -rf data && mvn spring-boot:run
cd frontend && npm install && npm run dev
```
