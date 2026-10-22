import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Calendar, BarChart3, Building, BookOpen, Briefcase, Rocket, Target,
  Download, Filter, FileText, Github, GraduationCap, FolderGit2, Headphones, Settings as SettingsIcon, AlertTriangle, CheckCircle2, Award, Clock, ArrowUpRight, Send, Check, Info,
  ClipboardCheck, FlaskConical, Wallet, Compass,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import Shell from "./Shell";
import { theme as t, FONT_D, FONT_M } from "../lib/theme";
import {
  Card, Badge, Button, SectionHead, Progress, Skeleton, EmptyState, ErrorNote,
  Modal, SealWatermark, useToasts, ToastStack, Spinner,
} from "../components/Shared";
import { api, download } from "../lib/api";
import KpiTiles from "../components/KpiTiles";
import { ResumeAnalyzer, GithubAnalyzer, SkillGap, CareerCourses, Certifications, ProjectBlueprints, StudyAssistant, CareerHome } from "./CareerHub";
import { QuickCodeSettings } from "./Settings";
import { Assessments, Practicals, UniversityExams } from "./StudentExams";
import FeePortal from "./FeePortal";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Academics" },
  { key: "attendance", label: "Attendance", icon: Calendar, group: "Academics" },
  { key: "marks", label: "Internal Marks", icon: BarChart3, group: "Examinations" },
  { key: "assessments", label: "Assessments", icon: ClipboardCheck, group: "Examinations" },
  { key: "practicals", label: "Practicals", icon: FlaskConical, group: "Examinations" },
  { key: "university", label: "University Exams", icon: GraduationCap, group: "Examinations" },
  { key: "fees", label: "Fee Portal", icon: Wallet, group: "Fees" },
  { key: "cms", label: "Campus Services", icon: Building, group: "Campus" },
  { key: "leave", label: "Leave / OD", icon: Calendar, group: "Academic Requests" },
  { key: "learning", label: "Learning Path", icon: BookOpen, group: "Growth" },
  { key: "placement", label: "Placement", icon: Briefcase, group: "Growth" },
  { key: "internships", label: "Internships", icon: Rocket, group: "Growth" },
  { key: "roadmap", label: "Roadmap", icon: Target, group: "Growth" },
  // One boxed section; every page inside it is shown in black and white.
  { key: "careerhub", label: "Overview", icon: Compass, group: "Career Hub", box: true, career: true },
  { key: "resume", label: "Resume Analyzer", icon: FileText, group: "Career Hub", box: true, career: true },
  { key: "github", label: "GitHub Analyzer", icon: Github, group: "Career Hub", box: true, career: true },
  { key: "skillgap", label: "Skill Gap", icon: Target, group: "Career Hub", box: true, career: true },
  { key: "courses", label: "Courses", icon: GraduationCap, group: "Career Hub", box: true, career: true },
  { key: "certs", label: "Certifications", icon: Award, group: "Career Hub", box: true, career: true },
  { key: "projects", label: "Projects", icon: FolderGit2, group: "Career Hub", box: true, career: true },
  { key: "study", label: "Study Assistant", icon: Headphones, group: "Career Hub", box: true, career: true },
  { key: "settings", label: "Settings", icon: SettingsIcon, group: "Account" },
];

const STATUS_COLOR = { PRESENT: t.success, ABSENT: t.danger, OD: t.gold, MEDICAL: "#3D7A9E" };
const STATUS_LABEL = { PRESENT: "Present", ABSENT: "Absent", OD: "On duty", MEDICAL: "Medical leave" };

const SERVICES = [
  { id: "FEE", name: "Fee Payment", desc: "Semester dues and receipts", fields: ["Semester", "Payment mode"] },
  { id: "HOSTEL", name: "Hostel Services", desc: "Room, mess and requests", fields: ["Request type", "Details"] },
  { id: "TRANSPORT", name: "Transport", desc: "Bus route and pass renewal", fields: ["Route", "Boarding point"] },
  { id: "ID_CARD", name: "ID Card Services", desc: "Reissue or update identity", fields: ["Reason", "Remarks"] },
  { id: "EXAM_CELL", name: "Examination Cell", desc: "Hall tickets and revaluation", fields: ["Exam", "Request type"] },
  { id: "LIBRARY", name: "Library", desc: "Issued books and renewals", fields: ["Book title", "Action"] },
];

function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const reload = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => setState({ loading: false, data, error: null }))
        .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export default function StudentPortal({ session, onSignOut }) {
  const [active, setActive] = useState("dashboard");
  const { toasts, push, dismiss } = useToasts();

  return (
    <>
      <Shell nav={NAV} active={active} setActive={setActive} session={session}
        onSignOut={onSignOut} subtitle="Student Portal">
        {active === "dashboard" && <Overview push={push} setActive={setActive} />}
        {active === "attendance" && <Attendance push={push} />}
        {active === "marks" && <Marks push={push} />}
        {active === "assessments" && <Assessments />}
        {active === "practicals" && <Practicals />}
        {active === "university" && <UniversityExams />}
        {active === "fees" && <FeePortal push={push} />}
        {active === "careerhub" && <CareerHome nav={NAV} setActive={setActive} session={session} />}
        {active === "cms" && <CampusServices push={push} />}
        {active === "leave" && <LeaveDesk push={push} />}
        {active === "learning" && <LearningPath />}
        {active === "placement" && <Placement push={push} />}
        {active === "internships" && <Internships push={push} />}
        {active === "roadmap" && <Roadmap />}
        {active === "resume" && <ResumeAnalyzer session={session} push={push} />}
        {active === "github" && <GithubAnalyzer session={session} />}
        {active === "skillgap" && <SkillGap session={session} setActive={setActive} />}
        {active === "courses" && <CareerCourses session={session} />}
        {active === "certs" && <Certifications session={session} push={push} />}
        {active === "projects" && <ProjectBlueprints session={session} />}
        {active === "study" && <StudyAssistant session={session} />}
        {active === "settings" && <QuickCodeSettings push={push} session={session} />}
      </Shell>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </>
  );
}

/* ─────────────── Overview ─────────────── */

function Overview({ push, setActive }) {
  const profile = useAsync(() => api.studentProfile(), []);
  const attendance = useAsync(() => api.studentAttendance("all"), []);
  const risk = useAsync(() => api.studentRisk(), []);

  if (profile.loading || attendance.loading) return <Skeleton />;
  if (profile.error) return <ErrorNote message={profile.error} onRetry={profile.reload} />;

  const p = profile.data, a = attendance.data;
  const blocked = (a?.subjects || []).filter((s) => !s.eligible);
  // Before any period is marked there is no percentage yet — don't show it as 0% and failing.
  const hasAtt = (a?.conducted || 0) > 0;
  const attOk = hasAtt && a.overallPercentage >= 75;
  const attValue = hasAtt ? `${a.overallPercentage}%` : "—";
  const scoreTrend = (a?.subjects || []).slice(0, 6).map((s) => ({
    subject: s.subjectCode,
    attendance: s.percentage,
    target: 75,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card lift={false} style={{ padding: 0, borderColor: t.borderGold }}>
        <SealWatermark size={230} style={{ top: -55, right: -35 }} />
        <div style={{ height: 3, background: `linear-gradient(90deg, ${t.gold}, ${t.primary})` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15, flex: 1, minWidth: 240 }}>
            <div style={{ width: 62, height: 62, borderRadius: 13, flexShrink: 0,
              background: `linear-gradient(140deg, ${t.primary}, ${t.gold})`, display: "flex",
              alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 21, fontWeight: 800 }}>
              {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ fontFamily: FONT_M, fontSize: 9.5, letterSpacing: "0.16em",
                textTransform: "uppercase", color: t.gold, marginBottom: 6 }}>
                {p.programCode} · Section {p.section}
              </div>
              <div style={{ fontFamily: FONT_D, fontSize: 24, fontWeight: 700, color: t.text, lineHeight: 1.1 }}>
                {p.name}
              </div>
              <div style={{ display: "flex", gap: 9, marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontFamily: FONT_M, fontSize: 11.5, color: t.gold, fontWeight: 700 }}>{p.rollNo}</span>
                <span style={{ fontSize: 11.5, color: t.textDim }}>Year {p.year} · Semester {p.semester}</span>
                <span style={{ fontSize: 11.5, color: t.textDim }}>Batch {p.batch}</span>
              </div>
              {p.classCoordinator && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: t.textDim }}>
                  Class coordinator: <span style={{ color: t.text, fontWeight: 600 }}>{p.classCoordinator}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            {[["CGPA", p.cgpa.toFixed(2), "of 10.00", t.gold],
              ["Attendance", attValue, "min 75%", !hasAtt ? t.textDim : attOk ? t.success : t.danger],
              ["Credits", p.creditsEarned, `of ${p.creditsRequired}`, t.primary]].map(([l, v, s, c]) => (
              <div key={l}>
                <div style={{ fontFamily: FONT_M, fontSize: 9, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: t.textFaint, marginBottom: 5 }}>{l}</div>
                <div style={{ fontFamily: FONT_M, fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 10, color: t.textFaint, marginTop: 3 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <KpiTiles tiles={[
        { label: "CGPA", value: p.cgpa.toFixed(2), sub: "out of 10.00", icon: Award, from: "#7A630D", to: "#d9a81f" },
        { label: "Attendance", value: attValue,
          sub: !hasAtt ? (attendance.error ? "Couldn't load attendance" : "No classes marked yet") : attOk ? "Above the 75% line" : "Below the 75% line",
          icon: Calendar, from: !hasAtt ? "#3d5a4c" : attOk ? "#1B5E3A" : "#a30f26", to: !hasAtt ? "#6f8f7f" : attOk ? "#35a86a" : "#e04a62" },
        { label: "Credits earned", value: p.creditsEarned, sub: `of ${p.creditsRequired} required`, icon: BookOpen, from: "#2b5fa8", to: "#4f93e0" },
        { label: "Subjects at risk", value: blocked.length, sub: blocked.length ? "Below 75% attendance" : "All subjects eligible",
          icon: AlertTriangle, from: blocked.length ? "#b4540a" : "#5b3fa8", to: blocked.length ? "#f08a2c" : "#8d6be0" },
      ]} />

      <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={BarChart3} title="Performance pulse" sub="Attendance against the 75% eligibility benchmark" />
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreTrend}>
                <defs>
                  <linearGradient id="studentTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.primary} stopOpacity={0.38} />
                    <stop offset="100%" stopColor={t.primary} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="subject" tick={{ fill: t.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: t.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, fontSize: 12 }} />
                <Area type="monotone" dataKey="attendance" stroke={t.primary} fill="url(#studentTrendFill)" strokeWidth={2.4} />
                <Area type="monotone" dataKey="target" stroke={t.gold} fill="transparent" strokeDasharray="5 5" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={Target} title="Readiness snapshot" sub="Current risk and academic momentum" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
            {!risk.loading && risk.data && !risk.data.degraded ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: t.textDim }}>Risk score</span>
                  <Badge tone={risk.data.band === "HIGH" ? "danger" : risk.data.band === "MEDIUM" ? "warning" : "success"}>{risk.data.band} · {risk.data.risk_score}</Badge>
                </div>
                <Progress pct={Math.min(100, risk.data.risk_score)} color={risk.data.band === "HIGH" ? t.danger : risk.data.band === "MEDIUM" ? t.warning : t.success} height={8} />
                <div style={{ fontSize: 11.5, color: t.textDim, lineHeight: 1.5 }}>{risk.data.headline}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: t.textDim }}>No active risk alarm. Your trajectory looks stable.</div>
            )}
          </div>
        </Card>
      </div>

      {blocked.length > 0 && (
        <Card lift={false} style={{ padding: 18, borderColor: `${t.danger}44` }}>
          <div style={{ display: "flex", gap: 11 }}>
            <AlertTriangle size={17} color={t.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                {blocked.length} subject{blocked.length > 1 ? "s need" : " needs"} attention
              </div>
              <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 4, lineHeight: 1.5 }}>
                {blocked.map((s) => `${s.subjectCode} at ${s.percentage}%`).join(", ")} — below the 75% needed
                to sit the semester examination.
              </div>
              <div style={{ marginTop: 11 }}>
                <Button size="sm" variant="soft" onClick={() => setActive("attendance")}>View register</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!risk.loading && risk.data && !risk.data.degraded && (
        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={Target} title="How you're tracking"
            sub={risk.data.headline}
            right={<Badge tone={risk.data.band === "HIGH" ? "danger" : risk.data.band === "MEDIUM" ? "warning" : "success"}>
              {risk.data.band} risk · {risk.data.risk_score}/100</Badge>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(risk.data.factors || []).map((f) => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11.5, color: t.textDim, width: 92, flexShrink: 0 }}>{f.label}</span>
                <div style={{ flex: 1 }}><Progress pct={f.contribution * 2.5} color={t.warning} height={5} /></div>
                <span style={{ fontSize: 11, color: t.textFaint, flex: 1.6, minWidth: 0 }}>{f.detail}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={BookOpen} title="Subject-wise standing" />
        <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(a?.subjects || []).map((s) => (
            <div key={s.subjectCode} style={{ padding: "13px 15px", borderRadius: 11, background: t.bgSoft,
              border: `1px solid ${s.eligible ? t.border : `${t.danger}44`}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 9, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.gold, fontWeight: 700 }}>{s.subjectCode}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.subjectName}</span>
                </div>
                <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_M, fontSize: 11, color: t.textFaint }}>{s.attended}/{s.conducted}</span>
                  <span style={{ fontFamily: FONT_M, fontSize: 13, fontWeight: 700,
                    color: s.eligible ? t.success : t.danger }}>{s.percentage}%</span>
                </div>
              </div>
              <Progress pct={s.percentage} color={s.eligible ? t.success : t.danger} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─────────────── Attendance: period grid + day rollup ─────────────── */

function Attendance({ push }) {
  const [subject, setSubject] = useState("all");
  const [mode, setMode] = useState("period");
  const [busy, setBusy] = useState(false);
  const { loading, data, error, reload } = useAsync(() => api.studentAttendance(subject), [subject]);

  const grouped = useMemo(() => {
    if (!data) return {};
    const byMonth = {};
    (data.cells || []).forEach((c) => {
      const [y, m, d] = c.date.split("-");
      const key = `${y}-${m}`;
      (byMonth[key] = byMonth[key] || []).push({ ...c, day: parseInt(d, 10) });
    });
    return byMonth;
  }, [data]);

  const dayByMonth = useMemo(() => {
    if (!data) return {};
    const byMonth = {};
    (data.days || []).forEach((d) => {
      const [y, m, dd] = d.date.split("-");
      const key = `${y}-${m}`;
      (byMonth[key] = byMonth[key] || []).push({ ...d, day: parseInt(dd, 10) });
    });
    return byMonth;
  }, [data]);

  async function exportXlsx() {
    setBusy(true);
    try {
      const blob = await api.exportAttendance();
      download(blob, "attendance.xlsx");
      push({ title: "Register exported", body: "Saved as attendance.xlsx", tone: "success" });
    } catch (e) {
      push({ title: "Export failed", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const monthKeys = Object.keys(mode === "period" ? grouped : dayByMonth).sort();
  const donut = Object.entries(data.statusCounts || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABEL[k] || k, value: v, key: k }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="sv-stagger sv-grid-3" style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 13 }}>
        {[["Attendance", data.conducted ? `${data.overallPercentage}%` : "—", Calendar,
            !data.conducted ? t.textDim : data.overallPercentage >= 75 ? t.success : t.danger, "Requirement: 75%"],
          ["Periods attended", data.attended, CheckCircle2, t.primary, `of ${data.conducted} conducted`],
          ["Periods missed", data.conducted - data.attended, AlertTriangle, t.danger, "Excluding OD and medical"],
          ["Subjects below 75%", (data.subjects || []).filter((s) => !s.eligible).length, Award, t.warning, "Exam eligibility"]]
          .map(([label, value, Icon, color, note]) => (
          <Card key={label} style={{ padding: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontFamily: FONT_M, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 6, fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 10, color: t.textFaint, marginTop: 3 }}>{note}</div>
          </Card>
        ))}
      </div>

      <Card lift={false} style={{ padding: 18 }}>
        <SealWatermark size={200} style={{ bottom: -40, right: -40 }} />
        <SectionHead icon={Calendar} title="Attendance Register"
          sub={subject === "all"
            ? "Every period conducted this semester, marked by faculty at the end of each hour."
            : `${subject} — every period of this paper.`}
          right={<Button size="sm" variant="ghost" icon={Download} onClick={exportXlsx} disabled={busy}>
            {busy ? <Spinner size={12} /> : "Export"}</Button>} />

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 13 }}>
          <FilterChip on={subject === "all"} onClick={() => setSubject("all")}>All subjects</FilterChip>
          {(data.subjects || []).map((s) => (
            <FilterChip key={s.subjectCode} on={subject === s.subjectCode}
              onClick={() => setSubject(s.subjectCode)} mono>{s.subjectCode}</FilterChip>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: t.bgSoft,
          border: `1px solid ${t.border}`, width: "fit-content", marginBottom: 14 }}>
          {[["period", "By period"], ["day", "By day"]].map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)} className="sv-btn" style={{
              padding: "6px 13px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              background: mode === k ? t.primary : "transparent", color: mode === k ? "#fff" : t.textDim,
              border: "none", minHeight: 34,
            }}>{label}</button>
          ))}
        </div>

        {monthKeys.length === 0 ? (
          <EmptyState icon={Calendar} title="No attendance recorded yet"
            body="Once faculty mark their first period, it appears here." />
        ) : (
          <div className="sv-scroll" style={{ overflowX: "auto", paddingBottom: 6 }}>
            <div style={{ minWidth: 520 }}>
              {monthKeys.map((key) => {
                const label = new Date(`${key}-01`).toLocaleDateString("en-IN", { month: "short" });
                const cells = mode === "period" ? grouped[key] : dayByMonth[key];
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
                    <div style={{ width: 40, flexShrink: 0, fontFamily: FONT_M, fontSize: 9.5,
                      color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                    <div style={{ display: "flex", gap: 2, flex: 1, flexWrap: "wrap" }}>
                      {cells.map((c, i) => {
                        const color = mode === "period"
                          ? STATUS_COLOR[c.status]
                          : c.percentage === 100 ? t.success : c.percentage >= 75 ? t.success : c.percentage > 0 ? t.warning : t.danger;
                        const title = mode === "period"
                          ? `${c.day} ${label} · P${c.period} · ${c.subjectCode} · ${STATUS_LABEL[c.status]}`
                          : `${c.day} ${label} · ${c.attended}/${c.conducted} periods · ${c.percentage}%`;
                        return <div key={i} className="sv-cell" title={title} style={{
                          width: mode === "period" ? 9 : 13, height: 15, borderRadius: 2.5,
                          background: color, opacity: mode === "day" ? Math.max(0.42, c.percentage / 100) : 0.85,
                          cursor: "pointer",
                        }} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 13, flexWrap: "wrap", marginTop: 15, paddingTop: 13,
          borderTop: `1px solid ${t.border}` }}>
          {(mode === "period"
            ? Object.entries(STATUS_LABEL).map(([k, v]) => [v, STATUS_COLOR[k]])
            : [["Full day", t.success], ["Partial", t.warning], ["None attended", t.danger]]
          ).map(([label, color]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 10.5, color: t.textDim }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />{label}
            </span>
          ))}
        </div>
      </Card>

      {donut.length > 0 && (
        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={Info} title="How periods were recorded" sub={`All ${data.conducted} periods`} />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2.5} stroke="none">
                  {donut.map((d, i) => <Cell key={i} fill={STATUS_COLOR[d.key] || t.primary} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function FilterChip({ on, onClick, children, mono }) {
  return (
    <button onClick={onClick} className="sv-btn" style={{
      padding: "7px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
      fontFamily: mono ? FONT_M : undefined, minHeight: 36,
      background: on ? t.primary : "transparent", color: on ? "#fff" : t.textDim,
      border: `1px solid ${on ? t.primary : t.border}`,
    }}>{children}</button>
  );
}

/* ─────────────── Marks ─────────────── */

function Marks({ push }) {
  const { loading, data, error, reload } = useAsync(() => api.studentMarks(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data.subjects?.length) {
    return <EmptyState icon={BarChart3} title="No marks published yet"
      body="Internal assessment marks appear here once your faculty publish them." />;
  }

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SealWatermark size={190} style={{ bottom: -45, left: -35 }} />
      <SectionHead icon={BarChart3} title="Internal Assessment Record"
        sub={`CGPA ${data.cgpa.toFixed(2)} · ${data.creditsEarned} of ${data.creditsRequired} credits earned`}
        right={<Button size="sm" variant="ghost" icon={Download}
          onClick={async () => { download(await api.exportMarks(), "marks.xlsx");
            push({ title: "Marks exported", tone: "success" }); }}>Export</Button>} />
      <div className="sv-scroll" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 560 }}>
          <thead>
            <tr>{["Code", "Subject", "Cr", "IA1", "IA2", "Average", "Grade"].map((h) => (
              <th key={h} style={{ textAlign: h === "Subject" ? "left" : "center", padding: "9px 11px",
                fontFamily: FONT_M, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase",
                color: t.textFaint, borderBottom: `1px solid ${t.border}`, fontWeight: 500 }}>{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {data.subjects.map((m) => {
              const gc = m.grade === "O" ? t.gold : ["A+", "A"].includes(m.grade) ? t.success
                : m.grade === "RA" ? t.danger : t.primary;
              return (
                <tr key={m.subjectCode}>
                  <td style={{ padding: "12px 11px", textAlign: "center", fontFamily: FONT_M, fontSize: 11,
                    color: t.gold, fontWeight: 700, borderBottom: `1px solid ${t.border}` }}>{m.subjectCode}</td>
                  <td style={{ padding: "12px 11px", fontSize: 12.5, fontWeight: 600,
                    borderBottom: `1px solid ${t.border}` }}>{m.subjectName}</td>
                  <td style={{ padding: "12px 11px", textAlign: "center", fontFamily: FONT_M, fontSize: 12,
                    color: t.textDim, borderBottom: `1px solid ${t.border}` }}>{m.credits}</td>
                  <td style={{ padding: "12px 11px", textAlign: "center", fontFamily: FONT_M, fontSize: 12,
                    borderBottom: `1px solid ${t.border}` }}>{m.ia1 == null ? "—" : `${m.ia1}/${m.ia1Max}`}</td>
                  <td style={{ padding: "12px 11px", textAlign: "center", fontFamily: FONT_M, fontSize: 12,
                    borderBottom: `1px solid ${t.border}` }}>{m.ia2 == null ? "—" : `${m.ia2}/${m.ia2Max}`}</td>
                  <td style={{ padding: "12px 11px", textAlign: "center", minWidth: 96,
                    borderBottom: `1px solid ${t.border}` }}>
                    <div style={{ fontFamily: FONT_M, fontSize: 12, marginBottom: 5 }}>{m.averagePercentage ?? "—"}%</div>
                    <Progress pct={m.averagePercentage} height={4}
                      color={m.averagePercentage >= 85 ? t.success : m.averagePercentage >= 70 ? t.primary : t.danger} />
                  </td>
                  <td style={{ padding: "12px 11px", textAlign: "center", borderBottom: `1px solid ${t.border}` }}>
                    <span style={{ fontFamily: FONT_M, fontSize: 13, fontWeight: 700, color: gc }}>{m.grade}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, padding: "10px 12px", borderRadius: 9,
        background: t.goldSoft, border: `1px solid ${t.borderGold}` }}>
        <Info size={13} color={t.gold} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11.5, color: t.textDim, lineHeight: 1.45 }}>
          Grades are computed from published internal assessments. Final grades follow the university result.
        </span>
      </div>
    </Card>
  );
}

/* ─────────────── Campus services ─────────────── */

function CampusServices({ push }) {
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const requests = useAsync(() => api.studentCmsRequests(), []);

  async function submit() {
    setBusy(true);
    try {
      const res = await api.raiseCmsRequest(open.id, form);
      push({ title: `${open.name} request raised`, body: `Ticket ${res.ticketNo} created.`, tone: "success" });
      setOpen(null); setForm({}); requests.reload();
    } catch (e) {
      push({ title: "Couldn't raise request", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={Building} title="Campus Services"
            sub="Everything the administrative office handles, without the queue outside it." />
          <div className="sv-stagger sv-grid-3" style={{ display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 13 }}>
            {SERVICES.map((s) => (
              <Card key={s.id} style={{ padding: 16 }} onClick={() => { setOpen(s); setForm({}); }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: FONT_D }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 4, lineHeight: 1.45, minHeight: 32 }}>{s.desc}</div>
                <div style={{ display: "flex", gap: 5, marginTop: 11, fontSize: 11.5, fontWeight: 700, color: t.primary }}>
                  Open <ArrowUpRight size={12} />
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={Clock} title="Your requests" />
          {requests.loading ? <Skeleton count={2} height={60} />
            : !requests.data?.length
              ? <EmptyState icon={Building} title="Nothing raised yet"
                  body="Pick a service above to raise your first request." />
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {requests.data.map((r) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12,
                      padding: "12px 14px", borderRadius: 10, background: t.bgSoft,
                      border: `1px solid ${t.border}`, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {SERVICES.find((s) => s.id === r.serviceType)?.name || r.serviceType}
                        </div>
                        <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 3 }}>
                          {r.ticketNo} · raised {r.createdAt}
                        </div>
                      </div>
                      <Badge tone={r.status === "RESOLVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
        </Card>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} eyebrow="Campus Services" title={open?.name || ""}
        footer={<><Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : "Raise request"}</Button></>}>
        {open && (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ fontSize: 12, color: t.textDim, lineHeight: 1.5 }}>{open.desc}</div>
            {open.fields.map((f) => (
              <div key={f}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>{f}</label>
                <input value={form[f] || ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  placeholder={`Enter ${f.toLowerCase()}`} style={{ width: "100%", padding: "11px 13px",
                    borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`, fontSize: 13.5,
                    outline: "2px solid transparent", outlineOffset: 2, minHeight: 44 }} />
              </div>
            ))}
            <div style={{ fontSize: 11, color: t.textFaint, lineHeight: 1.5 }}>
              The administrative office reviews requests within two working days.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ─────────────── Leave / OD desk ─────────────── */

function LeaveDesk({ push }) {
  const [form, setForm] = useState({ fromDate: "", toDate: "", type: "LEAVE", reason: "" });
  const [proof, setProof] = useState(null);
  const [busy, setBusy] = useState(false);
  const { loading, data, error, reload } = useAsync(() => api.studentLeaveApplications(), []);

  async function submit() {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      push({ title: "Complete the form", body: "Select dates and provide the reason before submitting.", tone: "warning" });
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("fromDate", form.fromDate);
      fd.append("toDate", form.toDate);
      fd.append("type", form.type);
      fd.append("reason", form.reason);
      if (proof) fd.append("proof", proof);
      await api.submitLeaveApplication(fd);
      push({ title: "Request submitted", body: "Your leave / OD request has been queued for review.", tone: "success" });
      setForm({ fromDate: "", toDate: "", type: "LEAVE", reason: "" });
      setProof(null);
      reload();
    } catch (e) {
      push({ title: "Couldn't submit request", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={Calendar} title="Leave / OD request" sub="Apply for leave or on-duty approval with proof if needed." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 170 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>From</label>
              <input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }} />
            </div>
            <div style={{ flex: 1, minWidth: 170 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>To</label>
              <input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Request type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }}>
              <option value="LEAVE">Leave</option>
              <option value="OD">On duty</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={4}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`, fontSize: 13, resize: "vertical" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Proof file (optional)</label>
            <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => setProof(e.target.files?.[0] || null)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={submit} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : "Submit request"}</Button>
          </div>
        </div>
      </Card>

      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={Clock} title="My requests" />
        {loading ? <Skeleton count={2} height={60} />
          : error ? <ErrorNote message={error} onRetry={reload} />
          : !data?.length ? <EmptyState icon={Calendar} title="No leave requests yet" body="Your submitted leave and OD approvals appear here." />
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: t.bgSoft, border: `1px solid ${t.border}`, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.type === "OD" ? "On duty" : "Leave"}</div>
                    <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 3 }}>{r.fromDate} to {r.toDate}</div>
                    <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 4 }}>{r.reason}</div>
                  </div>
                  <Badge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{r.status}</Badge>
                </div>
              ))}
            </div>}
      </Card>
    </div>
  );
}

/* ─────────────── Learning path ─────────────── */

function LearningPath() {
  const { loading, data, error, reload } = useAsync(() => api.studentLearningPath(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  const recs = data?.recommendations || [];
  if (!recs.length) return <EmptyState icon={BookOpen} title="No recommendations yet"
    body="Once attendance and marks are recorded, your learning path appears here." />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={BookOpen} title="Learning Path"
        sub="Ordered by what moves your standing the most. Each item states why it was recommended." />
      <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {recs.map((r, i) => (
          <div key={i} style={{ padding: "14px 15px", borderRadius: 11, background: t.bgSoft,
            border: `1px solid ${r.status === "Urgent" ? `${t.danger}44` : t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 9 }}>
              <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                <span style={{ fontFamily: FONT_M, fontSize: 11, color: t.gold, fontWeight: 700, marginTop: 1 }}>
                  {String(r.priority).padStart(2, "0")}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.topic}</div>
                  <div style={{ fontSize: 11, color: t.textDim, marginTop: 4, lineHeight: 1.45 }}>{r.reason}</div>
                </div>
              </div>
              <Badge tone={r.status === "Urgent" ? "danger" : r.status === "Recommended" ? "gold" : "primary"}>
                {r.status}
              </Badge>
            </div>
            <Progress pct={r.progress} color={r.status === "Urgent" ? t.danger : t.primary} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────── Placement ─────────────── */

function Placement({ push }) {
  const readiness = useAsync(() => api.studentReadiness(), []);
  const companies = useAsync(() => api.studentCompanies(), []);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    try {
      await api.applyToCompany(confirm.id);
      push({ title: `Applied to ${confirm.name}`, body: "The placement cell will confirm by email.", tone: "success" });
      setConfirm(null); companies.reload();
    } catch (e) {
      push({ title: "Application not submitted", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  if (readiness.loading || companies.loading) return <Skeleton />;

  const r = readiness.data || {};
  const radar = Object.entries(r.skills || {}).map(([skill, val]) => ({ skill, val }));

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {radar.length > 0 && (
          <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card lift={false} style={{ padding: 18 }}>
              <SectionHead icon={Award} title="Placement Readiness"
                sub="Six dimensions scored from your academic record and placement-cell assessments" />
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke={t.border} />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: t.textDim, fontSize: 10.5 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="val" stroke={t.gold} fill={t.gold} fillOpacity={0.22} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card lift={false} style={{ padding: 18 }}>
              <SectionHead icon={Target} title="Readiness summary"
                right={<Badge tone="gold">{r.overall}%</Badge>} />
              <div style={{ fontSize: 12.5, color: t.textDim, lineHeight: 1.6, marginBottom: 16 }}>{r.narrative}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {radar.map((s) => (
                  <div key={s.skill} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ fontSize: 11, color: t.textDim, width: 96, flexShrink: 0 }}>{s.skill}</span>
                    <div style={{ flex: 1 }}>
                      <Progress pct={s.val} height={5}
                        color={s.val >= 80 ? t.success : s.val >= 65 ? t.primary : t.danger} />
                    </div>
                    <span style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, width: 22, textAlign: "right" }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={Briefcase} title="Companies matched to your profile"
            sub="Match weighs CGPA, attendance and your readiness scores. Eligibility is checked on the server." />
          <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {(companies.data || []).map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 14,
                padding: "14px 15px", borderRadius: 11, background: t.bgSoft,
                border: `1px solid ${c.eligible ? t.border : `${t.danger}33`}`, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT_D, fontSize: 14.5, fontWeight: 700 }}>{c.name}</span>
                    <Badge tone={c.matchPercentage > 85 ? "success" : c.matchPercentage > 70 ? "primary" : "warning"}>
                      {c.matchPercentage}% match
                    </Badge>
                    {!c.eligible && <Badge tone="danger">Not eligible</Badge>}
                  </div>
                  <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 4 }}>{c.jobRole} · {c.ctc}</div>
                  <div style={{ fontFamily: FONT_M, fontSize: 10, color: t.textFaint, marginTop: 5 }}>{c.criteria}</div>
                  {!c.eligible && (
                    <div style={{ fontSize: 10.5, color: t.danger, marginTop: 5 }}>{c.ineligibleReason}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: FONT_M, fontSize: 9.5, color: t.textFaint,
                      letterSpacing: "0.1em", textTransform: "uppercase" }}>Closes</div>
                    <div style={{ fontFamily: FONT_M, fontSize: 12, fontWeight: 700, marginTop: 2 }}>{c.deadline}</div>
                  </div>
                  <Button size="sm" variant={c.applied ? "ghost" : "primary"} disabled={!c.eligible || c.applied}
                    icon={c.applied ? Check : undefined} onClick={() => setConfirm(c)}>
                    {c.applied ? "Applied" : "Apply"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} eyebrow="Placement Cell"
        title={`Apply to ${confirm?.name || ""}`} width={430}
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button onClick={apply} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : "Confirm application"}</Button></>}>
        {confirm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {[["Role", confirm.jobRole], ["Compensation", confirm.ctc],
              ["Profile match", `${confirm.matchPercentage}%`], ["Eligibility", confirm.criteria],
              ["Applications close", confirm.deadline]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14,
                paddingBottom: 11, borderBottom: `1px solid ${t.border}` }}>
                <span style={{ fontSize: 11.5, color: t.textFaint }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: t.textDim, lineHeight: 1.5 }}>
              Your academic record is sent with this application. You can withdraw before the closing date.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ─────────────── Internships ─────────────── */

function Internships({ push }) {
  const { loading, data, error, reload } = useAsync(() => api.studentInternships(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data.length) return <EmptyState icon={Rocket} title="No internships open to you right now"
    body="New openings filtered to your branch appear here as the placement cell posts them." />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={Rocket} title="Internships open to you"
        sub="Filtered against your branch and current academic standing." />
      <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {data.map((i) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 14,
            padding: "14px 15px", borderRadius: 11, background: t.bgSoft,
            border: `1px solid ${t.border}`, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_D, fontSize: 14.5, fontWeight: 700 }}>{i.title}</div>
              <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 4 }}>
                {i.organisation} · {i.duration} · {i.stipend}
              </div>
              <div style={{ fontFamily: FONT_M, fontSize: 10, color: t.textFaint, marginTop: 5 }}>{i.mode}</div>
            </div>
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <Badge tone={i.daysLeft <= 14 ? "danger" : "primary"}>
                <Clock size={10} />{i.daysLeft} days left
              </Badge>
              <Button size="sm" variant="soft"
                onClick={() => push({ title: "Application started",
                  body: `Your ${i.organisation} application is saved as a draft.`, tone: "primary" })}>
                Apply
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────── Roadmap ─────────────── */

const YEAR_NOTES = [
  ["Foundation", "Core engineering fundamentals, programming basics, first club project."],
  ["Specialisation begins", "Data structures, first internship preparation, certification."],
  ["Core depth", "Advanced electives, shipped projects, mock interviews begin."],
  ["Placement season", "Company drives, resume finalisation, capstone project."],
  ["Advanced track", "Higher studies preparation or extended specialisation."],
];

function Roadmap() {
  const { loading, data, error, reload } = useAsync(() => api.studentRoadmap(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SealWatermark size={210} style={{ top: -50, right: -45 }} />
      <SectionHead icon={Target} title={`Your ${data.durationYears}-year roadmap`}
        sub="Rendered from your programme's registered duration, not a fixed constant." />
      <div style={{ paddingLeft: 6 }}>
        {data.years.map((y, i) => {
          const done = y.status === "COMPLETED", current = y.status === "IN_PROGRESS";
          const c = done ? t.success : current ? t.gold : t.textFaint;
          const [title, note] = YEAR_NOTES[(y.year - 1) % YEAR_NOTES.length];
          return (
            <div key={y.year} style={{ display: "flex", gap: 16, position: "relative",
              paddingBottom: i === data.years.length - 1 ? 0 : 22 }}>
              {i < data.years.length - 1 && (
                <div style={{ position: "absolute", left: 13, top: 28, bottom: 0, width: 2,
                  background: done ? t.success : t.border }} />
              )}
              <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, zIndex: 1,
                background: current ? t.goldSoft : done ? t.successSoft : t.bgSoft,
                border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done ? <Check size={13} color={t.success} strokeWidth={3} />
                  : <span style={{ fontFamily: FONT_M, fontSize: 11, fontWeight: 700, color: c }}>{y.year}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_D, fontSize: 15, fontWeight: 700 }}>
                    Year {y.year} — {title}
                  </span>
                  <Badge tone={done ? "success" : current ? "gold" : "primary"}>
                    {y.status.replace("_", " ")}
                  </Badge>
                </div>
                <div style={{ fontSize: 12, color: t.textDim, marginTop: 5, lineHeight: 1.5 }}>{note}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
