import React, { useEffect, useRef, useState } from "react";
import { Camera, Trash2, Save, User, Users, GraduationCap, Info } from "lucide-react";
import { theme as t, FONT_B } from "../lib/theme";
import { Card, Button, SectionHead, Field, Progress, Skeleton, ErrorNote, Spinner } from "../components/Shared";
import { api } from "../lib/api";

const EDITABLE = ["email", "phone", "dateOfBirth", "gender", "bloodGroup", "address",
  "fatherName", "motherName", "parentPhone", "about", "linkedinUrl", "githubUrl"];
const GENDERS = ["", "Male", "Female", "Other"];
const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 9, background: t.surface,
  border: `1px solid ${t.border}`, color: t.text, fontSize: 13.5, fontFamily: FONT_B, minHeight: 44,
};

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}
      </select>
    </div>
  );
}

/** Centre-crops to a square and scales to 512px, so every photo is small and uniform. */
function squarePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 512, 512);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b ? resolve(new File([b], "photo.jpg", { type: "image/jpeg" })) : reject(new Error("Could not read that image")),
        "image/jpeg", 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't an image we can read")); };
    img.src = url;
  });
}

export function Avatar({ name, photoUrl, size = 52, radius = "50%" }) {
  const initials = (name || "").split(" ").map((n) => n[0]).join("").slice(0, 2);
  return photoUrl
    ? <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0, display: "block" }} />
    : (
      <div style={{ width: size, height: size, borderRadius: radius, background: t.primary, color: "#fff", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 600 }}>
        {initials}
      </div>
    );
}

export default function StudentProfile({ push, photoUrl, onPhotoChange }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api.studentProfile()
      .then((data) => { setState({ loading: false, data, error: null }); setForm(toForm(data)); })
      .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (state.loading) return <Skeleton />;
  if (state.error) return <ErrorNote message={state.error} onRetry={load} />;
  const p = state.data;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = EDITABLE.some((k) => (form[k] || "") !== (p[k] || ""));
  const filled = EDITABLE.filter((k) => p[k]).length + (p.hasPhoto ? 1 : 0);
  const completion = Math.round((filled / (EDITABLE.length + 1)) * 100);

  async function save() {
    setSaving(true);
    try {
      const body = Object.fromEntries(EDITABLE.map((k) => [k, form[k] || null]));
      const data = await api.updateStudentProfile(body);
      setState({ loading: false, data, error: null });
      setForm(toForm(data));
      push({ title: "Profile saved", body: "Your details are up to date.", tone: "success" });
    } catch (e) {
      push({ title: "Not saved", body: e.message, tone: "danger" });
    } finally { setSaving(false); }
  }

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const data = await api.uploadStudentPhoto(await squarePhoto(file));
      setState({ loading: false, data, error: null });
      await onPhotoChange();
      push({ title: "Photo updated", tone: "success" });
    } catch (err) {
      push({ title: "Photo not uploaded", body: err.message, tone: "danger" });
    } finally { setUploading(false); }
  }

  async function removePhoto() {
    try {
      const data = await api.removeStudentPhoto();
      setState({ loading: false, data, error: null });
      await onPhotoChange();
      push({ title: "Photo removed", tone: "warning" });
    } catch (err) { push({ title: "Photo not removed", body: err.message, tone: "danger" }); }
  }

  const academic = [
    ["Roll no.", p.rollNo], ["Register no.", p.regNo], ["Department", p.department],
    ["Programme", p.programName], ["Year / Semester", `Year ${p.year} · Semester ${p.semester}`],
    ["Section", p.section], ["Batch", p.batch], ["Mentor", p.mentor],
    ["Class coordinator", p.classCoordinator], ["Hostel", p.hostel || "Day scholar"],
    ["CGPA", p.cgpa.toFixed(2)],
  ].filter(([, v]) => v);
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <Card lift={false} style={{ padding: 22, textAlign: "center" }}>
          <div style={{ position: "relative", width: 150, margin: "0 auto" }}>
            <Avatar name={p.name} photoUrl={photoUrl} size={150} radius={16} />
            {uploading && (
              <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: "rgba(255,255,255,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>
            )}
          </div>
          <div style={{ fontSize: 19, fontWeight: 650, marginTop: 14 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: t.textDim, marginTop: 2 }}>{p.rollNo} · {p.programCode} {p.section && `· Section ${p.section}`}</div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            <Button icon={Camera} size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {p.hasPhoto ? "Change photo" : "Upload photo"}
            </Button>
            {p.hasPhoto && <Button icon={Trash2} size="sm" variant="ghost" onClick={removePhoto} disabled={uploading}>Remove</Button>}
          </div>
          <div style={{ fontSize: 11, color: t.textFaint, marginTop: 8 }}>A clear, front-facing photo. JPG, PNG or WEBP.</div>

          <div style={{ marginTop: 20, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: t.textDim }}>Profile complete</span><span style={{ fontWeight: 700 }}>{completion}%</span>
            </div>
            <Progress pct={completion} />
          </div>
        </Card>

        <Card lift={false} style={{ padding: 20 }}>
          <SectionHead icon={GraduationCap} title="Academic record" sub="Maintained by the college office" />
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 16, rowGap: 8, margin: 0, fontSize: 13 }}>
            {academic.map(([k, v]) => (
              <React.Fragment key={k}><dt style={{ color: t.textFaint }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd></React.Fragment>
            ))}
          </dl>
        </Card>
      </div>

      <Card lift={false} style={{ padding: 20, flex: "2 1 480px", minWidth: 0 }}>
        <SectionHead icon={User} title="Personal details" sub="Keep these current so the college can reach you" />
        <div style={grid}>
          <Field label="Email" type="email" value={form.email} onChange={set("email")} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
          <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          <Select label="Gender" value={form.gender} onChange={set("gender")} options={GENDERS} />
          <Select label="Blood group" value={form.bloodGroup} onChange={set("bloodGroup")} options={BLOOD_GROUPS} />
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>Address</label>
          <textarea rows={2} value={form.address} onChange={(e) => set("address")(e.target.value)} maxLength={400}
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div style={{ height: 1, background: t.border, margin: "22px 0" }} />
        <SectionHead icon={Users} title="Family" />
        <div style={grid}>
          <Field label="Father's name" value={form.fatherName} onChange={set("fatherName")} />
          <Field label="Mother's name" value={form.motherName} onChange={set("motherName")} />
          <Field label="Parent's phone" type="tel" value={form.parentPhone} onChange={set("parentPhone")} />
        </div>

        <div style={{ height: 1, background: t.border, margin: "22px 0" }} />
        <SectionHead icon={Info} title="About me" sub="A few lines about your interests, goals and achievements" />
        <textarea rows={4} value={form.about} onChange={(e) => set("about")(e.target.value)} maxLength={1000}
          placeholder="e.g. Second-year CSE student interested in web development and competitive programming…"
          style={{ ...inputStyle, resize: "vertical" }} />
        <div style={{ fontSize: 10.5, color: t.textFaint, textAlign: "right", marginTop: 4 }}>{(form.about || "").length} / 1000</div>
        <div style={{ ...grid, marginTop: 10 }}>
          <Field label="LinkedIn" value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/in/…" />
          <Field label="GitHub" value={form.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/…" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
          {dirty && <Button variant="ghost" onClick={() => setForm(toForm(p))} disabled={saving}>Discard changes</Button>}
          <Button icon={Save} onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </div>
      </Card>
    </div>
  );
}

function toForm(p) {
  return Object.fromEntries(EDITABLE.map((k) => [k, p[k] || ""]));
}
