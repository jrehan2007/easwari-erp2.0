import React, { useEffect, useState } from "react";
import { ClipboardCheck, FlaskConical, GraduationCap, Award, AlertTriangle, BookOpen } from "lucide-react";
import { theme as t, FONT_D, FONT_M } from "../lib/theme";
import { Card, Badge, SectionHead, Progress, Skeleton, EmptyState, ErrorNote } from "../components/Shared";
import { api } from "../lib/api";

function useAsync(fn) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const reload = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => setState({ loading: false, data, error: null }))
      .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

const pctColor = (p) => (p == null ? t.textFaint : p >= 75 ? t.success : p >= 50 ? t.warning : t.danger);
const GRADE_TONE = { O: "gold", "A+": "success", A: "success", "B+": "primary", B: "primary", C: "warning", RA: "danger", AB: "danger" };

function Stat({ label, value, sub, color = t.text }) {
  return (
    <Card lift={false} style={{ padding: "14px 16px" }}>
      <div style={{ fontFamily: FONT_M, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: t.textFaint }}>{label}</div>
      <div style={{ fontFamily: FONT_D, fontSize: 26, fontWeight: 800, color, marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 3 }}>{sub}</div>}
    </Card>
  );
}

/** One course card: each published component with its own maximum. */
function CourseCard({ c }) {
  return (
    <Card lift={false} style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 11, color: t.gold, fontWeight: 700 }}>{c.subjectCode} · {c.credits} credits</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{c.subjectName}</div>
          {c.faculty && <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 2 }}>{c.faculty}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 20, fontWeight: 800, color: pctColor(c.percentage) }}>
            {c.percentage == null ? "—" : `${c.percentage}%`}</div>
          <div style={{ fontSize: 10, color: t.textFaint }}>overall</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {c.components.map((p) => {
          const pct = p.score == null ? null : Math.round((p.score / p.maxMarks) * 100);
          return (
            <div key={p.type}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>{p.label}</span>
                <span style={{ fontFamily: FONT_M, fontWeight: 700 }}>{p.score == null ? "—" : p.score}<span style={{ color: t.textFaint }}>/{p.maxMarks}</span></span>
              </div>
              <Progress pct={pct || 0} height={5} color={pctColor(pct)} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─────────────── Assessments ─────────────── */
export function Assessments() {
  const { loading, data, error, reload } = useAsync(() => api.studentAssessments());
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data.length) return <Card lift={false} style={{ padding: 8 }}><EmptyState icon={ClipboardCheck} title="No assessments published yet"
    body="Internal tests, unit tests and assignments appear here once your teachers publish them." /></Card>;
  const avg = Math.round(data.reduce((n, c) => n + (c.percentage || 0), 0) / data.length);
  const best = [...data].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];
  const low = data.filter((c) => (c.percentage || 0) < 60);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="sv-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="Courses" value={data.length} sub="this semester" />
        <Stat label="Average" value={`${avg}%`} sub="across published components" color={pctColor(avg)} />
        <Stat label="Strongest" value={best.subjectCode} sub={`${best.percentage}% · ${best.subjectName}`} color={t.success} />
        <Stat label="Needs attention" value={low.length} sub={low.length ? low.map((c) => c.subjectCode).join(", ") : "Every course is above 60%"}
          color={low.length ? t.danger : t.success} />
      </div>
      <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        {data.map((c) => <CourseCard key={c.subjectCode} c={c} />)}
      </div>
      <div style={{ fontSize: 11.5, color: t.textDim }}>
        Only published marks are shown. A test your teacher has entered but not released (for example the model examination) appears once it is published.
      </div>
    </div>
  );
}

/* ─────────────── Practicals ─────────────── */
export function Practicals() {
  const { loading, data, error, reload } = useAsync(() => api.studentPracticals());
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  const { current, completed } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={FlaskConical} title="This semester's laboratories"
          sub="Observation, record, model practical and viva, as published by your lab in-charge." />
        {!current.length ? <EmptyState icon={FlaskConical} title="No practical marks published yet" /> : (
          <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {current.map((c) => <CourseCard key={c.subjectCode} c={c} />)}
          </div>
        )}
      </Card>
      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={Award} title="Completed practical examinations"
          sub="End-semester practical results: internal out of 60, external out of 40." />
        {!completed.length ? <EmptyState icon={Award} title="No practical results yet" /> : (
          <ResultTable rows={completed} />
        )}
      </Card>
    </div>
  );
}

function ResultTable({ rows }) {
  return (
    <div className="sv-scroll" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 620, fontSize: 12.5, borderCollapse: "collapse" }}>
        <thead>
          <tr>{["Code", "Course", "Cr", "Internal", "External", "Total", "Grade"].map((h) => (
            <th key={h} style={{ textAlign: h === "Course" ? "left" : "center", padding: "8px 10px", fontFamily: FONT_M, fontSize: 9.5,
              letterSpacing: "0.12em", textTransform: "uppercase", color: t.textFaint, borderBottom: `1px solid ${t.border}`, fontWeight: 500 }}>{h}</th>))}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subjectCode} style={{ background: r.passed ? "transparent" : t.dangerSoft }}>
              <td style={{ padding: "10px", textAlign: "center", fontFamily: FONT_M, fontSize: 11, color: t.gold, fontWeight: 700, borderBottom: `1px solid ${t.border}` }}>{r.subjectCode}</td>
              <td style={{ padding: "10px", borderBottom: `1px solid ${t.border}` }}>
                {r.subjectName}{r.laboratory && <span style={{ fontSize: 10.5, color: t.textFaint }}> · practical</span>}</td>
              <td style={{ padding: "10px", textAlign: "center", borderBottom: `1px solid ${t.border}` }}>{r.credits}</td>
              <td style={{ padding: "10px", textAlign: "center", fontFamily: FONT_M, borderBottom: `1px solid ${t.border}` }}>{r.internalMarks}</td>
              <td style={{ padding: "10px", textAlign: "center", fontFamily: FONT_M, borderBottom: `1px solid ${t.border}` }}>{r.externalMarks}</td>
              <td style={{ padding: "10px", textAlign: "center", fontFamily: FONT_M, fontWeight: 700, borderBottom: `1px solid ${t.border}` }}>{r.total}</td>
              <td style={{ padding: "10px", textAlign: "center", borderBottom: `1px solid ${t.border}` }}>
                <Badge tone={GRADE_TONE[r.grade] || "primary"}>{r.grade}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────── University examinations ─────────────── */
export function UniversityExams() {
  const { loading, data, error, reload } = useAsync(() => api.studentUniversity());
  const [open, setOpen] = useState(null);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data.semesters.length) return <Card lift={false} style={{ padding: 8 }}><EmptyState icon={GraduationCap}
    title="No university results yet" body="Results appear here after your first end-semester examination." /></Card>;
  const shown = open ?? data.semesters[data.semesters.length - 1].semester;
  const sem = data.semesters.find((s) => s.semester === shown);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="sv-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="CGPA" value={data.cgpa.toFixed(2)} sub="university examinations" color={t.gold} />
        <Stat label="Credits earned" value={data.creditsEarned} sub={`over ${data.semesters.length} semester${data.semesters.length > 1 ? "s" : ""}`} />
        <Stat label="Standing arrears" value={data.standingArrears} sub={data.standingArrears ? "Clear them in the next session" : "All clear"}
          color={data.standingArrears ? t.danger : t.success} />
        <Stat label="Latest SGPA" value={data.semesters[data.semesters.length - 1].sgpa.toFixed(2)}
          sub={data.semesters[data.semesters.length - 1].examSession} />
      </div>

      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={GraduationCap} title="Semester results"
          sub="Anna University ten-point grading. O 10 · A+ 9 · A 8 · B+ 7 · B 6 · C 5 · RA re-appearance." />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {data.semesters.map((s) => (
            <button key={s.semester} onClick={() => setOpen(s.semester)} className="sv-btn" style={{
              padding: "9px 14px", borderRadius: 10, cursor: "pointer", minHeight: 44, textAlign: "left",
              background: s.semester === shown ? t.primary : "#fff", color: s.semester === shown ? "#fff" : t.text,
              border: `1px solid ${s.semester === shown ? t.primary : t.border}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>Semester {s.semester}</div>
              <div style={{ fontSize: 10.5, opacity: 0.85 }}>{s.examSession} · SGPA {s.sgpa.toFixed(2)}</div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: t.textDim, marginBottom: 10 }}>
          <span>Registered <strong>{sem.creditsRegistered}</strong> credits</span>
          <span>Earned <strong>{sem.creditsEarned}</strong></span>
          <span>SGPA <strong style={{ color: t.gold }}>{sem.sgpa.toFixed(2)}</strong></span>
          {sem.arrears > 0 && <span style={{ color: t.danger, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={13} /> {sem.arrears} arrear{sem.arrears > 1 ? "s" : ""}</span>}
        </div>
        <ResultTable rows={sem.courses} />
      </Card>
      <div style={{ fontSize: 11.5, color: t.textDim, display: "flex", gap: 6, alignItems: "center" }}>
        <BookOpen size={13} /> Your dashboard CGPA also counts this semester's published internals until its results are declared.
      </div>
    </div>
  );
}
