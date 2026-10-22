import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, ShieldCheck, Building2, AlertTriangle, ScrollText, Inbox,
  UserPlus, Upload, Download, KeyRound, Check, X, Search, Users, GraduationCap,
  Calendar, Trash2, BookOpen, Plus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Shell from "./Shell";
import { theme as t, FONT_D, FONT_M } from "../lib/theme";
import {
  Card, Badge, Button, SectionHead, Progress, Skeleton, EmptyState, ErrorNote,
  Modal, Field, SealWatermark, useToasts, ToastStack, Spinner, CredentialsModal,
} from "../components/Shared";
import { api, download } from "../lib/api";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Oversight" },
  { key: "access", label: "Access Management", icon: ShieldCheck, group: "Administration" },
  { key: "risk", label: "Risk & Alerts", icon: AlertTriangle, group: "Oversight" },
  { key: "leave", label: "Leave Requests", icon: Calendar, group: "Administration" },
  { key: "requests", label: "Service Queue", icon: Inbox, group: "Administration" },
  { key: "courses", label: "Courses & Timetable", icon: BookOpen, group: "Administration" },
  { key: "org", label: "Departments & Classes", icon: Building2, group: "Oversight" },
  { key: "departments", label: "Departments", icon: Building2, group: "Oversight" },
  { key: "audit", label: "Audit Trail", icon: ScrollText, group: "Administration" },
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

export default function AdminPortal({ session, onSignOut }) {
  const [active, setActive] = useState("dashboard");
  const { toasts, push, dismiss } = useToasts();

  return (
    <>
      <Shell nav={NAV} active={active} setActive={setActive} session={session}
        onSignOut={onSignOut} subtitle="Administration">
        {active === "dashboard" && <Pulse setActive={setActive} />}
        {active === "access" && <AccessManagement push={push} />}
        {active === "risk" && <RiskAlerts />}
        {active === "leave" && <LeaveRequests />}
        {active === "requests" && <ServiceQueue push={push} />}
        {active === "courses" && <CourseManagement push={push} />}
        {active === "org" && <OrganizationManagement push={push} />}
        {active === "departments" && <Departments />}
        {active === "audit" && <AuditTrail />}
      </Shell>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </>
  );
}

/* ─────────────── Institution pulse ─────────────── */

function Pulse({ setActive }) {
  const { loading, data, error, reload } = useAsync(() => api.adminDashboard(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const d = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="sv-stagger sv-grid-3" style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 13 }}>
        {[["Students", d.students, GraduationCap, t.primary, "Active enrolments"],
          ["Faculty", d.faculty, Users, t.gold, "Teaching staff"],
          ["Attendance", `${d.institutionAttendance}%`, LayoutDashboard,
            d.institutionAttendance >= 75 ? t.success : t.danger, "Institution-wide"],
          ["Open requests", d.openRequests, Inbox, d.openRequests ? t.warning : t.success, "Awaiting action"]]
          .map(([label, value, Icon, color, note]) => (
          <Card key={label} style={{ padding: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: "flex",
              alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon size={15} color={color} /></div>
            <div style={{ fontFamily: FONT_M, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 6, fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 10, color: t.textFaint, marginTop: 3 }}>{note}</div>
          </Card>
        ))}
      </div>

      <div className="sv-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card lift={false} style={{ padding: 18 }}>
          <SealWatermark size={180} style={{ bottom: -45, right: -35 }} />
          <SectionHead icon={Building2} title="Attendance by department"
            sub="Every period recorded this semester, rolled up per department." />
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="department" tick={{ fill: t.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: t.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${t.border}`,
                  borderRadius: 9, fontSize: 12 }} />
                <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                  {(d.departmentStats || []).map((row, i) => (
                    <Cell key={i} fill={row.attendance >= 75 ? t.primary : t.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={AlertTriangle} title="High-risk students"
            sub="Scored by the Python service across every enrolled student."
            right={<Button size="sm" variant="ghost" onClick={() => setActive("risk")}>Details</Button>} />
          {!(d.riskDistribution || []).length ? <EmptyState icon={Check} title="Nothing flagged" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 6 }}>
              {d.riskDistribution.map((r) => {
                const total = d.students || 1;
                const pct = Math.round((r.highRisk / total) * 100 * 3);
                return (
                  <div key={r.department}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.department}</span>
                      <span style={{ fontFamily: FONT_M, fontSize: 12, fontWeight: 700,
                        color: r.highRisk ? t.danger : t.success }}>{r.highRisk} students</span>
                    </div>
                    <Progress pct={pct} color={r.highRisk ? t.danger : t.success} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────── Confirm before deleting ─────────────── */

/** `target` is { title, body, run } or null. `run` performs the delete and may throw. */
function ConfirmDelete({ target, onClose }) {
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try { await target.run(); onClose(); } finally { setBusy(false); }
  }
  return (
    <Modal open={!!target} onClose={() => !busy && onClose()} eyebrow="Confirm" title={target?.title || ""} width={440}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" icon={Trash2} onClick={confirm} disabled={busy}>
          {busy ? <Spinner size={14} /> : "Delete"}</Button></>}>
      <div style={{ fontSize: 12.5, color: t.textDim, lineHeight: 1.55 }}>{target?.body}</div>
    </Modal>
  );
}

/* ─────────────── Access management ─────────────── */

const BLANK = { username: "", name: "", role: "STUDENT", email: "", phone: "",
  departmentCode: "", programCode: "", section: "", year: "", semester: "",
  staffCode: "", designation: "" };

function Select({ label, value, onChange, options, placeholder, hint, disabled }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        style={{
          width: "100%", padding: "11px 13px", borderRadius: 9,
          background: disabled ? t.bgSoft : "#fff", border: `1px solid ${t.border}`,
          color: value ? t.text : t.textFaint, fontSize: 13.5, minHeight: 44,
          cursor: disabled ? "not-allowed" : "pointer",
        }}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <div style={{ fontSize: 10.5, color: t.textFaint, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function AccessManagement({ push }) {
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [issued, setIssued] = useState(null);   // { title, rows } of one-time passwords to show once
  const [confirmTarget, setConfirmTarget] = useState(null);
  const fileRef = useRef();
  const users = useAsync(() => api.adminUsers(roleFilter === "ALL" ? null : roleFilter), [roleFilter]);
  const reference = useAsync(() => api.adminReference(), []);
  const programs = reference.data?.programs || [];
  const departments = reference.data?.departments || [];
  const sections = programs.find((p) => p.code === form.programCode)?.sections || [];

  function formProblem() {
    if (!form.username.trim()) return "Enter a username.";
    if (!form.name.trim()) return "Enter the person's full name.";
    if (form.role === "STUDENT" && (!form.programCode || !form.year || !form.section))
      return "Choose a programme and class for the student.";
    if (form.role === "FACULTY" && !form.departmentCode) return "Choose a department for the faculty member.";
    return null;
  }

  async function create() {
    const problem = formProblem();
    if (problem) { push({ title: "Not created", body: problem, tone: "danger" }); return; }
    setBusy(true);
    try {
      const res = await api.createUser({
        ...form,
        username: form.username.trim(),
        name: form.name.trim(),
        year: form.year === "" ? null : Number(form.year),
        semester: form.semester === "" ? null : Number(form.semester),
      });
      push({ title: `${res.username} created`, body: "Copy the temporary password before closing.", tone: "success" });
      setIssued({ title: `${res.name} can now sign in`,
        rows: [{ username: res.username, name: res.name, temporaryPassword: res.initialPassword }] });
      setCreateOpen(false); setForm(BLANK); users.reload();
    } catch (e) {
      push({ title: "Not created", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  async function toggleAccess(u) {
    try {
      await api.setUserAccess(u.id, !u.active);
      push({ title: u.active ? "Access revoked" : "Access restored",
        body: `${u.username} ${u.active ? "can no longer sign in" : "can sign in again"}.`,
        tone: u.active ? "warning" : "success" });
      users.reload();
    } catch (e) { push({ title: "Couldn't change access", body: e.message, tone: "danger" }); }
  }

  function askDelete(u) {
    setConfirmTarget({
      title: `Delete ${u.name}?`,
      body: u.role === "STUDENT"
        ? `${u.username} and all of their attendance, marks, leave and service requests will be permanently removed. This can't be undone.`
        : `${u.username} will be permanently removed. Classes and students they were linked to will be left unassigned. This can't be undone.`,
      run: async () => {
        try {
          await api.deleteUser(u.id);
          push({ title: `${u.username} deleted`, tone: "warning" });
          users.reload();
        } catch (e) { push({ title: "Couldn't delete", body: e.message, tone: "danger" }); }
      },
    });
  }

  async function resetPassword(u) {
    try {
      const res = await api.resetUserPassword(u.id);
      setIssued({ title: `Password reset for ${u.name}`,
        rows: [{ username: u.username, name: u.name, temporaryPassword: res.temporaryPassword }] });
    } catch (e) { push({ title: "Reset failed", body: e.message, tone: "danger" }); }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.bulkImport(file);
      setImportResult(res);
      if (res.credentials?.length) setIssued({ title: `${res.credentials.length} accounts created`, rows: res.credentials });
      push({ title: `${res.created} accounts created`,
        body: res.skipped ? `${res.skipped} rows skipped.` : "Every row imported cleanly.",
        tone: res.skipped ? "warning" : "success" });
      users.reload();
    } catch (err) {
      push({ title: "Import failed", body: err.message, tone: "danger" });
    } finally { setBusy(false); e.target.value = ""; }
  }

  const list = (users.data || []).filter((u) =>
    !query || u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card lift={false} style={{ padding: 18 }}>
          <SectionHead icon={ShieldCheck} title="Access Management"
            sub="Provision accounts one at a time or by spreadsheet. Every action is written to the audit trail."
            right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="sm" variant="ghost" icon={Download}
                onClick={async () => {
                  try { download(await api.importTemplate(), "user-import-template.xlsx"); }
                  catch (e) { push({ title: "Download failed", body: e.message, tone: "danger" }); }
                }}>Template</Button>
              <Button size="sm" variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}
                disabled={busy}>Bulk import</Button>
              <Button size="sm" icon={UserPlus} onClick={() => setCreateOpen(true)}>New account</Button>
            </div>} />
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: "none" }} />

          <CredentialsModal open={!!issued} onClose={() => setIssued(null)} title={issued?.title} rows={issued?.rows || []} />

          {importResult && (
            <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 14,
              background: importResult.skipped ? t.warningSoft : t.successSoft,
              border: `1px solid ${importResult.skipped ? t.warning : t.success}33` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                Imported {importResult.created}, skipped {importResult.skipped}
              </div>
              {(importResult.errors || []).slice(0, 4).map((err, i) => (
                <div key={i} style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>{err}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
              {["ALL", "STUDENT", "FACULTY", "ADMIN"].map((r) => (
                <button key={r} onClick={() => setRoleFilter(r)} className="sv-btn" style={{
                  padding: "7px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                  minHeight: 44, background: roleFilter === r ? t.primary : "transparent",
                  color: roleFilter === r ? "#fff" : t.textDim,
                  border: `1px solid ${roleFilter === r ? t.primary : t.border}`,
                }}>{r === "ALL" ? "Everyone" : r.charAt(0) + r.slice(1).toLowerCase()}</button>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="admin-user-search" style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Search users</label>
              <input id="admin-user-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or username"
                aria-label="Search users by name or username"
                style={{ width: "100%", padding: "9px 13px", borderRadius: 8, background: "#fff", border: `1px solid ${t.border}`,
                  fontSize: 12.5, minHeight: 44 }} />
            </div>
          </div>

          {users.loading ? <Skeleton count={3} height={56} />
            : !list.length ? <EmptyState icon={Search} title="Nobody matched" body="Try a different search." />
            : (
              <div className="sv-scroll" style={{ maxHeight: 520, overflowY: "auto" }}>
                {list.map((u) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, padding: "11px 13px", borderRadius: 10, marginBottom: 5, background: t.bgSoft,
                    border: `1px solid ${u.active ? t.border : `${t.danger}33`}`, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{u.name}</span>
                        <Badge tone={u.role === "ADMIN" ? "danger" : u.role === "FACULTY" ? "gold" : "primary"}>
                          {u.role.toLowerCase()}
                        </Badge>
                        {!u.active && <Badge tone="danger">deactivated</Badge>}
                      </div>
                      <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 3 }}>
                        {u.username}{u.department ? ` · ${u.department}` : ""} · created {u.createdAt}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                      <Button size="sm" variant="ghost" icon={KeyRound}
                        onClick={() => resetPassword(u)}>Reset</Button>
                      <Button size="sm" variant={u.active ? "danger" : "soft"} icon={u.active ? X : Check}
                        onClick={() => toggleAccess(u)}>{u.active ? "Revoke" : "Restore"}</Button>
                      <Button size="sm" variant="danger" icon={Trash2}
                        onClick={() => askDelete(u)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} eyebrow="Access Management"
        title="Create an account" width={520}
        footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy}>
            {busy ? <Spinner size={14} color="#fff" /> : "Create account"}</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Role</label>
            <div style={{ display: "flex", gap: 7 }}>
              {["STUDENT", "FACULTY", "ADMIN"].map((r) => (
                <button key={r} onClick={() => setForm({ ...form, role: r })} className="sv-btn" style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                  cursor: "pointer", minHeight: 42,
                  background: form.role === r ? t.primary : "#fff", color: form.role === r ? "#fff" : t.textDim,
                  border: `1px solid ${form.role === r ? t.primary : t.border}`,
                }}>{r.charAt(0) + r.slice(1).toLowerCase()}</button>
              ))}
            </div>
          </div>

          <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })}
            placeholder={form.role === "STUDENT" ? "CSE23200" : "EEC-CSE010"}
            hint={form.role === "STUDENT" ? "Students sign in with their roll number." : "Staff sign in with their employee code."} />
          <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />

          {form.role === "STUDENT" && (
            <>
              <Select label="Programme" value={form.programCode}
                placeholder="Choose a programme"
                onChange={(v) => setForm({ ...form, programCode: v, section: "", year: "", semester: "" })}
                options={programs.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` }))} />
              <Select label="Class" disabled={!form.programCode}
                value={form.year && form.section ? `${form.year}|${form.section}` : ""}
                placeholder={form.programCode ? "Choose a class" : "Pick a programme first"}
                onChange={(v) => {
                  const [year, section] = v.split("|");
                  const cs = sections.find((c) => String(c.year) === year && c.section === section);
                  setForm({ ...form, year: Number(year), section, semester: cs ? cs.semester : "" });
                }}
                options={sections.map((c) => ({ value: `${c.year}|${c.section}`, label: c.label }))}
                hint="Only classes that exist are listed, so the student always lands in a real roster." />
            </>
          )}
          {form.role === "FACULTY" && (
            <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <Select label="Department" value={form.departmentCode}
                  placeholder="Choose a department"
                  onChange={(v) => setForm({ ...form, departmentCode: v })}
                  options={departments.map((d) => ({ value: d.code, label: `${d.code} — ${d.name}` }))} />
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <Field label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
              </div>
            </div>
          )}

          <div style={{ padding: "10px 12px", borderRadius: 9, background: t.goldSoft,
            border: `1px solid ${t.borderGold}`, fontSize: 11.5, color: t.textDim, lineHeight: 1.5 }}>
            A temporary password is issued automatically. The account holder must change it the first time
            they sign in.
          </div>
        </div>
      </Modal>
      <ConfirmDelete target={confirmTarget} onClose={() => setConfirmTarget(null)} />
    </>
  );
}

/* ─────────────── Leave and oversight ─────────────── */

function LeaveRequests() {
  const { loading, data, error, reload } = useAsync(() => api.adminLeaveApplications(), []);

  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data?.length) return <EmptyState icon={Calendar} title="No leave activity" body="Student and faculty leave requests appear here once submitted." />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={Calendar} title="Leave and OD requests" sub="Institution-wide view for approvals and history." />
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
            <Badge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{r.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────── Risk, queue, departments, audit ─────────────── */

function RiskAlerts() {
  const { loading, data, error, reload } = useAsync(() => api.adminDashboard(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={AlertTriangle} title="Risk across the institution"
        sub="Counts of high-risk students per department, scored on attendance, results, trajectory and eligibility." />
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {(data.riskDistribution || []).map((r) => (
          <div key={r.department} style={{ padding: "14px 15px", borderRadius: 11,
            background: t.bgSoft, border: `1px solid ${r.highRisk ? `${t.danger}33` : t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontFamily: FONT_D, fontSize: 14.5, fontWeight: 700 }}>{r.department}</span>
              <Badge tone={r.highRisk ? "danger" : "success"}>
                {r.highRisk} high risk
              </Badge>
            </div>
            <Progress pct={Math.min(100, r.highRisk * 8)} color={r.highRisk ? t.danger : t.success} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: t.goldSoft,
        border: `1px solid ${t.borderGold}`, fontSize: 11.5, color: t.textDim, lineHeight: 1.5 }}>
        Risk is a weighted, explainable score — not a prediction. Faculty see the individual reasons
        behind every flag in their own portal.
      </div>
    </Card>
  );
}

function ServiceQueue({ push }) {
  const { loading, data, error, reload } = useAsync(() => api.adminCmsRequests(), []);

  async function resolve(r, status) {
    try {
      await api.updateCmsRequest(r.id, status, status === "RESOLVED" ? "Handled by the office" : "Declined");
      push({ title: `Ticket ${r.ticketNo} ${status.toLowerCase()}`, tone: status === "RESOLVED" ? "success" : "warning" });
      reload();
    } catch (e) { push({ title: "Couldn't update", body: e.message, tone: "danger" }); }
  }

  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data.length) return <EmptyState icon={Check} title="The queue is clear"
    body="New campus service requests from students land here." />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={Inbox} title="Service queue" sub={`${data.length} open request(s) awaiting action.`} />
      <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12,
            padding: "13px 15px", borderRadius: 11, background: t.bgSoft,
            border: `1px solid ${t.border}`, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.serviceType.replace("_", " ")}</div>
              <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 3 }}>
                {r.ticketNo} · raised {r.createdAt}
              </div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <Button size="sm" variant="danger" icon={X} onClick={() => resolve(r, "REJECTED")}>Decline</Button>
              <Button size="sm" icon={Check} onClick={() => resolve(r, "RESOLVED")}>Resolve</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OrganizationManagement({ push }) {
  const departmentData = useAsync(() => api.adminReference(), []);
  const sectionsData = useAsync(() => api.adminClassSections(), []);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ code: "", name: "", hodName: "" });
  const [sectionForm, setSectionForm] = useState({ programId: "", year: "", semester: "", section: "", academicYear: "" });
  const [busy, setBusy] = useState(false);
  const [coordBusy, setCoordBusy] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const departments = departmentData.data?.departments || [];
  const programs = departmentData.data?.programs || [];
  const facultyList = departmentData.data?.faculty || [];
  const sections = sectionsData.data || [];

  async function createDepartment() {
    if (!departmentForm.code.trim() || !departmentForm.name.trim()) {
      push({ title: "Department not created", body: "Code and name are both required.", tone: "danger" });
      return;
    }
    setBusy(true);
    try {
      await api.createDepartment({
        code: departmentForm.code.trim(),
        name: departmentForm.name.trim(),
        hodName: departmentForm.hodName.trim(),
      });
      push({ title: "Department created", body: `${departmentForm.code.trim().toUpperCase()} was added.`, tone: "success" });
      setDepartmentOpen(false);
      setDepartmentForm({ code: "", name: "", hodName: "" });
      departmentData.reload();
    } catch (e) {
      push({ title: "Department not created", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  async function createSection() {
    const { programId, year, semester, section } = sectionForm;
    if (!programId || !year || !semester || !section.trim()) {
      push({ title: "Section not created", body: "Choose a programme and fill in year, semester and section.", tone: "danger" });
      return;
    }
    setBusy(true);
    try {
      await api.createClassSection({
        programId: Number(sectionForm.programId),
        year: Number(sectionForm.year),
        semester: Number(sectionForm.semester),
        section: sectionForm.section.trim(),
        academicYear: sectionForm.academicYear.trim(),
      });
      push({ title: "Class section created", body: `Section ${sectionForm.section.trim().toUpperCase()} created for the selected programme.`, tone: "success" });
      setSectionOpen(false);
      setSectionForm({ programId: "", year: "", semester: "", section: "", academicYear: "" });
      sectionsData.reload();
      departmentData.reload();
    } catch (e) {
      push({ title: "Section not created", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  function askDeleteDepartment(d) {
    setConfirmTarget({
      title: `Delete ${d.code}?`,
      body: `${d.name} will be removed. This only works once it has no programmes, faculty or subjects left.`,
      run: async () => {
        try {
          await api.deleteDepartment(d.id);
          push({ title: `${d.code} deleted`, tone: "warning" });
          departmentData.reload();
        } catch (e) { push({ title: "Department not deleted", body: e.message, tone: "danger" }); }
      },
    });
  }

  function askDeleteSection(s) {
    const label = `${s.programCode} Year ${s.year} Section ${s.section}`;
    setConfirmTarget({
      title: `Delete ${label}?`,
      body: "The class section will be removed. This only works once no students or subjects are attached to it.",
      run: async () => {
        try {
          await api.deleteClassSection(s.id);
          push({ title: `${label} deleted`, tone: "warning" });
          sectionsData.reload();
          departmentData.reload();
        } catch (e) { push({ title: "Section not deleted", body: e.message, tone: "danger" }); }
      },
    });
  }

  async function changeCoordinator(section, value) {
    setCoordBusy(section.id);
    try {
      const res = await api.assignClassSectionCoordinator(section.id, value === "" ? null : Number(value));
      push({ title: "Coordinator updated", body: `${res.coordinatorName || "Unassigned"} for ${section.programCode} Y${section.year}-${section.section}.`, tone: "success" });
      sectionsData.reload();
    } catch (e) {
      push({ title: "Coordinator update failed", body: e.message, tone: "danger" });
    } finally { setCoordBusy(null); }
  }

  return (
    <>
      <Card lift={false} style={{ padding: 18 }}>
        <SealWatermark size={200} style={{ top: -50, right: -40 }} />
        <SectionHead icon={Building2} title="Departments & Classes"
          sub="Create departments, create class sections, and assign a class coordinator for each section."
          right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="ghost" onClick={() => setDepartmentOpen(true)}>New department</Button>
            <Button size="sm" onClick={() => setSectionOpen(true)}>New class section</Button>
          </div>} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 8 }}>
          {(departments || []).map((d) => (
            <div key={d.code} style={{ padding: "14px 15px", borderRadius: 12, background: t.bgSoft, border: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: FONT_D, fontSize: 15, fontWeight: 700 }}>{d.code}</div>
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => askDeleteDepartment(d)}>Delete</Button>
              </div>
              <div style={{ fontSize: 12.5, color: t.textDim, marginTop: 4 }}>{d.name}</div>
              <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 8 }}>
                HOD: {d.hodName || "Not assigned"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: FONT_M, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: t.textFaint, marginBottom: 10 }}>
            Class section roster
          </div>
          {!sections.length ? <EmptyState icon={Building2} title="No sections exist yet" body="Create the first section to begin assigning a class coordinator." /> : (
            <div className="sv-scroll" style={{ maxHeight: 520, overflowY: "auto" }}>
              {sections.map((s) => {
                const facultyForDept = facultyList.filter((f) => f.department === s.departmentCode);
                return (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 10, background: t.bgSoft, border: `1px solid ${t.border}`, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 160, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.programCode} · Year {s.year} · Section {s.section}</div>
                      <div style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint, marginTop: 3 }}>
                        {s.academicYear || "Academic year not set"}
                      </div>
                    </div>
                    <div style={{ minWidth: 220, flex: 1 }}>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Coordinator</label>
                      <select value={s.coordinatorId ? String(s.coordinatorId) : ""} onChange={(e) => changeCoordinator(s, e.target.value)} disabled={coordBusy === s.id || !facultyForDept.length}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: coordBusy === s.id ? t.bgSoft : "#fff", border: `1px solid ${t.border}`, fontSize: 12.5, minHeight: 42, color: s.coordinatorId ? t.text : t.textFaint }}>
                        <option value="">{facultyForDept.length ? "Unassigned" : "No faculty in department"}</option>
                        {facultyForDept.map((f) => <option key={f.id} value={String(f.id)}>{f.name} · {f.staffCode}</option>)}
                      </select>
                    </div>
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => askDeleteSection(s)}>Delete</Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Modal open={departmentOpen} onClose={() => setDepartmentOpen(false)} eyebrow="Organisation"
        title="Add department" width={460}
        footer={<><Button variant="ghost" onClick={() => setDepartmentOpen(false)}>Cancel</Button>
          <Button onClick={createDepartment} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : "Create department"}</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Department code" value={departmentForm.code} onChange={(v) => setDepartmentForm({ ...departmentForm, code: v })} placeholder="CSE" />
          <Field label="Department name" value={departmentForm.name} onChange={(v) => setDepartmentForm({ ...departmentForm, name: v })} placeholder="Computer Science & Engineering" />
          <Field label="HOD name" value={departmentForm.hodName} onChange={(v) => setDepartmentForm({ ...departmentForm, hodName: v })} placeholder="Dr. R. Lakshmi" />
        </div>
      </Modal>

      <ConfirmDelete target={confirmTarget} onClose={() => setConfirmTarget(null)} />

      <Modal open={sectionOpen} onClose={() => setSectionOpen(false)} eyebrow="Organisation"
        title="Add class section" width={520}
        footer={<><Button variant="ghost" onClick={() => setSectionOpen(false)}>Cancel</Button>
          <Button onClick={createSection} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : "Create section"}</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <select value={sectionForm.programId} onChange={(e) => setSectionForm({ ...sectionForm, programId: e.target.value })}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 9, background: "#fff", border: `1px solid ${t.border}`, color: sectionForm.programId ? t.text : t.textFaint, fontSize: 13.5, minHeight: 44 }}>
            <option value="">Choose a programme</option>
            {(programs || []).map((p) => <option key={p.code} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Field label="Year" value={sectionForm.year} onChange={(v) => setSectionForm({ ...sectionForm, year: v })} placeholder="3" type="number" />
            <Field label="Semester" value={sectionForm.semester} onChange={(v) => setSectionForm({ ...sectionForm, semester: v })} placeholder="6" type="number" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Field label="Section" value={sectionForm.section} onChange={(v) => setSectionForm({ ...sectionForm, section: v })} placeholder="A" />
            <Field label="Academic year" value={sectionForm.academicYear} onChange={(v) => setSectionForm({ ...sectionForm, academicYear: v })} placeholder="2025-26" />
          </div>
        </div>
      </Modal>
    </>
  );
}

function Departments() {
  const { loading, data, error, reload } = useAsync(() => api.adminDashboard(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SealWatermark size={200} style={{ top: -50, right: -40 }} />
      <SectionHead icon={Building2} title="Departments" sub="Attendance volume and rate per department." />
      <div className="sv-stagger" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {(data.departmentStats || []).map((d) => (
          <div key={d.department} style={{ padding: "14px 15px", borderRadius: 11,
            background: t.bgSoft, border: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9, flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontFamily: FONT_D, fontSize: 15, fontWeight: 700 }}>{d.department}</span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontFamily: FONT_M, fontSize: 10.5, color: t.textFaint }}>
                  {Number(d.periods).toLocaleString()} periods
                </span>
                <span style={{ fontFamily: FONT_M, fontSize: 14, fontWeight: 700,
                  color: d.attendance >= 75 ? t.success : t.danger }}>{d.attendance}%</span>
              </div>
            </div>
            <Progress pct={d.attendance} color={d.attendance >= 75 ? t.success : t.danger} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function AuditTrail() {
  const { loading, data, error, reload } = useAsync(() => api.adminAudit(), []);
  if (loading) return <Skeleton />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data.length) return <EmptyState icon={ScrollText} title="Nothing logged yet"
    body="Account creation, access changes and mark publication all appear here." />;

  const tone = (a) => a.includes("REVOKED") ? "danger" : a.includes("CREATED") ? "success"
    : a.includes("PUBLISHED") ? "gold" : "primary";

  return (
    <Card lift={false} style={{ padding: 18 }}>
      <SectionHead icon={ScrollText} title="Audit trail"
        sub="Who did what, and when. The most recent 200 privileged actions." />
      <div className="sv-scroll" style={{ maxHeight: 560, overflowY: "auto" }}>
        {data.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "11px 12px", borderRadius: 9,
            marginBottom: 4, background: t.bgSoft, flexWrap: "wrap" }}>
            <Badge tone={tone(a.action)}>{a.action.replace(/_/g, " ").toLowerCase()}</Badge>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: t.text, lineHeight: 1.4 }}>{a.detail}</div>
              <div style={{ fontFamily: FONT_M, fontSize: 10, color: t.textFaint, marginTop: 3 }}>
                by {a.actor} · {a.at}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}


/* ─────────────── Courses, teachers and timetable ─────────────── */

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BLANK_PROGRAM = { code: "", name: "", departmentCode: "", durationYears: "4", semestersPerYear: "2" };
const BLANK_COURSE = { classSectionId: "", subjectCode: "", subjectName: "", credits: "3", facultyId: "", slots: [] };

function CourseManagement({ push }) {
  const ref = useAsync(() => api.adminReference(), []);
  const sectionsData = useAsync(() => api.adminClassSections(), []);
  const programsData = useAsync(() => api.adminPrograms(), []);
  const offerings = useAsync(() => api.adminOfferings(), []);
  const [programOpen, setProgramOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [pf, setPf] = useState(BLANK_PROGRAM);
  const [cf, setCf] = useState(BLANK_COURSE);
  const [busy, setBusy] = useState(false);

  const departments = ref.data?.departments || [];
  const faculty = ref.data?.faculty || [];
  const sections = sectionsData.data || [];
  const programs = programsData.data || [];
  const list = offerings.data || [];

  async function saveProgram() {
    if (!pf.code.trim() || !pf.name.trim() || !pf.departmentCode) {
      push({ title: "Programme not created", body: "Code, name and department are required.", tone: "danger" }); return;
    }
    setBusy(true);
    try {
      await api.adminCreateProgram({ code: pf.code.trim(), name: pf.name.trim(), departmentCode: pf.departmentCode,
        durationYears: Number(pf.durationYears), semestersPerYear: Number(pf.semestersPerYear) });
      push({ title: "Programme created", body: pf.code.trim().toUpperCase(), tone: "success" });
      setProgramOpen(false); setPf(BLANK_PROGRAM); programsData.reload(); ref.reload();
    } catch (e) { push({ title: "Programme not created", body: e.message, tone: "danger" }); }
    finally { setBusy(false); }
  }

  function toggleSlot(day, period) {
    const has = cf.slots.some((s) => s.dayOfWeek === day && s.period === period);
    setCf({ ...cf, slots: has ? cf.slots.filter((s) => !(s.dayOfWeek === day && s.period === period))
      : [...cf.slots, { dayOfWeek: day, period }] });
  }

  async function saveCourse() {
    if (!cf.classSectionId || !cf.subjectCode.trim() || !cf.subjectName.trim()) {
      push({ title: "Course not added", body: "Choose a class and give the subject a code and name.", tone: "danger" }); return;
    }
    setBusy(true);
    try {
      await api.adminCreateOffering({ classSectionId: Number(cf.classSectionId), subjectCode: cf.subjectCode.trim(),
        subjectName: cf.subjectName.trim(), credits: Number(cf.credits), laboratory: false,
        facultyId: cf.facultyId ? Number(cf.facultyId) : null, slots: cf.slots });
      push({ title: "Course added", body: `${cf.subjectCode.trim().toUpperCase()} is now offered to the class.`, tone: "success" });
      setCourseOpen(false); setCf(BLANK_COURSE); offerings.reload();
    } catch (e) { push({ title: "Course not added", body: e.message, tone: "danger" }); }
    finally { setBusy(false); }
  }

  async function reassign(o, facultyId) {
    try {
      await api.adminAssignFaculty(o.id, facultyId ? Number(facultyId) : null);
      push({ title: "Teacher updated", body: `${o.subjectCode}`, tone: "success" });
      offerings.reload();
    } catch (e) { push({ title: "Not updated", body: e.message, tone: "danger" }); }
  }

  if (ref.loading || offerings.loading) return <Skeleton />;
  if (ref.error) return <ErrorNote message={ref.error} onRetry={ref.reload} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={Building2} title="Programmes" sub="A programme (for example B.E. CSE) belongs to a department and holds the class sections."
          right={<Button size="sm" icon={Plus} onClick={() => setProgramOpen(true)}>Add programme</Button>} />
        {!programs.length ? <EmptyState icon={Building2} title="No programmes yet"
          body="Create a department under Departments & Classes, then add its programme here." /> : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {programs.map((p) => <Badge key={p.id} tone="primary">{p.code} · {p.name} · {p.durationYears} yrs</Badge>)}
          </div>
        )}
      </Card>

      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={BookOpen} title="Courses offered to each class"
          sub="Pick the subject, its teacher and the weekly periods. Attendance registers are built from these periods."
          right={<Button size="sm" icon={Plus} onClick={() => setCourseOpen(true)} disabled={!sections.length}>Add course</Button>} />
        {!sections.length && <div style={{ fontSize: 12, color: t.textDim, marginBottom: 10 }}>
          Create a class section first (Departments & Classes).</div>}
        {!list.length ? <EmptyState icon={BookOpen} title="No courses yet" body="Add the first course to a class." /> : (
          <div className="sv-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12.5 }}>
              <thead><tr style={{ textAlign: "left", color: t.textFaint, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {["Class", "Subject", "Credits", "Periods", "Teacher"].map((h) => <th key={h} style={{ padding: "8px 10px" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td style={{ padding: "9px 10px", fontFamily: FONT_M, fontSize: 11.5 }}>{o.sectionLabel}</td>
                    <td style={{ padding: "9px 10px" }}><strong>{o.subjectCode}</strong> · {o.subjectName}</td>
                    <td style={{ padding: "9px 10px" }}>{o.credits}</td>
                    <td style={{ padding: "9px 10px", fontSize: 11.5, color: t.textDim }}>{o.slots.join(", ") || "—"}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <select value={o.facultyId || ""} onChange={(e) => reassign(o, e.target.value)}
                        style={{ padding: "7px 9px", borderRadius: 8, border: `1px solid ${t.border}`, background: "#fff", fontSize: 12, minHeight: 36 }}>
                        <option value="">Unassigned</option>
                        {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={programOpen} onClose={() => setProgramOpen(false)} title="Add programme" eyebrow="Curriculum"
        footer={<><Button variant="ghost" onClick={() => setProgramOpen(false)}>Cancel</Button>
          <Button onClick={saveProgram} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : "Create"}</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <Field label="Programme code" value={pf.code} onChange={(v) => setPf({ ...pf, code: v })} placeholder="BE-CSE" />
          <Field label="Programme name" value={pf.name} onChange={(v) => setPf({ ...pf, name: v })} placeholder="B.E. Computer Science & Engineering" />
          <Select label="Department" value={pf.departmentCode} onChange={(v) => setPf({ ...pf, departmentCode: v })}
            placeholder="Choose a department" options={departments.map((d) => ({ value: d.code, label: `${d.code} — ${d.name}` }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Duration (years)" type="number" value={pf.durationYears} onChange={(v) => setPf({ ...pf, durationYears: v })} />
            <Field label="Semesters per year" type="number" value={pf.semestersPerYear} onChange={(v) => setPf({ ...pf, semestersPerYear: v })} />
          </div>
        </div>
      </Modal>

      <Modal open={courseOpen} onClose={() => setCourseOpen(false)} title="Add course to a class" eyebrow="Curriculum" width={560}
        footer={<><Button variant="ghost" onClick={() => setCourseOpen(false)}>Cancel</Button>
          <Button onClick={saveCourse} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : "Add course"}</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <Select label="Class" value={cf.classSectionId} onChange={(v) => setCf({ ...cf, classSectionId: v })}
            placeholder="Choose a class"
            options={sections.map((s) => ({ value: s.id, label: `${s.programCode} · Year ${s.year} · Section ${s.section}` }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 90px", gap: 12 }}>
            <Field label="Subject code" value={cf.subjectCode} onChange={(v) => setCf({ ...cf, subjectCode: v })} placeholder="CS3452" />
            <Field label="Subject name" value={cf.subjectName} onChange={(v) => setCf({ ...cf, subjectName: v })} placeholder="Theory of Computation" />
            <Field label="Credits" type="number" value={cf.credits} onChange={(v) => setCf({ ...cf, credits: v })} />
          </div>
          <Select label="Teacher" value={cf.facultyId} onChange={(v) => setCf({ ...cf, facultyId: v })}
            placeholder="Assign later" options={faculty.map((f) => ({ value: f.id, label: `${f.name} (${f.staffCode})` }))} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Weekly periods (tap to select)</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 4 }}>
                <thead><tr><th />{[1, 2, 3, 4, 5, 6, 7, 8].map((p) => <th key={p} style={{ fontSize: 10.5, color: t.textFaint }}>P{p}</th>)}</tr></thead>
                <tbody>
                  {DAY_NAMES.map((d, i) => (
                    <tr key={d}>
                      <td style={{ fontSize: 11, fontWeight: 700, color: t.textDim, paddingRight: 6 }}>{d}</td>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => {
                        const on = cf.slots.some((x) => x.dayOfWeek === i + 1 && x.period === p);
                        return (
                          <td key={p}><button type="button" onClick={() => toggleSlot(i + 1, p)} aria-pressed={on}
                            aria-label={`${d} period ${p}`} className="sv-btn" style={{ width: 34, height: 30, minHeight: 30, borderRadius: 7,
                              cursor: "pointer", border: `1px solid ${on ? t.primary : t.border}`,
                              background: on ? t.primary : "#fff", color: on ? "#fff" : t.textFaint, fontSize: 11 }}>{on ? "✓" : ""}</button></td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
