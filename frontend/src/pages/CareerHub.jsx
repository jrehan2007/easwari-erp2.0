import React, { useMemo, useRef, useState } from "react";
import {
  FileText, Github, Target, GraduationCap, Award, FolderGit2, Headphones, Download, RefreshCw, Check,
  ExternalLink, Upload, Trash2, Search, Play, Square, Settings as SettingsIcon, Hash, AlertTriangle, Star,
} from "lucide-react";
// The Career Hub has its own black-and-gold palette; Shell provides the same palette to shared components.
import { careerTheme as t, FONT_D, FONT_M } from "../lib/theme";
import { Card, Badge, Button, SectionHead, Progress, EmptyState, Field, Spinner } from "../components/Shared";
import { useStore } from "../lib/store";
import { ROLES, COURSES, COURSE_CATS, PROJECTS } from "../lib/careerData";
import { resumeReport, recommendRoles, matchSkills, analyzeGithub, summarize, keyTerms, makeQuiz } from "../lib/analyze";
import { readPdf } from "../lib/pdf";
import { api } from "../lib/api";

const input = { width: "100%", padding: "11px 13px", borderRadius: 9, background: t.surface, border: `1px solid ${t.border}`,
  fontSize: 13.5, minHeight: 44, color: t.text, fontFamily: "inherit" };
const scoreColor = (n) => (n >= 75 ? t.success : n >= 50 ? t.warning : t.danger);

function Ring({ value, size = 96 }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} role="img" aria-label={`Score ${value} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.border} strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(value)} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT_M, fontWeight: 800, fontSize: size * 0.28, fill: t.text }}>{value}</text>
    </svg>
  );
}
const Bar = ({ label, value }) => (
  <div style={{ padding: "12px 14px", borderRadius: 11, background: t.card, border: `1px solid ${t.border}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
      <span>{label}</span><span style={{ fontFamily: FONT_M, color: scoreColor(value) }}>{value}%</span>
    </div>
    <Progress pct={value} color={scoreColor(value)} />
  </div>
);
const Title = ({ children, sub }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontFamily: FONT_M, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: t.primary }}>Career Hub</div>
    <h2 style={{ fontFamily: FONT_D, fontSize: 30, margin: "6px 0 0", color: t.text, letterSpacing: "-0.01em" }}>{children}</h2>
    <div style={{ width: 56, height: 2, background: `linear-gradient(90deg, ${t.primary}, transparent)`, margin: "10px 0 8px" }} />
    {sub && <div style={{ fontSize: 13, color: t.textDim, maxWidth: 720, lineHeight: 1.55 }}>{sub}</div>}
  </div>
);
const RoleSelect = ({ value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Target role" style={{ ...input, width: "auto", minWidth: 220 }}>
    {ROLES.map((r) => <option key={r.key} value={r.key}>{r.title}</option>)}
  </select>
);
const readText = (file) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result)); f.onerror = rej; f.readAsText(file); });
function saveText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

/* ───────────────────────── Career Hub home ───────────────────────── */
const BLURBS = {
  resume: "Upload your resume PDF for a score, strengths, gaps and an internship and placement verdict.",
  github: "See your public GitHub profile the way a recruiter reads it.",
  skillgap: "Compare your skills with a target role and get a learning list.",
  courses: "Curated free courses, organised by track.",
  certs: "Keep certifications and achievements in one record.",
  projects: "Project blueprints that make a resume stand out.",
  study: "Summaries, key terms and quick quizzes from your notes.",
};

/** Reads another tool's saved state for this student without subscribing to it. */
function peek(username, name, fallback) {
  try { const raw = localStorage.getItem(`erp.career.${username}.${name}`); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

export function CareerHome({ nav, setActive, session }) {
  const tools = nav.filter((n) => n.group === "Career Hub" && n.key !== "careerhub");
  const [openings, setOpenings] = useState(null);
  React.useEffect(() => { api.studentInternships().then(setOpenings).catch(() => setOpenings([])); }, []);

  // Progress from what the student has already done in each tool (saved on this device).
  const progress = useMemo(() => {
    const u = session.username;
    const resume = peek(u, "resume", {});
    const role = ROLES.find((r) => r.key === (peek(u, "target", {}).role || resume.role)) || ROLES[0];
    const resumeScore = resume.analysed && (resume.text?.trim() || resume.meta) ? resumeReport(resume.text || "", role, resume.meta).score : null;
    const skillMatch = resume.text?.trim() ? matchSkills(resume.text, role).pct : null;
    const github = peek(u, "github", {}).score ?? null;
    const certs = (peek(u, "certs", []) || []).length;
    const projects = Object.values(peek(u, "projects", {}) || {}).filter(Boolean).length;
    const courses = Object.values(peek(u, "courses", {}) || {}).filter(Boolean).length;
    const readiness = Math.round((resumeScore || 0) * 0.35 + (github || 0) * 0.2 + (skillMatch || 0) * 0.2
      + Math.min(certs, 3) / 3 * 100 * 0.1 + Math.min(projects, 2) / 2 * 100 * 0.15);
    const steps = [
      { key: "resume", title: "Build a strong resume", detail: resumeScore == null ? "Not analysed yet" : `Score ${resumeScore}/100`, done: resumeScore >= 70 },
      { key: "github", title: "Showcase your code", detail: github == null ? "GitHub not analysed" : `GitHub score ${github}/100`, done: github >= 60 },
      { key: "skillgap", title: `Close skill gaps · ${role.title}`, detail: skillMatch == null ? "Upload a resume first" : `${skillMatch}% of key skills`, done: skillMatch >= 70 },
      { key: "certs", title: "Earn certifications", detail: `${certs} recorded${courses ? ` · ${courses} course${courses > 1 ? "s" : ""} done` : ""}`, done: certs >= 2 },
      { key: "projects", title: "Ship real projects", detail: `${projects} built`, done: projects >= 2 },
    ];
    return { readiness, steps, role };
  }, [session.username]);
  const doneCount = progress.steps.filter((s) => s.done).length;
  const next = progress.steps.find((s) => !s.done);
  const level = progress.readiness >= 75 ? "Placement ready" : progress.readiness >= 50 ? "Internship ready" : progress.readiness >= 25 ? "Building momentum" : "Getting started";

  const eyebrow = { fontFamily: FONT_M, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: t.primary };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: "28px 28px 26px",
        background: "radial-gradient(120% 140% at 100% 0%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.04) 45%, transparent 70%), linear-gradient(160deg, #17150f 0%, #0d0d0e 60%)",
        border: `1px solid ${t.borderGold}`, boxShadow: t.shadowLg }}>
        <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={eyebrow}>Career Hub · Training & Placement</div>
            <h1 style={{ fontFamily: FONT_D, fontSize: 34, lineHeight: 1.12, margin: "10px 0 10px", color: t.text, letterSpacing: "-0.015em" }}>
              Become placement ready,<br /><span style={{ color: t.primary }}>one step at a time.</span>
            </h1>
            <p style={{ fontSize: 13.5, color: t.textDim, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
              Tools to sharpen your resume, prove your skills and plan your learning, all in one place.
              Your progress is saved on this device and only you can see it.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <Button icon={FileText} onClick={() => setActive(next?.key || "resume")}>{next ? `Next: ${next.title}` : "Review your resume"}</Button>
              <Button variant="ghost" icon={Github} onClick={() => setActive("github")}>Analyze GitHub</Button>
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "6px 10px" }}>
            <Ring value={progress.readiness} size={138} />
            <div style={{ fontFamily: FONT_D, fontSize: 16, fontWeight: 700, color: t.text, marginTop: 8 }}>{level}</div>
            <div style={{ fontSize: 11.5, color: t.textFaint }}>Career readiness · {doneCount}/5 milestones</div>
          </div>
        </div>
      </div>

      {/* Path */}
      <Card lift={false} style={{ padding: 20 }}>
        <SectionHead icon={Target} title="Your path to placement" sub="Five milestones recruiters look for. Each one opens the tool that gets you there." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {progress.steps.map((s, i) => (
            <button key={s.key} onClick={() => setActive(s.key)} className="sv-btn sv-lift" style={{ textAlign: "left", cursor: "pointer",
              padding: "14px 14px 13px", borderRadius: 14, background: s.done ? "rgba(212,175,55,0.10)" : t.surface,
              border: `1px solid ${s.done ? t.borderGold : t.border}`, color: t.text, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONT_M, fontSize: 12, fontWeight: 800, background: s.done ? t.primary : "transparent",
                  color: s.done ? t.onPrimary : t.primary, border: `1.5px solid ${t.primary}` }}>{s.done ? <Check size={14} /> : i + 1}</span>
                <span style={{ fontFamily: FONT_M, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: s.done ? t.primary : t.textFaint }}>
                  {s.done ? "Complete" : "To do"}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 4 }}>{s.detail}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Tools */}
      <div>
        <div style={{ ...eyebrow, marginBottom: 10 }}>Tools</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {tools.map((tool) => (
            <button key={tool.key} onClick={() => setActive(tool.key)} className="sv-btn sv-lift"
              style={{ textAlign: "left", padding: 20, borderRadius: 16, cursor: "pointer", background: t.card, color: t.text,
                border: `1px solid ${t.border}`, boxShadow: t.shadowMd, minHeight: 156, display: "flex", flexDirection: "column" }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(140deg, #E8C766, #B8901F)", color: "#111", marginBottom: 14 }}><tool.icon size={20} /></span>
              <div style={{ fontFamily: FONT_D, fontSize: 18, fontWeight: 700 }}>{tool.label}</div>
              <div style={{ fontSize: 12.5, color: t.textDim, marginTop: 6, lineHeight: 1.55, flex: 1 }}>{BLURBS[tool.key]}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.primary, marginTop: 12 }}>Open →</div>
            </button>
          ))}
        </div>
      </div>

      {/* Openings */}
      <Card lift={false} style={{ padding: 20 }}>
        <SectionHead icon={Star} title="Open internships for you" sub="Live from the Training & Placement cell, filtered to your department."
          right={<Button size="sm" variant="ghost" onClick={() => setActive("internships")}>View all</Button>} />
        {openings == null ? <Spinner /> : !openings.length ? (
          <div style={{ fontSize: 12.5, color: t.textDim }}>No openings for your department right now.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
            {openings.slice(0, 3).map((o) => (
              <div key={o.id} style={{ padding: "14px 15px", borderRadius: 13, background: t.surface, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, color: t.primary, fontWeight: 700 }}>{o.organisation}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{o.title}</div>
                <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 6 }}>{o.duration} · {o.stipend} · {o.mode}</div>
                <div style={{ fontSize: 11, color: o.daysLeft <= 7 ? t.warning : t.textFaint, marginTop: 6 }}>
                  {o.daysLeft >= 0 ? `Apply within ${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"}` : "Closed"}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ───────────────────────── Resume Analyzer ───────────────────────── */
export function ResumeAnalyzer({ session, push }) {
  const [state, setState, storeErr] = useStore(session.username, "resume", { text: "", role: "fullstack", analysed: false, meta: null });
  const role = ROLES.find((r) => r.key === state.role) || ROLES[0];
  // An uploaded PDF always gets a report, even with no text: the report is what explains a scanned file.
  const result = useMemo(() => (state.analysed && (state.text.trim() || state.meta) ? resumeReport(state.text, role, state.meta) : null), [state, role]);
  const recs = useMemo(() => (state.text.trim() ? recommendRoles(state.text).slice(0, 3) : []), [state.text]);
  const fileRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  async function onFile(f) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
      push({ title: "Upload a PDF", body: "Choose your resume as a .pdf file.", tone: "warning" }); return;
    }
    if (f.size > 10 * 1024 * 1024) { push({ title: "File too large", body: "Use a PDF under 10 MB.", tone: "warning" }); return; }
    setReading(true);
    try {
      const { text, meta } = await readPdf(f);
      setState({ ...state, text, meta, analysed: true });
      if (meta.chars < 50) push({ title: "No text found", body: "This PDF looks like a scanned image. The report explains how to fix it.", tone: "warning" });
    } catch (e) {
      push({ title: "Couldn't read that PDF", body: e?.name === "PasswordException" ? "The PDF is password-protected. Remove the password and try again." : "The file may be damaged. Export it again and retry.", tone: "danger" });
    } finally { setReading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const report = () => result && saveText("resume-report.txt",
    `Resume report (${role.title})${state.meta ? ` · ${state.meta.fileName}` : ""}\nScore: ${result.score}/100\n` +
    `Internship: ${result.internship.ready ? "Ready" : "Not yet — " + result.internship.reasons.join("; ")}\n` +
    `Placement: ${result.placement.ready ? "Ready" : "Not yet — " + result.placement.reasons.join("; ")}\n\n` +
    `Pros:\n- ${result.pros.join("\n- ")}\n\nCons:\n- ${result.cons.join("\n- ") || "none"}\n\nUpgrade plan:\n- ${result.upgrades.join("\n- ")}\n\n` +
    `ATS ${result.ats}% · Content ${result.content}% · Formatting ${result.format}% · Keywords ${result.keywords}%\n`);

  const Verdict = ({ label, v }) => (
    <div style={{ flex: 1, minWidth: 220, padding: "13px 15px", borderRadius: 12, border: `1.5px solid ${v.ready ? t.success : t.danger}`,
      background: v.ready ? t.successSoft : t.dangerSoft }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 13.5, color: v.ready ? t.success : t.danger }}>
        {v.ready ? <Check size={16} /> : <AlertTriangle size={16} />} {label}: {v.ready ? "Ready" : "Not yet"}
      </div>
      <div style={{ fontSize: 12, color: t.textDim, marginTop: 5, lineHeight: 1.5 }}>
        {v.ready ? "This resume meets the bar recruiters usually apply." : `Fix: ${v.reasons.join("; ")}.`}
      </div>
    </div>
  );
  const List = ({ icon: Icon, title, items, tone, empty }) => (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={Icon} title={`${title} (${items.length})`} />
      {items.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.75, color: tone }}>
          {items.map((x) => <li key={x}><span style={{ color: t.text }}>{x}</span></li>)}
        </ul>
      ) : <div style={{ fontSize: 12.5, color: t.textDim }}>{empty}</div>}
    </Card>
  );

  return (
    <div>
      <Title sub="Upload your resume as a PDF. It is read in your browser and never uploaded.">Resume Analyzer</Title>
      <Card lift={false} style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: t.textDim }}>Target role</span>
          <RoleSelect value={state.role} onChange={(v) => setState({ ...state, role: v })} />
        </div>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => onFile(e.target.files?.[0])} hidden aria-label="Resume PDF" />
        <div role="button" tabIndex={0} onClick={() => !reading && fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
          style={{ border: `2px dashed ${drag ? t.primary : t.border}`, borderRadius: 14, padding: "26px 18px", textAlign: "center",
            cursor: reading ? "wait" : "pointer", background: drag ? t.primarySoft : "rgba(212,175,55,0.035)" }}>
          {reading ? <><Spinner size={22} /><div style={{ fontSize: 13, marginTop: 10 }}>Reading your PDF…</div></> : (
            <>
              <Upload size={26} color={t.primary} />
              <div style={{ fontFamily: FONT_D, fontSize: 17, fontWeight: 700, marginTop: 8 }}>
                {state.meta ? "Upload a new version" : "Drop your resume PDF here"}</div>
              <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>or click to choose a file · PDF only</div>
              {state.meta && (
                <div style={{ marginTop: 12, display: "inline-flex", gap: 8, alignItems: "center", padding: "6px 11px", borderRadius: 9,
                  background: t.surface, border: `1px solid ${t.border}`, fontSize: 12 }}>
                  <FileText size={14} color={t.primary} /> <strong>{state.meta.fileName}</strong>
                  <span style={{ color: t.textDim }}>· {state.meta.pages} page{state.meta.pages > 1 ? "s" : ""} · {state.meta.sizeKB} KB</span>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {result && <Button variant="ghost" icon={Download} onClick={report}>Download report</Button>}
          <button className="sv-btn" onClick={() => setPasteOpen(!pasteOpen)} style={{ background: "none", border: "none", color: t.primary,
            fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            {pasteOpen ? "Hide text box" : "No PDF? Paste the text instead"}</button>
          {storeErr && <span style={{ fontSize: 11.5, color: t.danger }}>{storeErr}</span>}
        </div>
        {pasteOpen && (
          <div style={{ marginTop: 12 }}>
            <textarea value={state.text} onChange={(e) => setState({ ...state, text: e.target.value, meta: null, analysed: false })} rows={9}
              aria-label="Resume text" placeholder="Paste your resume: contact line, summary, education, projects, skills, certifications…"
              style={{ ...input, resize: "vertical", fontFamily: FONT_M, fontSize: 12.5, lineHeight: 1.5 }} />
            <div style={{ marginTop: 10 }}>
              <Button icon={RefreshCw} disabled={!state.text.trim()} onClick={() => setState({ ...state, analysed: true })}>Analyze text</Button>
            </div>
          </div>
        )}
      </Card>

      {!result ? <Card lift={false} style={{ padding: 8 }}><EmptyState icon={FileText} title="No analysis yet"
        body="Upload your resume PDF. The score, pros, cons and an upgrade plan appear here." /></Card> : (
        <>
          <Card lift={false} style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
              <Ring value={result.score} size={116} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, color: t.textDim }}>Resume score for <strong>{role.title}</strong></div>
                <div style={{ fontFamily: FONT_D, fontSize: 24, fontWeight: 700 }}>
                  {result.score >= 75 ? "Strong resume" : result.score >= 55 ? "Good base, a few gaps" : "Needs work before applying"}
                </div>
                <div style={{ fontSize: 12.5, color: t.textDim, marginTop: 4 }}>
                  {result.words} words{state.meta ? ` · ${state.meta.pages} page${state.meta.pages > 1 ? "s" : ""}` : ""} · role match {result.keywords}%
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: t.textFaint }}>Best-fit roles:</span>
                  {recs.map((r) => <Badge key={r.role.key} tone="primary">{r.role.title} {r.pct}%</Badge>)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              <Verdict label="Internships" v={result.internship} />
              <Verdict label="Placements" v={result.placement} />
            </div>
          </Card>
          <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Bar label="ATS compatibility" value={result.ats} /><Bar label="Content quality" value={result.content} />
            <Bar label="Formatting" value={result.format} /><Bar label="Keyword optimisation" value={result.keywords} />
          </div>
          <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <List icon={Check} title="Pros" items={result.pros} tone={t.success} empty="Nothing stands out yet." />
            <List icon={AlertTriangle} title="Cons" items={result.cons} tone={t.danger} empty="No major problems found." />
          </div>
          <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <List icon={Star} title="Upgrade plan" items={result.upgrades} tone={t.gold} empty="Keep it updated as you add projects." />
            <Card lift={false} style={{ padding: 18 }}>
              <SectionHead icon={Target} title={`Skills for ${role.title}`} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.found.map((s) => <Badge key={s} tone="success">✓ {s}</Badge>)}
                {result.missing.map((s) => <Badge key={s} tone="danger" style={{ borderStyle: "dashed" }}>✗ {s}</Badge>)}
              </div>
              {/* Marked with symbols, not colour alone: the Career Hub is shown in black and white. */}
              <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 10 }}>✓ found in your resume · ✗ worth learning and adding</div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── GitHub Analyzer ───────────────────────── */
export function GithubAnalyzer({ session }) {
  const [saved, setSaved] = useStore(session.username, "github", { username: "" });
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    const u = saved.username.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "");
    if (!u) { setError("Enter a GitHub username."); return; }
    setBusy(true); setError(null); setData(null);
    try {
      const [ur, rr] = await Promise.all([fetch(`https://api.github.com/users/${encodeURIComponent(u)}`),
        fetch(`https://api.github.com/users/${encodeURIComponent(u)}/repos?per_page=100&sort=pushed`)]);
      if (ur.status === 404) throw new Error(`No GitHub user called "${u}".`);
      if (ur.status === 403 || rr.status === 403) throw new Error("GitHub's free request limit was reached. Try again in an hour.");
      if (!ur.ok || !rr.ok) throw new Error("GitHub could not be reached right now.");
      const user = await ur.json(), repos = await rr.json();
      const result = analyzeGithub(user, repos);
      setData({ user, ...result });
      setSaved({ ...saved, username: u, score: result.score, analysedAt: Date.now() });   // feeds the Career Hub readiness score
    } catch (e) { setError(e.message || "Could not reach GitHub."); } finally { setBusy(false); }
  }

  return (
    <div>
      <Title sub="Reads your public profile and repositories from GitHub and scores how a recruiter would see them.">GitHub Analyzer</Title>
      <Card lift={false} style={{ padding: 22, marginBottom: 16, textAlign: "center" }}>
        <Github size={34} color={t.primary} />
        <div style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 700, margin: "8px 0 14px" }}>Analyze your GitHub profile</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <input value={saved.username} onChange={(e) => setSaved({ username: e.target.value })} aria-label="GitHub username"
            onKeyDown={(e) => e.key === "Enter" && run()} placeholder="github username" style={{ ...input, maxWidth: 300 }} />
          <Button onClick={run} disabled={busy}>{busy ? <Spinner size={14} color={t.onPrimary} /> : "Analyze GitHub"}</Button>
        </div>
        {error && <div role="alert" style={{ color: t.danger, fontSize: 12.5, marginTop: 12 }}>{error}</div>}
      </Card>
      {data && (
        <>
          <Card lift={false} style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <img src={data.user.avatar_url} alt="" width={72} height={72} style={{ borderRadius: "50%" }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: FONT_D, fontSize: 22, fontWeight: 700 }}>{data.user.name || data.user.login}</div>
                <div style={{ fontSize: 12, color: t.textDim }}>@{data.user.login} · {data.user.bio || "No bio yet"}</div>
                <a href={data.user.html_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: t.primary }}>View GitHub profile <ExternalLink size={11} /></a>
              </div>
              <Ring value={data.score} />
            </div>
            <div style={{ display: "flex", gap: 22, marginTop: 16, flexWrap: "wrap" }}>
              {[["Original repos", data.original], ["Forked", data.forked], ["Stars earned", data.stars], ["Forks earned", data.forks],
                ["Active (90 days)", data.recent], ["Followers", data.user.followers]].map(([l, v]) => (
                <div key={l}><div style={{ fontFamily: FONT_M, fontSize: 22, fontWeight: 700 }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: t.textFaint, textTransform: "uppercase", letterSpacing: ".08em" }}>{l}</div></div>
              ))}
            </div>
          </Card>
          <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card lift={false} style={{ padding: 18 }}>
              <SectionHead icon={Check} title="Profile checklist" />
              {data.checks.map(([label, ok]) => (
                <div key={label} style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "5px 0", color: ok ? t.text : t.textDim }}>
                  <span style={{ color: ok ? t.success : t.danger, fontWeight: 800 }}>{ok ? "✓" : "✗"}</span>{label}
                </div>
              ))}
            </Card>
            <Card lift={false} style={{ padding: 18 }}>
              <SectionHead icon={Star} title="Languages and top repositories" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {data.langList.map(([l, n]) => <Badge key={l} tone="gold">{l} · {n}</Badge>)}
                {!data.langList.length && <span style={{ fontSize: 12, color: t.textDim }}>No languages detected.</span>}
              </div>
              {data.top.map((r) => (
                <div key={r.id} style={{ padding: "7px 0", borderTop: `1px solid ${t.border}`, fontSize: 12.5 }}>
                  <a href={r.html_url} target="_blank" rel="noreferrer" style={{ color: t.primary, fontWeight: 700 }}>{r.name}</a>
                  <span style={{ color: t.textFaint }}> · ★ {r.stargazers_count} · {r.language || "n/a"}</span>
                  <div style={{ color: t.textDim, fontSize: 11.5 }}>{r.description || "No description. Add one."}</div>
                </div>
              ))}
            </Card>
          </div>
          {data.tips.length > 0 && <Card lift={false} style={{ padding: 18, marginTop: 16 }}>
            <SectionHead icon={AlertTriangle} title="How to improve" />
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7 }}>{data.tips.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Skill Gap ───────────────────────── */
export function SkillGap({ session, setActive }) {
  const [resume] = useStore(session.username, "resume", { text: "", role: "fullstack" });
  const [target, setTarget] = useStore(session.username, "target", { role: resume.role || "fullstack" });
  const role = ROLES.find((r) => r.key === target.role) || ROLES[0];
  const gap = useMemo(() => matchSkills(resume.text || "", role), [resume.text, role]);
  const learn = COURSES.filter((c) => c.skills.some((s) => gap.missing.includes(s)));
  return (
    <div>
      <Title sub="Compares the skills in your saved resume with what the target role expects.">Skill Gap Analysis</Title>
      <Card lift={false} style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: t.textDim }}>Target career</span>
          <RoleSelect value={target.role} onChange={(v) => setTarget({ role: v })} />
          <Badge tone={gap.pct >= 70 ? "success" : gap.pct >= 40 ? "warning" : "danger"}>{gap.pct}% of the skills covered</Badge>
        </div>
      </Card>
      {!resume.text?.trim() ? (
        <Card lift={false} style={{ padding: 8 }}><EmptyState icon={Target} title="Add your resume first"
          body="The gap is measured against the resume you analyse." action={<Button onClick={() => setActive("resume")}>Open Resume Analyzer</Button>} /></Card>
      ) : (
        <>
          <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Card lift={false} style={{ padding: 18 }}><SectionHead icon={Check} title="Current skills" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{gap.found.map((s) => <Badge key={s} tone="success">{s}</Badge>)}
                {!gap.found.length && <span style={{ fontSize: 12, color: t.textDim }}>None of this role's skills were found in the resume.</span>}</div></Card>
            <Card lift={false} style={{ padding: 18 }}><SectionHead icon={Target} title="Skills to develop" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{gap.missing.map((s) => <Badge key={s} tone="danger">{s}</Badge>)}
                {!gap.missing.length && <span style={{ fontSize: 12, color: t.textDim }}>No gaps found.</span>}</div></Card>
          </div>
          <Card lift={false} style={{ padding: 18 }}>
            <SectionHead icon={GraduationCap} title="Recommended learning, in order" sub="Free courses that cover your missing skills." />
            {!learn.length ? <div style={{ fontSize: 12.5, color: t.textDim }}>Nothing to recommend.</div> : learn.map((c, i) => (
              <div key={c.id} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${t.border}` : "none", alignItems: "center" }}>
                <span style={{ fontFamily: FONT_M, fontWeight: 800, color: t.gold, width: 22 }}>{i + 1}</span>
                <div style={{ flex: 1 }}><a href={c.url} target="_blank" rel="noreferrer" style={{ color: t.primary, fontWeight: 700, fontSize: 13 }}>{c.title}</a>
                  <div style={{ fontSize: 11.5, color: t.textDim }}>{c.by} · covers {c.skills.filter((s) => gap.missing.includes(s)).join(", ")}</div></div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Courses ───────────────────────── */
export function CareerCourses({ session }) {
  const [done, setDone] = useStore(session.username, "courses", {});
  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const list = COURSES.filter((c) => (tab === "all" || (tab === "cert" ? c.certificate : !c.certificate))
    && (cat === "All" || c.cat === cat) && (`${c.title} ${c.skills.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  const completed = COURSES.filter((c) => done[c.id]).length;
  const chip = (on) => ({ padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: 36,
    background: on ? t.primary : t.surface, color: on ? t.onPrimary : t.textDim, border: `1px solid ${on ? t.primary : t.border}` });
  return (
    <div>
      <Title sub="Real, free courses. Open one, learn, then tick it off to track your progress.">Courses</Title>
      <Card lift={false} style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
          <strong>Overall course completion</strong><span style={{ fontFamily: FONT_M }}>{completed} / {COURSES.length} ({Math.round(completed / COURSES.length * 100)}%)</span>
        </div>
        <Progress pct={(completed / COURSES.length) * 100} />
      </Card>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {[["all", "All"], ["cert", "With certificate"], ["learn", "Learn only"]].map(([k, l]) => <button key={k} className="sv-btn" style={chip(tab === k)} onClick={() => setTab(k)}>{l}</button>)}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: 15, color: t.textFaint }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by skill, topic or title" aria-label="Search courses" style={{ ...input, paddingLeft: 32 }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>{COURSE_CATS.map((c) => <button key={c} className="sv-btn" style={chip(cat === c)} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {list.map((c) => (
          <Card key={c.id} lift={false} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge tone="success">Free</Badge>{c.certificate && <Badge tone="gold">Certificate</Badge>}<Badge tone="primary">{c.cat}</Badge></div>
            <div style={{ fontFamily: FONT_D, fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}>{c.title}</div>
            <div style={{ fontSize: 11.5, color: t.textDim }}>{c.by} · {c.skills.join(", ")}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
              <a href={c.url} target="_blank" rel="noreferrer" style={{ color: t.primary, fontSize: 12.5, fontWeight: 700 }}>Open course <ExternalLink size={11} /></a>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={!!done[c.id]} onChange={() => setDone({ ...done, [c.id]: !done[c.id] })} style={{ minHeight: 0, width: 18, height: 18 }} /> Completed
              </label>
            </div>
          </Card>
        ))}
        {!list.length && <EmptyState icon={Search} title="No courses match" />}
      </div>
    </div>
  );
}

/* ───────────────────────── Certifications ───────────────────────── */
export function Certifications({ session, push }) {
  const [certs, setCerts, storeErr] = useStore(session.username, "certs", []);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [file, setFile] = useState(null);
  const ref = useRef(null);
  function add() {
    if (!title.trim()) { push({ title: "Add a title", body: "Name the certificate first.", tone: "danger" }); return; }
    const entry = { id: Date.now(), title: title.trim(), issuer: issuer.trim(), added: new Date().toISOString().slice(0, 10) };
    const finish = (dataUrl, fileName) => { setCerts([{ ...entry, dataUrl, fileName }, ...certs]); setTitle(""); setIssuer(""); setFile(null); if (ref.current) ref.current.value = ""; push({ title: "Certificate saved", tone: "success" }); };
    if (!file) return finish(null, null);
    if (file.size > 1.5 * 1024 * 1024) { push({ title: "File too large", body: "Keep the file under 1.5 MB (compress the PDF or image).", tone: "danger" }); return; }
    const fr = new FileReader(); fr.onload = () => finish(String(fr.result), file.name); fr.readAsDataURL(file);
  }
  return (
    <div>
      <Title sub="Keep your certificates in one place. Files are stored in this browser only.">Certifications & Achievements</Title>
      <Card lift={false} style={{ padding: 18, marginBottom: 16 }}>
        <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Certificate name" value={title} onChange={setTitle} placeholder="e.g. AZ-900 Azure Fundamentals" />
          <Field label="Issued by" value={issuer} onChange={setIssuer} placeholder="e.g. Microsoft" />
        </div>
        <div style={{ margin: "12px 0" }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Document (PDF or image, optional)</label>
          <input ref={ref} type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 12.5 }} />
        </div>
        <Button icon={Upload} onClick={add}>Add certificate</Button>
        {storeErr && <div style={{ fontSize: 11.5, color: t.danger, marginTop: 8 }}>{storeErr}</div>}
      </Card>
      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={Award} title={`Your certificates (${certs.length})`} />
        {!certs.length ? <EmptyState icon={Award} title="No certificates yet" body="Add the first one above." /> : certs.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${t.border}`, flexWrap: "wrap" }}>
            <Award size={18} color={t.gold} />
            <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: t.textDim }}>{c.issuer || "Issuer not set"} · added {c.added}</div></div>
            {c.dataUrl && <a href={c.dataUrl} download={c.fileName} style={{ fontSize: 12, color: t.primary, fontWeight: 700 }}>Open {c.fileName}</a>}
            <button className="sv-btn" aria-label={`Delete ${c.title}`} onClick={() => setCerts(certs.filter((x) => x.id !== c.id))}
              style={{ background: "none", border: "none", cursor: "pointer", color: t.danger, padding: 8 }}><Trash2 size={15} /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ───────────────────────── Projects ───────────────────────── */
export function ProjectBlueprints({ session }) {
  const [resume] = useStore(session.username, "resume", { role: "fullstack" });
  const [built, setBuilt] = useStore(session.username, "projects", {});
  const [roleKey, setRoleKey] = useState(resume.role || "fullstack");
  const list = PROJECTS.filter((p) => p.role === roleKey);
  const total = PROJECTS.filter((p) => p.role === roleKey).length;
  const n = list.filter((p) => built[p.id]?.done).length;
  return (
    <div>
      <Title sub="Portfolio projects that hiring managers recognise, with what to deliver in each.">Project Blueprints</Title>
      <Card lift={false} style={{ padding: 16, marginBottom: 14, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <RoleSelect value={roleKey} onChange={setRoleKey} />
        <span style={{ fontFamily: FONT_M, fontSize: 13 }}>{n} of {total} built</span>
        <div style={{ flex: 1, minWidth: 120 }}><Progress pct={total ? (n / total) * 100 : 0} /></div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {list.map((p) => (
          <Card key={p.id} lift={false} style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}><Badge tone={p.level === "Easy" ? "success" : p.level === "Medium" ? "warning" : "danger"}>{p.level}</Badge></div>
            <div style={{ fontFamily: FONT_D, fontSize: 17, fontWeight: 700 }}>{p.title}</div>
            <div style={{ fontSize: 12.5, color: t.textDim, margin: "6px 0 10px" }}>{p.brief}</div>
            <div style={{ fontSize: 10.5, color: t.textFaint, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Deliverables</div>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>{p.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>{p.stack.map((s) => <Badge key={s} tone="gold">{s}</Badge>)}</div>
            <input value={built[p.id]?.repo || ""} onChange={(e) => setBuilt({ ...built, [p.id]: { ...built[p.id], repo: e.target.value } })}
              placeholder="Repository link (when built)" aria-label={`Repository link for ${p.title}`} style={{ ...input, marginBottom: 10 }} />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={!!built[p.id]?.done} onChange={() => setBuilt({ ...built, [p.id]: { ...built[p.id], done: !built[p.id]?.done } })}
                style={{ width: 18, height: 18, minHeight: 0 }} /> Mark as built
            </label>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Study Assistant ───────────────────────── */
export function StudyAssistant({ session }) {
  const [materials, setMaterials, storeErr] = useStore(session.username, "study", []);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [openId, setOpenId] = useState(null);
  const [view, setView] = useState("summary");
  const [answers, setAnswers] = useState({});
  const [quiz, setQuiz] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const fileRef = useRef(null);
  const open = materials.find((m) => m.id === openId);

  async function onFile(e) { const f = e.target.files?.[0]; if (!f) return; setText(await readText(f)); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); }
  function save() {
    if (!text.trim()) return;
    const m = { id: Date.now(), title: title.trim() || "Untitled material", text: text.trim() };
    setMaterials([m, ...materials]); setTitle(""); setText(""); if (fileRef.current) fileRef.current.value = ""; setOpenId(m.id); setView("summary"); setQuiz(null); setAnswers({});
  }
  function speak(str) {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(str); u.onend = () => setSpeaking(false); setSpeaking(true); window.speechSynthesis.speak(u);
  }
  const score = quiz ? quiz.filter((x, i) => answers[i] === x.answer).length : 0;

  return (
    <div>
      <Title sub="Add notes or any study text. Get a summary, key terms and a practice quiz, or have it read aloud.">Study Assistant</Title>
      <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card lift={false} style={{ padding: 16 }}>
            <SectionHead icon={Upload} title="Add material" />
            <input ref={fileRef} type="file" accept=".txt,.md" onChange={onFile} style={{ fontSize: 12, marginBottom: 10 }} />
            <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Operating Systems, Unit 3" />
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} aria-label="Study text" placeholder="Paste text here…"
              style={{ ...input, margin: "10px 0", resize: "vertical", fontSize: 12.5 }} />
            <Button full onClick={save} disabled={!text.trim()}>Save material</Button>
            {storeErr && <div style={{ fontSize: 11.5, color: t.danger, marginTop: 8 }}>{storeErr}</div>}
          </Card>
          <Card lift={false} style={{ padding: 16 }}>
            <SectionHead icon={FileText} title="Your materials" />
            {!materials.length ? <div style={{ fontSize: 12, color: t.textDim }}>Nothing yet. Upload something above to get started.</div> : materials.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
                <button className="sv-btn" onClick={() => { setOpenId(m.id); setView("summary"); setQuiz(null); setAnswers({}); }}
                  style={{ flex: 1, textAlign: "left", background: openId === m.id ? t.primarySoft : "none", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>{m.title}</button>
                <button className="sv-btn" aria-label={`Delete ${m.title}`} onClick={() => { setMaterials(materials.filter((x) => x.id !== m.id)); if (openId === m.id) setOpenId(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: t.danger }}><Trash2 size={14} /></button>
              </div>
            ))}
          </Card>
        </div>
        <Card lift={false} style={{ padding: 18, minHeight: 320 }}>
          {!open ? <EmptyState icon={Headphones} title="Select or upload a study material" body="Once you add something you can summarise it, practise questions from it, or listen to it." /> : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                <div style={{ fontFamily: FONT_D, fontSize: 19, fontWeight: 700, flex: 1 }}>{open.title}</div>
                {[["summary", "Summary"], ["terms", "Key terms"], ["quiz", "Quiz"]].map(([k, l]) => (
                  <button key={k} className="sv-btn" onClick={() => { setView(k); if (k === "quiz" && !quiz) { setQuiz(makeQuiz(open.text)); setAnswers({}); } }}
                    style={{ padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: view === k ? t.primary : t.surface, color: view === k ? t.onPrimary : t.textDim, border: `1px solid ${view === k ? t.primary : t.border}` }}>{l}</button>
                ))}
                <Button variant="ghost" icon={speaking ? Square : Play} onClick={() => speak(summarize(open.text, 6).join(" "))}>{speaking ? "Stop" : "Read aloud"}</Button>
              </div>
              {view === "summary" && <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.75 }}>{summarize(open.text, 6).map((s) => <li key={s}>{s}</li>)}</ol>}
              {view === "terms" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{keyTerms(open.text, 16).map((k) => <Badge key={k.term} tone="primary">{k.term} · {k.count}</Badge>)}</div>}
              {view === "quiz" && (!quiz?.length ? <div style={{ fontSize: 13, color: t.textDim }}>This text is too short to make questions. Add a longer passage.</div> : (
                <div>
                  {quiz.map((x, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{i + 1}. {x.q}</div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        {x.options.map((o) => {
                          const picked = answers[i] === o, shown = answers[i] !== undefined;
                          const bg = shown ? (o === x.answer ? t.successSoft : picked ? t.dangerSoft : t.surface) : t.surface;
                          return <button key={o} className="sv-btn" disabled={shown} onClick={() => setAnswers({ ...answers, [i]: o })}
                            style={{ padding: "7px 13px", borderRadius: 8, fontSize: 12.5, cursor: "pointer", background: bg, border: `1px solid ${shown && o === x.answer ? t.success : t.border}` }}>{o}</button>;
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <strong style={{ fontFamily: FONT_M }}>Score: {score} / {quiz.length}</strong>
                    <Button variant="ghost" icon={RefreshCw} onClick={() => { setQuiz(makeQuiz(open.text)); setAnswers({}); }}>New questions</Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
