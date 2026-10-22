import React, { useEffect, useState } from "react";
import { Menu, Bell, LogOut, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
import { theme as baseTheme, careerTheme, COLLEGE, FONT_D, FONT_B, FONT_M } from "../lib/theme";
import { CollegeMark, ThemeContext } from "../components/Shared";
import LiquidEther from "../components/LiquidEther";

/**
 * Chrome shared by all three portals: crest-bearing sidebar, sticky header,
 * and a thumb-reachable bottom bar on phones.
 */
export default function Shell({ nav, active, setActive, session, onSignOut, children, subtitle }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const current = nav.find((n) => n.key === active);
  const [boxOpen, setBoxOpen] = useState(false);

  // Career Hub pages switch the whole portal to the black-and-gold palette;
  // every other page keeps the light theme. Children get it through ThemeContext.
  const career = !!current?.career;
  const t = career ? careerTheme : baseTheme;
  const ink = career ? careerTheme.text : baseTheme.text;
  const panel = (a) => (career ? `rgba(14,14,15,${a + 0.2})` : `rgba(255,255,255,${a})`);
  useEffect(() => {
    // Overscroll and the area behind the page follow the theme too.
    const root = document.documentElement;
    root.style.background = career ? careerTheme.bg : "";
    root.style.colorScheme = career ? "dark" : "";      // native selects, date pickers and scrollbars match
    if (career) root.dataset.career = "1"; else delete root.dataset.career;
    return () => { root.style.background = ""; root.style.colorScheme = ""; delete root.dataset.career; };
  }, [career]);
  const groups = nav.reduce((acc, n) => {
    (acc[n.group || "Menu"] = acc[n.group || "Menu"] || []).push(n);
    return acc;
  }, {});
  const bottomItems = [...nav.slice(0, 4), { key: "__more", label: "More", icon: Menu }];

  const sidebar = (isMobile) => (
    <aside className="sv-glass" style={{
      width: collapsed && !isMobile ? 74 : 240, minWidth: collapsed && !isMobile ? 74 : 240,
      background: t.sidebar, borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", padding: "16px 11px",
      paddingTop: "calc(16px + env(safe-area-inset-top))",
      position: isMobile ? "fixed" : "sticky", top: 0,
      left: isMobile ? (mobileOpen ? 0 : -300) : undefined,
      height: "100vh", zIndex: 100, boxShadow: isMobile ? t.shadowLg : "none",
      transition: "left .26s cubic-bezier(.2,.8,.2,1), width .22s ease",
    }}>
      <div style={{ padding: "4px 4px 16px", borderBottom: `1px solid ${t.border}`, marginBottom: 14 }}>
        {collapsed && !isMobile
          ? <div style={{ display: "flex", justifyContent: "center" }}><CollegeMark size={30} showText={false} inverted={career} /></div>
          : <CollegeMark size={38} compact inverted={career} />}
      </div>

      <nav className="sv-scroll" style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
        {Object.entries(groups).map(([group, items]) => {
          const boxed = items[0].box;
          const inGroup = items.some((i) => i.key === active);
          const showItems = !boxed || inGroup || boxOpen || (collapsed && !isMobile);
          const BoxIcon = items[0].icon;
          const groupStyle = boxed
            ? { marginBottom: 10, borderRadius: 12, padding: 4, border: `1px solid ${inGroup ? t.borderGold : t.border}`,
                // Outside the hub, a small black-and-gold panel invites the student in (not when the sidebar is collapsed).
                background: inGroup ? "rgba(212,175,55,0.05)" : career || (collapsed && !isMobile) ? "transparent" : "linear-gradient(135deg,#141416,#22201a)",
                boxShadow: inGroup || (collapsed && !isMobile) ? "none" : "0 4px 14px rgba(0,0,0,0.18)" }
            : { marginBottom: 10 };
          return (
          <div key={group} style={groupStyle}>
            {boxed && !(collapsed && !isMobile) ? (
              <div role="button" tabIndex={0} aria-expanded={showItems}
                onClick={() => { setBoxOpen(true); setActive(items[0].key); setMobileOpen(false); }}
                onKeyDown={(e) => e.key === "Enter" && (setBoxOpen(true), setActive(items[0].key))}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 9px", borderRadius: 9, cursor: "pointer",
                  background: inGroup ? "linear-gradient(135deg,#E8C766,#B8901F)" : "transparent", color: inGroup ? "#111" : "#E8C766" }}>
                <BoxIcon size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, flex: 1, letterSpacing: "0.01em" }}>{group}</span>
                <ChevronDown size={14} style={{ transform: showItems ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
              </div>
            ) : !(collapsed && !isMobile) && (
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase", color: t.textFaint, padding: "8px 11px 4px" }}>{group}</div>
            )}
            {showItems && (boxed && !(collapsed && !isMobile) ? items.slice(1) : items).map((item) => {
              const on = active === item.key;
              return (
                <div key={item.key} role="button" tabIndex={0} aria-label={item.label}
                  onClick={() => { setActive(item.key); setMobileOpen(false); }}
                  onKeyDown={(e) => e.key === "Enter" && (setActive(item.key), setMobileOpen(false))}
                  title={collapsed && !isMobile ? item.label : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 11, position: "relative",
                    padding: (collapsed && !isMobile) ? "10px 0" : isMobile ? "12px 11px" : "9px 11px",
                    justifyContent: (collapsed && !isMobile) ? "center" : "flex-start",
                    borderRadius: 8, cursor: "pointer", marginBottom: 1,
                    color: ink, background: on ? t.primarySoft : "transparent",
                    transition: "background-color .16s ease",
                  }}>
                  {on && !(collapsed && !isMobile) && (
                    <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                      width: 3, height: 18, background: career ? t.gold : t.primary, borderRadius: "0 3px 3px 0" }} />
                  )}
                  <item.icon size={16} color={on ? (career ? t.gold : t.primary) : t.textDim} style={{ flexShrink: 0 }} />
                  {!(collapsed && !isMobile) && (
                    <span style={{ fontSize: 13, fontWeight: on ? 600 : 500, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis", color: on ? t.text : t.textDim }}>{item.label}</span>
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </nav>

      {!(collapsed && !isMobile) && (
        <button onClick={onSignOut} className="sv-btn" style={{
          display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", borderRadius: 9,
          background: "transparent", border: `1px solid ${t.border}`, color: ink,
          cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 8, minHeight: 42,
        }}><LogOut size={15} /> Sign out</button>
      )}

      {!isMobile && (
        <button onClick={() => setCollapsed(!collapsed)} className="sv-btn" aria-label="Toggle sidebar"
          style={{ marginTop: 10, alignSelf: collapsed ? "center" : "flex-end", background: t.surface,
            border: `1px solid ${t.border}`, borderRadius: 7, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center", color: ink, cursor: "pointer" }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      )}
    </aside>
  );

  return (
    <div style={{ fontFamily: FONT_B, minHeight: "100vh", display: "flex",
      color: ink, position: "relative",
      background: career
        ? "radial-gradient(90% 60% at 100% 0%, rgba(212,175,55,0.10) 0%, transparent 60%), linear-gradient(160deg,#0b0b0c 0%,#0e0d0b 60%,#0a0a0b 100%)"
        : t.bg,
      transition: "background .4s ease" }}>
      {/* A plain ground for the portal; only the Career Hub keeps a faint moving gold light. */}
      {career && (
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.32 }}>
          <LiquidEther key="gold" colors={["#D4AF37", "#8a6d1f", "#f3d77a"]} intensity={0.7} mouseForce={12}
            cursorSize={120} persistence={0.8} autoDemo autoSpeed={0.3} autoIntensity={1.4} intro={false} />
        </div>
      )}

      <div className="sv-desktop-only" style={{ position: "relative", zIndex: 1 }}>{sidebar(false)}</div>
      <div className="sv-mobile-only">
        {mobileOpen && <div onClick={() => setMobileOpen(false)} className="sv-fade"
          style={{ position: "fixed", inset: 0, background: t.overlay, zIndex: 90 }} />}
        {sidebar(true)}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <header className="sv-glass" style={{
          display: "flex", alignItems: "center", gap: 11, padding: "11px 16px",
          paddingTop: "calc(11px + env(safe-area-inset-top))",
          borderBottom: `1px solid ${t.border}`, background: panel(0.66),
          position: "sticky", top: 0, zIndex: 80, boxShadow: t.shadowSm,
        }}>
          <button onClick={() => setMobileOpen(true)} className="sv-btn sv-mobile-only" aria-label="Open menu"
            style={{ background: panel(0.6), border: `1px solid ${t.border}`, borderRadius: 9,
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              color: ink, cursor: "pointer", flexShrink: 0 }}>
            <Menu size={17} />
          </button>

          {/* The crest stays in the header on every page, phone included */}
          <div className="sv-mobile-only" style={{ minWidth: 0, flex: 1 }}>
            <CollegeMark size={28} compact inverted={career} />
          </div>

          <div className="sv-desktop-only" style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{subtitle}</div>
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 1 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 4px 4px",
            borderRadius: 10, background: panel(0.55), border: `1px solid ${t.border}`,
            flexShrink: 0, minHeight: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8,
              background: t.primary, display: "flex",
              alignItems: "center", justifyContent: "center", color: t.onPrimary, fontSize: 11.5, fontWeight: 800 }}>
              {(session.displayName || session.username).split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="sv-desktop-only" style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: ink, lineHeight: 1.2 }}>
                {session.displayName || session.username}
              </div>
              <div style={{ fontSize: 11, color: t.textDim }}>{session.username}</div>
            </div>
          </div>
        </header>

        <main className="sv-scroll sv-main" style={{ padding: "20px 22px 60px", flex: 1 }}>
          {career ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 15, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT_M, fontSize: 10, letterSpacing: "0.12em",
                textTransform: "uppercase", color: ink }}>{current?.group}</span>
              <ChevronRight size={11} color={ink} />
              <span style={{ fontFamily: FONT_M, fontSize: 10, letterSpacing: "0.12em",
                textTransform: "uppercase", color: t.gold, fontWeight: 700 }}>{current?.label}</span>
            </div>
          ) : (
            // A plain page title, like any well-run institutional site.
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, color: t.textFaint }}>{current?.group}</div>
              <h1 style={{ fontFamily: FONT_B, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em", margin: "2px 0 0", color: t.text }}>
                {current?.label}</h1>
            </div>
          )}

          <ThemeContext.Provider value={t}>
            <div key={active} className="sv-fade" style={{ color: t.text }}>{children}</div>
          </ThemeContext.Provider>

          <footer style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${t.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <CollegeMark size={30} compact inverted={career} />
            <div style={{ fontSize: 10.5, color: ink, lineHeight: 1.6 }}>
              {COLLEGE.affiliation}<br />{COLLEGE.location} · {COLLEGE.motto}
            </div>
          </footer>
        </main>
      </div>

      <nav className="sv-mobile-only sv-glass" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 85, display: "flex",
        background: panel(0.82), borderTop: `1px solid ${t.border}`,
        boxShadow: "0 -4px 20px rgba(16,37,26,0.08)", paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {bottomItems.map((item) => {
          const on = active === item.key;
          return (
            <button key={item.key} className="sv-btn"
              onClick={() => item.key === "__more" ? setMobileOpen(true) : setActive(item.key)}
              style={{ flex: 1, minHeight: 58, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4, position: "relative",
                background: "transparent", border: "none", cursor: "pointer",
                color: on ? t.primary : ink, padding: "6px 2px" }}>
              {on && <span style={{ position: "absolute", top: 0, width: 26, height: 2.5,
                background: t.gold, borderRadius: "0 0 3px 3px" }} />}
              <item.icon size={19} strokeWidth={on ? 2.4 : 1.9} />
              <span style={{ fontSize: 9.5, fontWeight: on ? 700 : 500 }}>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
