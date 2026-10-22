import React, { useEffect, useState } from "react";
import { GraduationCap, Users, ShieldCheck, ArrowRight, ArrowLeft, Eye, EyeOff, KeyRound, Hash } from "lucide-react";
import { COLLEGE, FONT_SERIF as FONT_D, FONT_B, FONT_M } from "../lib/theme";
import { CollegeMark, Spinner } from "../components/Shared";
import LiquidEther from "../components/LiquidEther";
import CodeSlots from "../components/CodeSlots";
import { api, setToken } from "../lib/api";

export const ETHER_COLORS = ["#27ff45", "#9fffc6", "#c0cf97"];
const INK = "#04110a";

/** Dark, live background shared by every screen before sign-in. */
export function AuthBackdrop({ children, center = true }) {
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(120% 90% at 50% 0%, #0b2a18 0%, ${INK} 60%)`,
      position: "relative", overflow: "hidden", fontFamily: FONT_B, display: "flex",
      alignItems: center ? "center" : "stretch", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <LiquidEther colors={ETHER_COLORS} mouseForce={20} cursorSize={100} persistence={0.75}
          autoDemo autoSpeed={0.5} autoIntensity={2.2} />
      </div>
      <div style={{ position: "relative", zIndex: 2, width: "100%", display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

const glass = {
  background: "rgba(255,255,255,0.93)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: 18,
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)", backdropFilter: "blur(14px)",
};

/* ───────── 1. Splash: the crest pops, then we move on ───────── */
export function Splash({ onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3000);
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => { clearTimeout(id); window.removeEventListener("keydown", skip); };
  }, []);
  return (
    <AuthBackdrop>
      <style>{`
        @keyframes spPop { 0% { opacity:0; transform: scale(.4) rotate(-8deg);} 55% { opacity:1; transform: scale(1.12) rotate(2deg);} 100% { opacity:1; transform: scale(1);} }
        @keyframes spRing { 0% { transform: scale(.6); opacity:.9;} 100% { transform: scale(2.1); opacity:0;} }
        @keyframes spText { from { opacity:0; transform: translateY(14px);} to { opacity:1; transform:none;} }
        @media (prefers-reduced-motion: reduce) { .sp-a { animation: none !important; opacity:1 !important; transform:none !important; } }
      `}</style>
      <div onClick={onDone} style={{ textAlign: "center", cursor: "pointer", padding: 20 }}>
        <div style={{ position: "relative", display: "inline-flex", marginBottom: 26 }}>
          {[0, 0.5].map((d) => (
            <span key={d} className="sp-a" style={{ position: "absolute", inset: 0, borderRadius: "50%",
              border: "2px solid #27ff45", animation: `spRing 1.9s ease-out ${0.5 + d}s infinite` }} />
          ))}
          <div className="sp-a" style={{ width: 150, height: 150, borderRadius: "50%", background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", opacity: 0,
            boxShadow: "0 0 60px rgba(39,255,69,.45)", animation: "spPop .9s cubic-bezier(.2,.9,.3,1.2) .1s forwards" }}>
            <img src={COLLEGE.logoUrl} alt={`${COLLEGE.name} logo`} style={{ width: 112, height: 112, objectFit: "contain" }} />
          </div>
        </div>
        <h1 className="sp-a" style={{ fontFamily: FONT_D, color: "#fff", fontSize: 34, margin: 0, opacity: 0,
          letterSpacing: "-0.02em", animation: "spText .7s ease 1s forwards" }}>{COLLEGE.name}</h1>
        <div className="sp-a" style={{ fontFamily: FONT_M, color: "#9fffc6", fontSize: 11, letterSpacing: "0.22em",
          textTransform: "uppercase", marginTop: 12, opacity: 0, animation: "spText .7s ease 1.3s forwards" }}>
          {COLLEGE.group} · ERP Portal
        </div>
      </div>
    </AuthBackdrop>
  );
}

/* ───────── 2. Who is signing in? ───────── */
const ROLES = [
  { key: "STUDENT", title: "Student", icon: GraduationCap, blurb: "Attendance, marks, leave, career tools" },
  { key: "FACULTY", title: "Faculty", icon: Users, blurb: "Mark attendance, enter and publish marks" },
  { key: "ADMIN", title: "Administrator", icon: ShieldCheck, blurb: "Manage the whole institution" },
];

export function RolePicker({ onPick }) {
  return (
    <AuthBackdrop>
      <div style={{ width: "100%", maxWidth: 760, textAlign: "center" }}>
        <div style={{ display: "inline-flex", marginBottom: 14 }}><CollegeMark size={52} showText={false} /></div>
        <h1 style={{ fontFamily: FONT_D, color: "#fff", fontSize: 30, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Welcome to {COLLEGE.shortName} ERP
        </h1>
        <p style={{ color: "#c8ead4", fontSize: 14, margin: "0 0 28px" }}>Choose how you're signing in.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          {ROLES.map((r) => (
            <button key={r.key} onClick={() => onPick(r.key)} className="sv-btn"
              style={{ ...glass, padding: "26px 18px", cursor: "pointer", textAlign: "center", color: "#10251A",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                transition: "transform .2s ease, box-shadow .2s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
              <span style={{ width: 54, height: 54, borderRadius: 14, margin: "0 auto 14px", display: "flex",
                alignItems: "center", justifyContent: "center", color: "#fff",
                background: "linear-gradient(140deg,#1B5E3A,#2f9e5f)" }}><r.icon size={26} /></span>
              <div style={{ fontFamily: FONT_D, fontSize: 19, fontWeight: 700 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "#2F5144", marginTop: 6, lineHeight: 1.5 }}>{r.blurb}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 26, color: "#8fb9a0", fontSize: 11 }}>{COLLEGE.affiliation} · {COLLEGE.location}</div>
      </div>
    </AuthBackdrop>
  );
}

/* ───────── 3. Sign in: password, or (students) a 6-digit quick code ───────── */
const rememberKey = (role) => `erp.remember.${role}`;
function loadRemembered(role) {
  try { return JSON.parse(localStorage.getItem(rememberKey(role)) || "null"); } catch { return null; }
}
function saveRemembered(role, v) {
  try { localStorage.setItem(rememberKey(role), JSON.stringify(v)); } catch { /* storage blocked */ }
}
/** Called once a quick code exists, so the next visit on this device opens on the code tab. */
export function markQuickCode(role, username, name, has = true) {
  saveRemembered(role, { ...(loadRemembered(role) || {}), username, name: name || loadRemembered(role)?.name, hasCode: has });
}
function forget(role) { try { localStorage.removeItem(rememberKey(role)); } catch { /* ignore */ } }

const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, background: "#fff",
  border: "1px solid rgba(27,94,58,.22)", color: "#10251A", fontSize: 14, fontFamily: FONT_B, minHeight: 44 };

export function SignIn({ role, onBack, onSignedIn }) {
  const meta = ROLES.find((r) => r.key === role);
  const canCode = role === "STUDENT";
  const [remembered, setRemembered] = useState(() => loadRemembered(role));
  const [mode, setMode] = useState(canCode && loadRemembered(role)?.hasCode ? "code" : "password");
  const [username, setUsername] = useState(remembered?.username || "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [codeStatus, setCodeStatus] = useState("idle");
  const [codeKey, setCodeKey] = useState(0);

  function accept(res) {
    if (res.role !== role) {
      setToken(null);
      const names = { STUDENT: "a student", FACULTY: "a faculty", ADMIN: "an administrator" };
      throw new Error(`That is ${names[res.role]} account. Go back and choose the ${res.role === "ADMIN" ? "Administrator" : res.role === "FACULTY" ? "Faculty" : "Student"} portal.`);
    }
    saveRemembered(role, { username: res.username, name: res.displayName, hasCode: !!res.hasQuickCode });
    onSignedIn(res);
  }

  async function submitPassword() {
    if (!username.trim() || !password) { setError("Enter both your username and password."); return; }
    setBusy(true); setError(null);
    try {
      const res = await api.login(username.trim(), password);
      setToken(res.token);
      accept(res);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function submitCode(code) {
    const who = (remembered?.username || username).trim();
    if (!who) { setError("Enter your roll number first."); setCodeStatus("error"); return; }
    setBusy(true); setError(null);
    try {
      const res = await api.loginCode(who, code);
      setToken(res.token);
      setCodeStatus("success");
      setTimeout(() => { try { accept(res); } catch (e) { setError(e.message); setCodeStatus("idle"); } }, 650);
    } catch (e) {
      setError(e.message); setCodeStatus("error");
      setTimeout(() => setCodeStatus("idle"), 800);
    } finally { setBusy(false); }
  }

  const tab = (key, label, Icon) => (
    <button onClick={() => { setMode(key); setError(null); }} className="sv-btn"
      style={{ flex: 1, padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700,
        fontSize: 12.5, display: "flex", gap: 7, alignItems: "center", justifyContent: "center",
        background: mode === key ? "#1B5E3A" : "transparent", color: mode === key ? "#fff" : "#2F5144" }}>
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <AuthBackdrop>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ display: "inline-flex", marginBottom: 10 }}><CollegeMark size={46} showText={false} /></div>
          <div style={{ fontFamily: FONT_D, color: "#fff", fontSize: 22, fontWeight: 700 }}>{COLLEGE.name}</div>
        </div>
        <div style={{ ...glass, padding: 24 }}>
          <button onClick={onBack} className="sv-btn" style={{ background: "none", border: "none", cursor: "pointer",
            color: "#2F5144", fontSize: 12, display: "flex", alignItems: "center", gap: 5, padding: 0, marginBottom: 12 }}>
            <ArrowLeft size={13} /> Change portal
          </button>
          <div style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 700, color: "#10251A" }}>{meta.title} sign in</div>

          {canCode && (
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "rgba(27,94,58,.08)", margin: "14px 0 4px" }}>
              {tab("password", "Password", KeyRound)}
              {tab("code", "Quick code", Hash)}
            </div>
          )}

          {mode === "password" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#2F5144", marginBottom: 6 }}>
                  {role === "STUDENT" ? "Roll number" : "Username"}
                </label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle}
                  placeholder={role === "STUDENT" ? "e.g. 310625104288" : "Your username"} autoComplete="username"
                  onKeyDown={(e) => e.key === "Enter" && submitPassword()} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#2F5144", marginBottom: 6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitPassword()} placeholder="Your password"
                    autoComplete="current-password" style={{ ...inputStyle, paddingRight: 44 }} />
                  <button onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "#486B61", padding: 8, display: "flex" }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {role !== "ADMIN" && (
                <div style={{ fontSize: 11.5, color: "#486B61", lineHeight: 1.5 }}>
                  First time? Use the temporary password the administrator gave you. You'll be asked to choose your own.
                </div>
              )}
              {error && <ErrorBox>{error}</ErrorBox>}
              <button onClick={submitPassword} disabled={busy} className="sv-btn" style={primaryBtn}>
                {busy ? <Spinner size={15} color="#fff" /> : <>Sign in <ArrowRight size={15} /></>}
              </button>
            </div>
          )}

          {mode === "code" && (
            <div style={{ marginTop: 18, textAlign: "center" }}>
              {remembered ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: "#2F5144" }}>Welcome back</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 18, fontWeight: 700, color: "#10251A" }}>{remembered.name || remembered.username}</div>
                  <div style={{ fontFamily: FONT_M, fontSize: 11, color: "#486B61" }}>{remembered.username}</div>
                  <button onClick={() => { forget(role); setRemembered(null); setUsername(""); }} className="sv-btn"
                    style={{ background: "none", border: "none", color: "#1B5E3A", fontSize: 11.5, cursor: "pointer", marginTop: 4, textDecoration: "underline" }}>
                    Not you?
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: 16, textAlign: "left" }}>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#2F5144", marginBottom: 6 }}>Roll number</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle}
                    placeholder="e.g. 310625104288" autoComplete="username" />
                </div>
              )}
              <div style={{ fontSize: 12.5, color: "#2F5144", marginBottom: 12 }}>Enter your 6-digit code</div>
              <CodeSlots length={6} status={codeStatus} mask resetKey={codeKey} disabled={busy}
                autoFocus={!!(remembered || username)}
                onChange={() => { if (codeStatus !== "idle") setCodeStatus("idle"); }}
                onComplete={submitCode}
                accentColor="#1B5E3A" inkColor="#1B5E3A" slotColor="#ffffff" digitColor="#10251A" dangerColor="#C8102E"
                slotSize={44} gap={8} radius={12} bounce={0.2} settle={0.3} rise={8} cascade={20} />
              {error && <div style={{ marginTop: 14, textAlign: "left" }}><ErrorBox>{error}</ErrorBox></div>}
              <div style={{ fontSize: 11.5, color: "#486B61", marginTop: 16, lineHeight: 1.5 }}>
                No code yet? Sign in with your password once, then create one from Settings.
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthBackdrop>
  );
}

const primaryBtn = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
  padding: "12px 16px", borderRadius: 11, border: "none", cursor: "pointer", color: "#fff", fontWeight: 700,
  fontSize: 14, background: "linear-gradient(135deg,#1B5E3A,#2a8a56)", minHeight: 46 };

export function ErrorBox({ children }) {
  return (
    <div role="alert" style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(200,16,46,.09)",
      border: "1px solid rgba(200,16,46,.25)", fontSize: 12.5, color: "#C8102E", lineHeight: 1.45 }}>{children}</div>
  );
}

/* ───────── 4. After the first password change: offer a quick code (students) ───────── */
export function SetCodeStep({ password, onDone }) {
  const [first, setFirst] = useState(null);
  const [status, setStatus] = useState("idle");
  const [key, setKey] = useState(0);
  const [error, setError] = useState(null);

  async function complete(code) {
    if (!first) { setFirst(code); setKey((k) => k + 1); return; }
    if (code !== first) {
      setStatus("error"); setError("Those two codes don't match. Start again.");
      setTimeout(() => { setFirst(null); setStatus("idle"); setKey((k) => k + 1); }, 900);
      return;
    }
    try {
      await api.setQuickCode(password, code);
      setStatus("success"); setError(null);
      setTimeout(onDone, 900);
    } catch (e) { setStatus("error"); setError(e.message); }
  }

  return (
    <AuthBackdrop>
      <div style={{ ...glass, padding: 26, width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, margin: "0 auto 12px", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff", background: "linear-gradient(140deg,#1B5E3A,#2f9e5f)" }}><Hash size={22} /></div>
        <div style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 700, color: "#10251A" }}>Create a quick code</div>
        <p style={{ fontSize: 12.5, color: "#2F5144", lineHeight: 1.55, margin: "8px 0 18px" }}>
          Next time, sign in with just 6 digits instead of your roll number and password.
        </p>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#10251A", marginBottom: 12 }}>
          {first ? "Enter it once more to confirm" : "Choose 6 digits"}
        </div>
        <CodeSlots length={6} mask status={status} resetKey={key} onComplete={complete}
          accentColor="#1B5E3A" inkColor="#1B5E3A" slotColor="#ffffff" digitColor="#10251A" dangerColor="#C8102E"
          slotSize={44} gap={8} radius={12} bounce={0.2} settle={0.3} rise={8} cascade={20} />
        {error && <div style={{ marginTop: 14 }}><ErrorBox>{error}</ErrorBox></div>}
        <button onClick={onDone} className="sv-btn" style={{ marginTop: 20, background: "none", border: "none",
          color: "#486B61", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Skip for now</button>
      </div>
    </AuthBackdrop>
  );
}
