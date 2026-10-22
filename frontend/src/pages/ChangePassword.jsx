import React, { useState } from "react";
import { KeyRound, ArrowRight } from "lucide-react";
import { theme as t, FONT_SERIF as FONT_D, FONT_B } from "../lib/theme";
import { Button, Field, Spinner } from "../components/Shared";
import { AuthBackdrop, ErrorBox } from "./Welcome";
import { api } from "../lib/api";

/**
 * Shown when an account is flagged mustChangePassword — a freshly provisioned
 * account, or one an administrator has reset. Until this is done the portal
 * stays out of reach, which is the point of the flag.
 */
export default function ChangePassword({ session, onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (next.length < 8) { setError("Your new password needs at least eight characters."); return; }
    if (next !== confirm) { setError("The two new passwords don't match."); return; }
    if (next === current) { setError("Choose something different from the password you were given."); return; }

    setBusy(true); setError(null);
    try {
      await api.changePassword(current, next);
      onDone(next);
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthBackdrop>
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.93)", borderRadius: 18, padding: 24,
        border: "1px solid rgba(255,255,255,.7)", boxShadow: "0 24px 70px rgba(0,0,0,.45)", fontFamily: FONT_B }}>
        <div style={{ display: "flex", gap: 11, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: t.primarySoft,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <KeyRound size={17} color={t.primary} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_D, fontSize: 19, fontWeight: 700, color: t.text }}>Set your own password</div>
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 4, lineHeight: 1.5 }}>
              {session.displayName ? `Welcome, ${session.displayName.split(" ")[0]}. ` : ""}
              The password you were given is temporary. Choose your own to continue.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Temporary password" value={current} onChange={setCurrent} type="password" placeholder="The one you were given" />
          <Field label="New password" value={next} onChange={setNext} type="password" placeholder="At least eight characters" />
          <Field label="Confirm new password" value={confirm} onChange={setConfirm} type="password" placeholder="Type it again" />
          {error && <ErrorBox>{error}</ErrorBox>}
          <Button full onClick={submit} disabled={busy} icon={busy ? undefined : ArrowRight}>
            {busy ? <Spinner size={15} color="#fff" /> : "Continue"}
          </Button>
        </div>
      </div>
    </AuthBackdrop>
  );
}
