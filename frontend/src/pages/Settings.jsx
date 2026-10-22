import React, { useState } from "react";
import { Hash, Trash2 } from "lucide-react";
import { theme as t, FONT_D } from "../lib/theme";
import { Card, Button, SectionHead, Field } from "../components/Shared";
import CodeSlots from "../components/CodeSlots";
import { api } from "../lib/api";
import { markQuickCode } from "./Welcome";

const Title = ({ children, sub }) => (
  <div style={{ marginBottom: 14 }}>
    <h2 style={{ fontFamily: FONT_D, fontSize: 26, margin: 0, color: t.text }}>{children}</h2>
    {sub && <div style={{ fontSize: 12.5, color: t.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

/** Account settings: create, change or remove the 6-digit quick code. Uses the normal light theme. */
export function QuickCodeSettings({ push, session }) {
  const [has, setHas] = useState(null);
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState(null);
  const [status, setStatus] = useState("idle");
  const [key, setKey] = useState(0);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { api.me().then((m) => setHas(!!m.hasQuickCode)).catch(() => setHas(false)); }, []);

  async function complete(code) {
    if (!first) { setFirst(code); setKey((k) => k + 1); return; }
    if (first !== code) { setStatus("error"); push({ title: "Codes don't match", body: "Start again.", tone: "danger" }); setFirst(null); setTimeout(() => { setStatus("idle"); setKey((k) => k + 1); }, 800); return; }
    setBusy(true);
    try {
      await api.setQuickCode(password, code);
      setStatus("success"); setHas(true); setFirst(null); setPassword(""); markQuickCode("STUDENT", session.username, session.displayName, true);
      push({ title: "Quick code saved", body: "You can now sign in with these 6 digits.", tone: "success" });
    } catch (e) { setStatus("error"); push({ title: "Not saved", body: e.message, tone: "danger" }); setFirst(null); setTimeout(() => { setStatus("idle"); setKey((k) => k + 1); }, 800); }
    finally { setBusy(false); }
  }
  async function remove() {
    try { await api.removeQuickCode(); setHas(false); markQuickCode("STUDENT", session.username, session.displayName, false); push({ title: "Quick code removed", tone: "warning" }); }
    catch (e) { push({ title: "Not removed", body: e.message, tone: "danger" }); }
  }
  return (
    <div>
      <Title sub="Sign in with 6 digits instead of your roll number and password.">Settings</Title>
      <Card lift={false} style={{ padding: 20, maxWidth: 520 }}>
        <SectionHead icon={Hash} title="Quick code" sub={has ? "A quick code is set on your account." : "No quick code yet."} />
        <Field label="Your current password (to confirm it's you)" type="password" value={password} onChange={setPassword} />
        <div style={{ margin: "16px 0 10px", fontSize: 12.5, fontWeight: 600 }}>{first ? "Enter it once more to confirm" : has ? "Choose a new 6-digit code" : "Choose a 6-digit code"}</div>
        <CodeSlots length={6} mask status={status} resetKey={key} autoFocus={false} disabled={!password || busy} onComplete={complete}
          accentColor="#1B5E3A" inkColor="#1B5E3A" slotColor="#ffffff" digitColor="#10251A" dangerColor="#C8102E"
          slotSize={42} gap={8} radius={12} bounce={0.2} settle={0.3} rise={8} cascade={20} />
        {!password && <div style={{ fontSize: 11.5, color: t.textFaint, marginTop: 8 }}>Type your password first.</div>}
        {has && <div style={{ marginTop: 18 }}><Button variant="ghost" icon={Trash2} onClick={remove}>Remove quick code</Button></div>}
      </Card>
    </div>
  );
}
