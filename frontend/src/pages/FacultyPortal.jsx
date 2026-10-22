import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, School, ClipboardList, AlertTriangle, Users, FileText,
  Check, X, Clock, Save, Send, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Shell from "./Shell";
import { theme as t, FONT_D, FONT_M } from "../lib/theme";
import {
  Card, Badge, Button, SectionHead, Progress, Skeleton, EmptyState,
  ErrorNote, useToasts, ToastStack, Spinner, CredentialsModal,
} from "../components/Shared";
import { api } from "../lib/api";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Teaching" },
  { key: "attendance", label: "Attendance", icon: ClipboardList, group: "Teaching" },
  { key: "marks", label: "Marks Entry", icon: FileText, group: "Teaching" },
  { key: "attention", label: "Needs Attention", icon: AlertTriangle, group: "Students" },
  { key: "leave", label: "Leave Review", icon: Calendar, group: "Administration" },
  { key: "classes", label: "My Classes", icon: School, group: "Teaching" },
  { key: "students", label: "Students", icon: Users, group: "Students" },
];

const STATUSES = [
  { key: "PRESENT", label: "P", full: "Present", color: t.success },
  { key: "ABSENT", label: "A", full: "Absent", color: t.danger },
  { key: "OD", label: "OD", full: "On duty", color: t.gold },
  { key: "MEDICAL", label: "M", full: "Medical", color: "#3D7A9E" },
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

export default function FacultyPortal({ session, onSignOut }) {
  const [active, setActive] = useState("dashboard");
  const { toasts, push, dismiss } = useToasts();

  return (
    <>
      <Shell nav={NAV} active={active} setActive={setActive} session={session}
        onSignOut={onSignOut} subtitle="Faculty Portal">
        {active === "dashboard" && <Overview setActive={setActive} />}
        {active === "attendance" && <AttendanceEntry push={push} />}
        {active === "marks" && <MarksEntry push={push} />}
        {active === "attention" && <NeedsAttention />}
        {active === "leave" && <LeaveReview push={push} />}
        {active === "classes" && <Classes />}
        {active === "students" && <StudentsList />}
      </Shell>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </>
  );
}

function Overview({ setActive }) {
  const classes = useAsync(() => api.facultyClasses(), []);
  const attention = useAsync(() => api.facultyAttention(), []);
  if (classes.loading) return <Skeleton />;
  if (classes.error) return <ErrorNote message={classes.error} onRetry={classes.reload} />;

  const list = classes.data || [];
  const totalStudents = list.reduce((a, c) => a + c.studentCount, 0);
  const avgAttendance = list.length
    ? Math.round(list.reduce((a, c) => a + c.averageAttendance, 0) / list.length) : 0;
  const atRisk = list.reduce((a, c) => a + c.studentsAtRisk, 0);
  const classHealth = list.map((c) => ({
    name: c.subjectCode,
    attendance: c.averageAttendance,
    risk: c.studentsAtRisk,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="sv-stagger sv-grid-3" style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 13 }}>
        {[["Classes", list.length, School, t.primary],
          ["Students taught", totalStudents, Users, t.gold],
          ["Average attendance", `${avgAttendance}%`, ClipboardList, avgAttendance >= 75 ? t.success : t.danger],
          ["Below 75%", atRisk, AlertTriangle, atRisk ? t.danger : t.success]].map(([label, value, Icon, color]) => (
          <Card key={label} style={{ padding: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: "flex",
              alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon size={15} color={color} /></div>
            <div style={{ fontFamily: FONT_M, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 6 }}>{label}</div>
          </Card>
        ))}
      </div>

      <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={ClipboardList} title="Class health" sub="Current attendance across the classes you teach" />
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classHealth}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: t.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: t.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, fontSize: 12 }} />
                <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                  {classHealth.map((row, i) => (
                    <Cell key={i} fill={row.attendance >= 75 ? t.primary : t.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={AlertTriangle} title="Priority list" sub="Learners who may need intervention this week" right={<Button size="sm" variant="ghost" onClick={() => setActive("attention")}>See all</Button>} />
          {!attention.loading && attention.data?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
              {attention.data.slice(0, 3).map((s) => <RiskRow key={s.studentId} s={s} />)}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 12 }}>No urgent flags right now. Teaching load is stable.</div>
          )}
        </Card>
      </div>

      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={School} title="Your classes"
          right={<Button size="sm" variant="soft" onClick={() => setActive("attendance")}>Mark attendance</Button>} />
        {!list.length ? <EmptyState icon={School} title="No classes assigned"
          body="Once the administration assigns you a subject, it appears here." /> : (
          <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((c) => (
              <div key={c.subjectOfferingId} style={{ padding: "13px 15px", borderRadius: 11,
                background: t.bgSoft, border: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 9, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.gold, fontWeight: 700 }}>{c.subjectCode}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.subjectName}</span>
                    <Badge tone="primary">{c.sectionName}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: t.textFaint }}>{c.studentCount} students</span>
                    <span style={{ fontFamily: FONT_M, fontSize: 13, fontWeight: 700,
                      color: c.averageAttendance >= 75 ? t.success : t.danger }}>{c.averageAttendance}%</span>
                    {c.studentsAtRisk > 0 && <Badge tone="danger">{c.studentsAtRisk} at risk</Badge>}
                  </div>
                </div>
                <Progress pct={c.averageAttendance} color={c.averageAttendance >= 75 ? t.success : t.danger} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {!attention.loading && attention.data?.length > 0 && (
        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={AlertTriangle} title="Students who need you most"
            sub="Flagged by the scoring service, with the reason attached."
            right={<Button size="sm" variant="ghost" onClick={() => setActive("attention")}>See all</Button>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {attention.data.slice(0, 4).map((s) => (
              <RiskRow key={s.studentId} s={s} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function RiskRow({ s }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 14px",
      borderRadius: 10, background: t.bgSoft, border: `1px solid ${t.border}`, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(140deg, ${t.danger}, ${t.gold})`, display: "flex",
          alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
          {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {s.name} <span style={{ fontFamily: FONT_M, color: t.textFaint, fontWeight: 400 }}>· {s.rollNo}</span>
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 3, lineHeight: 1.4 }}>
            {(s.reasons || []).slice(0, 2).join(" · ")}
          </div>
        </div>
      </div>
      <Badge tone={s.band === "HIGH" ? "danger" : "warning"}>{s.band} · {s.riskScore}</Badge>
    </div>
  );
}

/* ─────────────── Attendance entry: both paths ─────────────── */

function AttendanceEntry({ push }) {
  const classes = useAsync(() => api.facultyClasses(), []);
  const [sectionId, setSectionId] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("period");   // period | day
  const [activePeriod, setActivePeriod] = useState(0);
  const [editable, setEditable] = useState({});     // offeringId -> may this user mark it?

  useEffect(() => {
    if (!sectionId && classes.data?.length) setSectionId(classes.data[0].classSectionId);
  }, [classes.data]);

  useEffect(() => {
    if (!sectionId) return;
    api.facultyOfferings(sectionId)
      .then((list) => {
        setEditable(Object.fromEntries(list.map((o) => [o.id, o.editable])));
      })
      .catch(() => setEditable({}));
  }, [sectionId]);
  const canEdit = (p) => editable[p.subjectOfferingId] === true;
  // Stated by the server for this signed-in faculty member, not guessed from edit rights.
  const isCoordinator = !!(classes.data || []).find((c) => c.classSectionId === sectionId)?.coordinator;

  useEffect(() => {
    if (!sectionId || !date) return;
    setLoading(true);
    api.facultyRoster(sectionId, date)
      .then((r) => { setRoster(r); setActivePeriod(0); })
      .catch((e) => push({ title: "Couldn't load the roster", body: e.message, tone: "danger" }))
      .finally(() => setLoading(false));
  }, [sectionId, date]);

  function setStatus(periodIdx, studentId, status) {
    setRoster((prev) => prev.map((p, i) => i !== periodIdx ? p : {
      ...p, roster: p.roster.map((r) => r.studentId === studentId ? { ...r, status } : r),
    }));
  }

  function markAll(periodIdx, status) {
    setRoster((prev) => prev.map((p, i) => i !== periodIdx ? p : {
      ...p, roster: p.roster.map((r) => ({ ...r, status })),
    }));
  }

  async function saveOne(periodIdx) {
    const block = roster[periodIdx];
    setSaving(true);
    try {
      const res = await api.markPeriod({
        subjectOfferingId: block.subjectOfferingId, date, period: block.period,
        entries: block.roster.map((r) => ({ studentId: r.studentId, status: r.status })),
      });
      push({ title: `Period ${block.period} saved`, body: `${res.recordsWritten} records written.`, tone: "success" });
      setRoster((prev) => prev.map((p, i) => i === periodIdx ? { ...p, alreadyMarked: true } : p));
    } catch (e) {
      push({ title: "Not saved", body: e.message, tone: "danger" });
    } finally { setSaving(false); }
  }

  async function saveDay() {
    setSaving(true);
    try {
      const res = await api.markDay({
        classSectionId: sectionId, date,
        periods: roster.filter(canEdit).map((p) => ({
          subjectOfferingId: p.subjectOfferingId, period: p.period,
          entries: p.roster.map((r) => ({ studentId: r.studentId, status: r.status })),
        })),
      });
      push({ title: "Whole day saved", body: `${res.recordsWritten} records written.`, tone: "success" });
      setRoster((prev) => prev.map((p) => ({ ...p, alreadyMarked: true })));
    } catch (e) {
      push({ title: "Not saved", body: e.message, tone: "danger" });
    } finally { setSaving(false); }
  }

  if (classes.loading) return <Skeleton />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={ClipboardList} title="Mark attendance"
          sub="Save one period between hours, or the whole day at once when catching up." />
        {sectionId && (
          <div style={{ fontSize: 11.5, marginBottom: 12, padding: "8px 11px", borderRadius: 9,
            background: isCoordinator ? t.successSoft : t.goldSoft, color: t.text,
            border: `1px solid ${isCoordinator ? t.success : t.borderGold}33` }}>
            {isCoordinator
              ? "You are the class coordinator: you can mark and correct every period of this class."
              : "You can mark only your own subject's periods. Other periods are view-only."}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ minWidth: 190, flex: 1 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Class</label>
            <select value={sectionId || ""} onChange={(e) => setSectionId(Number(e.target.value))}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff",
                border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }}>
              {[...new Map((classes.data || []).map((c) => [c.classSectionId, c])).values()]
                .map((c) => <option key={c.classSectionId} value={c.classSectionId}>{c.sectionName}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 170, flex: 1 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff",
                border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: t.bgSoft,
          border: `1px solid ${t.border}`, width: "fit-content" }}>
          {[["period", "One period"], ["day", "Whole day"]].map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)} className="sv-btn" style={{
              padding: "6px 13px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              background: mode === k ? t.primary : "transparent", color: mode === k ? "#fff" : t.textDim,
              border: "none", minHeight: 34 }}>{label}</button>
          ))}
        </div>
      </Card>

      {loading ? <Skeleton count={2} height={200} />
        : !roster?.length ? (
          <Card lift={false} style={{ padding: 8 }}>
            <EmptyState icon={Calendar} title="No classes scheduled that day"
              body="Pick a weekday when this section has periods on the timetable." />
          </Card>
        ) : mode === "period" ? (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {roster.map((p, i) => (
                <button key={i} onClick={() => setActivePeriod(i)} className="sv-btn" style={{
                  padding: "8px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                  minHeight: 40, fontFamily: FONT_M,
                  background: activePeriod === i ? t.primary : "#fff",
                  color: activePeriod === i ? "#fff" : t.textDim,
                  border: `1px solid ${activePeriod === i ? t.primary : t.border}`,
                }}>
                  P{p.period} {p.subjectCode}
                  {p.alreadyMarked && <Check size={11} style={{ marginLeft: 5 }} />}
                  {!canEdit(p) && <span style={{ marginLeft: 5, opacity: 0.6 }}>(view)</span>}
                </button>
              ))}
            </div>
            <RosterGrid block={roster[activePeriod]} idx={activePeriod} date={date}
              setStatus={setStatus} markAll={markAll} onSave={() => saveOne(activePeriod)} saving={saving}
              readOnly={!!roster[activePeriod] && !canEdit(roster[activePeriod])} />
          </>
        ) : (
          <>
            {roster.map((p, i) => (
              <RosterGrid key={i} block={p} idx={i} date={date} setStatus={setStatus}
                markAll={markAll} compact readOnly={!canEdit(p)} />
            ))}
            <Button icon={Send} onClick={saveDay} disabled={saving || !roster.some(canEdit)} full>
              {saving ? <Spinner size={15} color="#fff" /> : `Save ${roster.filter(canEdit).length} of ${roster.length} periods`}
            </Button>
          </>
        )}
    </div>
  );
}

function RosterGrid({ block, idx, date, setStatus, markAll, onSave, saving, compact, readOnly }) {
  if (!block) return null;
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = block.roster.filter((r) => r.status === s.key).length; return acc;
  }, {});

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={ClipboardList}
        title={`Period ${block.period} · ${block.subjectCode}`}
        sub={`${block.subjectName} · ${block.time || ""} ${block.room ? `· ${block.room}` : ""}`}
        right={readOnly ? <Badge tone="gold">View only</Badge> : block.alreadyMarked ? <Badge tone="success"><Check size={10} /> Marked</Badge>
          : <Badge tone="warning">Not yet marked</Badge>} />
      {readOnly && (
        <div style={{ fontSize: 11.5, color: t.textDim, background: t.bgSoft, border: `1px solid ${t.border}`,
          borderRadius: 9, padding: "8px 11px", marginBottom: 12 }}>
          This period belongs to another teacher. Only they, or the class coordinator, can change it.
        </div>
      )}

      {!readOnly && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 13 }}>
        <span style={{ fontSize: 11, color: t.textFaint, alignSelf: "center", marginRight: 4 }}>Mark everyone:</span>
        {STATUSES.map((s) => (
          <button key={s.key} onClick={() => markAll(idx, s.key)} className="sv-btn" style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
            background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}33`, minHeight: 32,
          }}>{s.full}</button>
        ))}
      </div>}

      <div className="sv-scroll" style={{ maxHeight: compact ? 260 : 420, overflowY: "auto" }}>
        {block.roster.map((r) => (
          <div key={r.studentId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, padding: "9px 11px", borderRadius: 9, marginBottom: 4,
            background: r.status === "ABSENT" ? t.dangerSoft : "transparent",
            border: `1px solid ${r.status === "ABSENT" ? `${t.danger}33` : "transparent"}` }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontFamily: FONT_M, fontSize: 11, color: t.gold, fontWeight: 700 }}>{r.rollNo}</span>
              <span style={{ fontSize: 12.5, marginLeft: 10 }}>{r.name}</span>
            </div>
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              {STATUSES.map((s) => {
                const on = r.status === s.key;
                return (
                  <button key={s.key} onClick={() => setStatus(idx, r.studentId, s.key)}
                    className="sv-btn" disabled={readOnly} title={s.full} aria-label={`${r.name}: ${s.full}`}
                    style={{
                      minWidth: 38, minHeight: 36, borderRadius: 7, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", background: on ? s.color : "#fff",
                      color: on ? "#fff" : t.textFaint,
                      border: `1px solid ${on ? s.color : t.border}`,
                    }}>{s.label}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        marginTop: 14, paddingTop: 13, borderTop: `1px solid ${t.border}`, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 13, flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <span key={s.key} style={{ fontSize: 11, color: t.textDim, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
              {s.full}: <strong style={{ fontFamily: FONT_M }}>{counts[s.key]}</strong>
            </span>
          ))}
        </div>
        {onSave && !readOnly && (
          <Button icon={Save} onClick={onSave} disabled={saving}>
            {saving ? <Spinner size={14} color="#fff" /> : "Save this period"}
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ─────────────── Marks entry with the publish gate ─────────────── */

function MarksEntry({ push }) {
  const classes = useAsync(() => api.facultyClasses(), []);
  const [offeringId, setOfferingId] = useState(null);
  const [sectionId, setSectionId] = useState(null);
  const [type, setType] = useState("IA1");
  const [maxMarks, setMaxMarks] = useState(50);
  const [options, setOptions] = useState([]);   // every subject this user may enter marks for
  const [scores, setScores] = useState({});
  const [students, setStudents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!classes.data) return;
    const ids = [...new Set(classes.data.map((c) => c.classSectionId))];
    Promise.all(ids.map((id) => api.facultyOfferings(id).catch(() => []))).then((lists) => {
      const opts = lists.flat().filter((o) => o.editable);
      setOptions(opts);
      if (opts.length && !offeringId) { setOfferingId(opts[0].id); setSectionId(opts[0].classSectionId); }
    });
  }, [classes.data]);

  const MAX_FOR = { IA1: 50, IA2: 50, UNIT_TEST: 25, GROUP_PRESENTATION: 10, ASSIGNMENT: 10, MODEL_EXAM: 100 };
  function pickType(x) { setType(x); }

  // Start from what is already stored, so the teacher sees (and keeps) earlier scores.
  const loadSheet = () => api.facultyMarkSheet(offeringId, type).then((sheet) => {
    setScores(Object.fromEntries(Object.entries(sheet.scores || {}).map(([id, v]) => [id, String(v)])));
    setMaxMarks(sheet.maxMarks ?? MAX_FOR[type] ?? 50);
    setPublished(!!sheet.published);
  }).catch(() => { setScores({}); setMaxMarks(MAX_FOR[type] ?? 50); setPublished(false); });
  useEffect(() => { if (offeringId) { setScores({}); loadSheet(); } }, [offeringId, type]);

  useEffect(() => {
    if (!sectionId) return;
    api.facultyStudents(sectionId).then(setStudents).catch(() => setStudents([]));
  }, [sectionId]);

  async function save(publish) {
    setBusy(true);
    try {
      const res = await api.saveMarks({
        subjectOfferingId: offeringId, type, maxMarks: Number(maxMarks),
        // Only boxes with a value are sent; a blank box leaves any stored score alone.
        scores: students
          .filter((s) => scores[s.studentId] !== undefined && scores[s.studentId] !== "")
          .map((s) => ({ studentId: s.studentId, score: Number(scores[s.studentId]) })),
        publish,
      });
      push({ title: res.published ? "Marks published" : "Draft saved", body: res.message,
        tone: res.published ? "success" : "primary" });
      loadSheet();
    } catch (e) {
      push({ title: "Not saved", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  if (classes.loading) return <Skeleton />;
  if (!options.length) return (
    <Card lift={false} style={{ padding: 8 }}>
      <EmptyState icon={FileText} title="No subjects assigned to you yet"
        body="Once the administrator assigns you a subject, or makes you a class coordinator, it appears here." />
    </Card>
  );

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={FileText} title="Marks entry"
        sub="Drafts stay private. Nothing appears on a student's record until you publish."
        right={published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Not published</Badge>} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ minWidth: 200, flex: 2 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Class</label>
          <select value={offeringId || ""} onChange={(e) => {
            const id = Number(e.target.value);
            setOfferingId(id);
            setSectionId(options.find((o) => o.id === id)?.classSectionId);
          }} style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff",
            border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.subjectCode} — {o.sectionLabel}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 130, flex: 1 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Assessment</label>
          <select value={type} onChange={(e) => pickType(e.target.value)}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff",
              border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }}>
            {["IA1", "IA2", "UNIT_TEST", "GROUP_PRESENTATION", "ASSIGNMENT", "MODEL_EXAM"].map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 100 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Max marks</label>
          <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff",
              border: `1px solid ${t.border}`, fontSize: 13, minHeight: 44 }} />
        </div>
      </div>

      {!students.length ? <EmptyState icon={Users} title="No students in this class yet" /> : (
        <>
          <div className="sv-scroll" style={{ maxHeight: 420, overflowY: "auto" }}>
            {students.map((s) => {
              const val = scores[s.studentId] ?? "";
              const invalid = val !== "" && (Number(val) < 0 || Number(val) > Number(maxMarks));
              return (
                <div key={s.studentId} style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "9px 11px", borderRadius: 9, marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT_M, fontSize: 11, color: t.gold, fontWeight: 700, width: 82 }}>{s.rollNo}</span>
                  <span style={{ fontSize: 12.5, flex: 1, minWidth: 0 }}>{s.name}</span>
                  <input type="number" value={val} placeholder="—"
                    onChange={(e) => setScores({ ...scores, [s.studentId]: e.target.value })}
                    style={{ width: 84, padding: "8px 10px", borderRadius: 8, background: "#fff",
                      border: `1px solid ${invalid ? t.danger : t.border}`, fontSize: 13,
                      fontFamily: FONT_M, textAlign: "center", minHeight: 40 }} />
                  <span style={{ fontFamily: FONT_M, fontSize: 11, color: t.textFaint, width: 26 }}>/{maxMarks}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 14,
            paddingTop: 13, borderTop: `1px solid ${t.border}`, flexWrap: "wrap" }}>
            {!published && <Button variant="ghost" icon={Save} onClick={() => save(false)} disabled={busy}>Save draft</Button>}
            <Button icon={Send} onClick={() => save(true)} disabled={busy}>
              {busy ? <Spinner size={14} color="#fff" /> : published ? "Update published marks" : "Publish to students"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function LeaveReview({ push }) {
  const { loading, data, error, reload } = useAsync(() => api.facultyPendingLeaveApplications(), []);

  async function decide(id, action, note) {
    try {
      if (action === "REJECT") {
        if (!note.trim()) throw new Error("A rejection note is required.");
        await api.rejectLeaveApplication(id, note);
      } else {
        await api.approveLeaveApplication(id);
      }
      push({ title: action === "REJECT" ? "Request rejected" : "Request approved", tone: action === "REJECT" ? "warning" : "success" });
      reload();
    } catch (e) {
      push({ title: "Update failed", body: e.message, tone: "danger" });
    }
  }

  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data?.length) return <EmptyState icon={Calendar} title="No pending leave requests" body="Approved and rejected records stay in the student ledger." />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={Calendar} title="Leave review" sub="Approve OD requests to auto-mark attendance, or reject with a reason." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 15px", borderRadius: 11, background: t.bgSoft, border: `1px solid ${t.border}`, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.studentName}</span>
                <span style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint }}>{r.rollNo}</span>
                <Badge tone={r.type === "OD" ? "gold" : "primary"}>{r.type}</Badge>
              </div>
              <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 4 }}>{r.className} · {r.fromDate} to {r.toDate}</div>
              <div style={{ fontSize: 12, color: t.textDim, marginTop: 7 }}>{r.reason}</div>
            </div>
            <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
              <input id={`reject-${r.id}`} placeholder="Reject note" style={{ minWidth: 140, padding: "8px 10px", borderRadius: 8, border: `1px solid ${t.border}` }} />
              <Button size="sm" variant="danger" onClick={() => decide(r.id, "REJECT", document.getElementById(`reject-${r.id}`).value)}>Reject</Button>
              <Button size="sm" onClick={() => decide(r.id, "APPROVE", "Approved by faculty")}>Approve</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NeedsAttention() {
  const { loading, data, error, reload } = useAsync(() => api.facultyAttention(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data.length) return <EmptyState icon={Check} title="Nobody is flagged right now"
    body="Students whose attendance or marks trend downward will appear here." />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={AlertTriangle} title="Students who need attention"
        sub="Ranked by risk score. Every flag carries the reason behind it." />
      <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((s) => <RiskRow key={s.studentId} s={s} />)}
      </div>
    </Card>
  );
}

function Classes() {
  const { loading, data, error, reload } = useAsync(() => api.facultyClasses(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={School} title="My classes" />
      <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(data || []).map((c) => (
          <div key={c.subjectOfferingId} style={{ padding: "13px 15px", borderRadius: 11,
            background: t.bgSoft, border: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: FONT_D, fontSize: 14, fontWeight: 700 }}>{c.subjectName}</div>
                <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 3 }}>
                  {c.subjectCode} · {c.sectionName} · {c.studentCount} students
                </div>
              </div>
              <Badge tone={c.averageAttendance >= 75 ? "success" : "danger"}>{c.averageAttendance}% average</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StudentsList() {
  const classes = useAsync(() => api.facultyClasses(), []);
  const [sectionId, setSectionId] = useState(null);
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [issued, setIssued] = useState(null);   // one-time password of the student just added
  const [form, setForm] = useState({ name: "", rollNumber: "", year: "", batch: "" });
  const [submitting, setSubmitting] = useState(false);

  const coordinatorSections = (classes.data || []).filter((c) => c.subjectCode === "COORD" || c.subjectOfferingId == null);

  useEffect(() => {
    if (!sectionId && coordinatorSections.length) setSectionId(coordinatorSections[0].classSectionId);
  }, [classes.data]);

  useEffect(() => {
    if (sectionId) {
      api.facultyStudents(sectionId).then(setStudents).catch(() => setStudents([]));
    }
  }, [sectionId]);

  const filtered = students.filter((s) =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.rollNo.toLowerCase().includes(query.toLowerCase()));

  const refreshRoster = () => {
    if (sectionId) api.facultyStudents(sectionId).then(setStudents).catch(() => setStudents([]));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!sectionId) return;
    setSubmitting(true);
    try {
      const res = await api.facultyAddStudent(sectionId, {
        name: form.name.trim(),
        rollNumber: form.rollNumber.trim(),
        year: Number(form.year),
        batch: Number(form.batch),
      });
      setForm({ name: "", rollNumber: "", year: "", batch: "" });
      setShowAddForm(false);
      setIssued({ title: `${res.name} added to the class`,
        rows: [{ username: res.rollNo, name: res.name, temporaryPassword: res.temporaryPassword }] });
      refreshRoster();
    } catch (err) {
      window.alert(err.message || "Unable to add student");
    } finally {
      setSubmitting(false);
    }
  };

  if (classes.loading) return <Skeleton />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={Users} title="Students" sub="Search by name or roll number." />
      <CredentialsModal open={!!issued} onClose={() => setIssued(null)} title={issued?.title} rows={issued?.rows || []} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 170 }}>
          <label htmlFor="faculty-section-select" style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Class</label>
          <select id="faculty-section-select" value={sectionId || ""} onChange={(e) => setSectionId(Number(e.target.value))}
            aria-label="Choose class section"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`,
              fontSize: 13, minHeight: 44 }}>
            {[...new Map((classes.data || []).map((c) => [c.classSectionId, c])).values()]
              .map((c) => <option key={c.classSectionId} value={c.classSectionId}>{c.sectionName}</option>)}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 170 }}>
          <label htmlFor="faculty-student-search" style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Search students</label>
          <input id="faculty-student-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students"
            aria-label="Search students by name or roll number"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`,
              fontSize: 13, minHeight: 44 }} />
        </div>
      </div>

      {coordinatorSections.length > 0 && (
        <div style={{ marginBottom: 16, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgSoft, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Add students</div>
              <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 3 }}>Coordinator-only flow for {coordinatorSections.find((c) => c.classSectionId === sectionId)?.sectionName || "this section"}</div>
            </div>
            <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>{showAddForm ? "Hide form" : "Add student"}</Button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddStudent} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Student name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}` }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Roll number</label>
                <input value={form.rollNumber} onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}` }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Year</label>
                <input type="number" min="1" max="8" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}` }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Batch</label>
                <input type="number" min="2000" value={form.batch} onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}` }} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 11.5, color: t.textDim }}>Section: <strong>{coordinatorSections.find((c) => c.classSectionId === sectionId)?.sectionName || "—"}</strong></div>
                <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Save student"}</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {!filtered.length ? <EmptyState icon={Users} title="Nobody matched"
        body="Try a different name or roll number." /> : (
        <div className="sv-scroll" style={{ maxHeight: 480, overflowY: "auto" }}>
          {filtered.map((s) => (
            <div key={s.studentId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, padding: "11px 12px", borderRadius: 9, marginBottom: 4, background: t.bgSoft }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: FONT_M, fontSize: 11, color: t.gold, fontWeight: 700 }}>{s.rollNo}</span>
                <span style={{ fontSize: 12.5, marginLeft: 10 }}>{s.name}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: FONT_M, fontSize: 11.5, color: t.textDim }}>CGPA {s.cgpa?.toFixed(2)}</span>
                <Badge tone={s.attendance >= 75 ? "success" : "danger"}>{s.attendance}%</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
