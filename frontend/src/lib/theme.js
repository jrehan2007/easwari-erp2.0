/** Palette taken from the college crest: shield green, banner gold, seal red. */
export const theme = {
  // Neutral, solid surfaces: the college green is for actions and emphasis, not wash.
  bg: "#F4F5F3", bgSoft: "#F7F8F6",
  card: "#FFFFFF", cardSolid: "#FFFFFF",
  glassBorder: "#D3D8D3",
  border: "#E3E6E2", borderGold: "#E1D6B0",
  text: "#17201B", textDim: "#4B5751", textFaint: "#6B756F",
  primary: "#1B5E3A", primarySoft: "rgba(27,94,58,0.09)",
  gold: "#7A630D", goldSoft: "rgba(122,99,13,0.12)",
  success: "#1B7A4B", successSoft: "rgba(27,122,75,0.10)",
  warning: "#96690E", warningSoft: "rgba(150,105,14,0.11)",
  danger: "#C8102E", dangerSoft: "rgba(200,16,46,0.09)",
  sidebar: "#FFFFFF", overlay: "rgba(16,24,20,0.45)",
  seal: "rgba(27,94,58,0.05)",
  shadowSm: "0 1px 2px rgba(16,24,20,0.05)",
  shadowMd: "0 1px 2px rgba(16,24,20,0.04), 0 1px 3px rgba(16,24,20,0.04)",
  shadowLg: "0 4px 12px rgba(16,24,20,0.08), 0 12px 32px rgba(16,24,20,0.08)",
  surface: "#FFFFFF",          // inputs and inner panels
  onPrimary: "#FFFFFF",        // text on a primary-coloured button
  dark: false,
};

/**
 * Career Hub: black and gold. Colours are hex so "${color}33"-style alpha
 * suffixes used across the components keep working. Gold on near-black
 * passes WCAG AA comfortably; text on gold buttons is dark, not white.
 */
export const careerTheme = {
  bg: "#0A0A0B", bgSoft: "rgba(212,175,55,0.06)",
  card: "rgba(20,20,22,0.88)", cardSolid: "#141416",
  glassBorder: "rgba(212,175,55,0.40)",
  border: "rgba(212,175,55,0.16)", borderGold: "rgba(212,175,55,0.40)",
  text: "#F4EFE2", textDim: "#C8C0AA", textFaint: "#968D76",
  primary: "#D4AF37", primarySoft: "rgba(212,175,55,0.12)",
  gold: "#E8C766", goldSoft: "rgba(232,199,102,0.12)",
  success: "#7FD19B", successSoft: "rgba(127,209,155,0.12)",
  warning: "#F0B65A", warningSoft: "rgba(240,182,90,0.13)",
  danger: "#F07A7A", dangerSoft: "rgba(240,122,122,0.12)",
  sidebar: "rgba(12,12,13,0.94)", overlay: "rgba(0,0,0,0.62)",
  seal: "rgba(212,175,55,0.06)",
  shadowSm: "0 1px 2px rgba(0,0,0,0.5)",
  shadowMd: "0 2px 6px rgba(0,0,0,0.45), 0 10px 26px rgba(0,0,0,0.35)",
  shadowLg: "0 8px 20px rgba(0,0,0,0.55), 0 24px 56px rgba(212,175,55,0.10)",
  surface: "#1A1A1D",
  onPrimary: "#111111",
  dark: true,
};

export const COLLEGE = {
  name: "Easwari Engineering College",
  shortName: "Easwari",
  group: "SRM Group of Institutions",
  estd: "1996",
  affiliation: "Autonomous · Affiliated to Anna University",
  location: "Ramapuram, Chennai",
  motto: "Educate and Excel",
  logoUrl: "/logo.png",   // drop the crest PNG into frontend/public/logo.png
};

// Headings use the same sans as body text. The serif is kept for the college
// name, the sign-in screens and the Career Hub.
export const FONT_D = "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const FONT_SERIF = "'Fraunces', 'Georgia', 'Times New Roman', serif";
export const FONT_B = "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const FONT_M = "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";
