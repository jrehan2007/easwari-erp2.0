import React, { useEffect, useState } from "react";
import { GlobalStyle } from "./components/Shared";
import { Splash, RolePicker, SignIn, SetCodeStep, markQuickCode } from "./pages/Welcome";
import ChangePassword from "./pages/ChangePassword";
import StudentPortal from "./pages/StudentPortal";
import FacultyPortal from "./pages/FacultyPortal";
import AdminPortal from "./pages/AdminPortal";
import { onAuthChange, setToken } from "./lib/api";

/**
 * Flow: crest splash → choose portal → sign in (password, or a 6-digit quick code
 * for students) → first-time password change → optional quick-code setup → portal.
 * The portal shown is decided by the role on the token; every endpoint re-checks it.
 */
export default function App() {
  const [session, setSession] = useState(null);
  const [stage, setStage] = useState("splash");      // splash | role | signin
  const [role, setRole] = useState(null);
  const [newPassword, setNewPassword] = useState(null);   // held only until the code step is done
  const [offerCode, setOfferCode] = useState(false);

  useEffect(() => onAuthChange((token) => {
    if (!token) { setSession(null); setNewPassword(null); setOfferCode(false); }
  }), []);

  if (!session) {
    return (
      <>
        <GlobalStyle />
        {stage === "splash" && <Splash onDone={() => setStage("role")} />}
        {stage === "role" && <RolePicker onPick={(r) => { setRole(r); setStage("signin"); }} />}
        {stage === "signin" && <SignIn role={role} onBack={() => setStage("role")} onSignedIn={setSession} />}
      </>
    );
  }

  // A provisioned or reset account cannot reach the portal until it sets its own password.
  if (session.mustChangePassword) {
    return (
      <>
        <GlobalStyle />
        <ChangePassword session={session}
          onDone={(pw) => {
            setSession({ ...session, mustChangePassword: false });
            if (session.role === "STUDENT") { setNewPassword(pw); setOfferCode(true); }
          }} />
      </>
    );
  }

  if (offerCode && session.role === "STUDENT") {
    return (
      <>
        <GlobalStyle />
        <SetCodeStep password={newPassword}
          onDone={() => { markQuickCode("STUDENT", session.username, session.displayName); setOfferCode(false); setNewPassword(null); setSession((s) => ({ ...s, hasQuickCode: true })); }} />
      </>
    );
  }

  const signOut = () => { setToken(null); setSession(null); setStage("role"); };

  return (
    <>
      <GlobalStyle />
      {session.role === "STUDENT" && <StudentPortal session={session} onSignOut={signOut} />}
      {session.role === "FACULTY" && <FacultyPortal session={session} onSignOut={signOut} />}
      {session.role === "ADMIN" && <AdminPortal session={session} onSignOut={signOut} />}
    </>
  );
}
