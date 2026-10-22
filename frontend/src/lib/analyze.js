import { ROLES } from "./careerData";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, term) => new RegExp(`(^|[^a-z0-9+#])${esc(term)}($|[^a-z0-9+#])`, "i").test(text);

/** Which skills of a role appear in this text. */
export function matchSkills(text, role) {
  const found = [], missing = [];
  for (const [name, aliases] of role.skills) (aliases.some((a) => has(text, a)) ? found : missing).push(name);
  return { found, missing, pct: Math.round((found.length / role.skills.length) * 100) };
}

const SECTION_PATTERNS = {
  summary: /^(summary|professional summary|objective|career objective|profile|about me)\b/im,
  education: /^(education|academic)/im,
  experience: /^(experience|work experience|internships?|employment)/im,
  projects: /^(projects?|academic projects|personal projects)/im,
  skills: /^(skills|technical skills|core skills|key skills)/im,
  extras: /^(certifications?|achievements?|awards?|extra.?curricular|positions? of responsibility|activities)/im,
};
const ACTION_VERBS = ["built", "developed", "designed", "implemented", "created", "led", "managed", "optimized", "optimised", "improved", "reduced",
  "increased", "automated", "deployed", "analysed", "analyzed", "launched", "organised", "organized", "engineered", "integrated", "migrated", "wrote", "delivered", "trained", "tested"];

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

export function analyzeResume(text, role) {
  const raw = text || "";
  const words = raw.split(/\s+/).filter(Boolean);
  const lines = raw.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim());
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(raw);
  const phone = /(\+?\d[\d\s-]{8,}\d)/.test(raw);
  const links = /(linkedin\.com|github\.com)/i.test(raw);
  const sections = Object.fromEntries(Object.entries(SECTION_PATTERNS).map(([k, re]) => [k, re.test(raw)]));
  const sectionCount = Object.values(sections).filter(Boolean).length;
  const bullets = nonEmpty.filter((l) => /^\s*[-•*▪●–]/.test(l)).length;
  const lower = raw.toLowerCase();
  const verbHits = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}\\b`).test(lower)).length;
  const numbers = (raw.match(/\b\d+(\.\d+)?\s?(%|x|k|\+)?/g) || []).length;
  const avgLine = nonEmpty.length ? words.length / nonEmpty.length : 0;
  const kw = matchSkills(raw, role);

  // ATS: can a parser find the basics?
  const ats = clamp((email ? 18 : 0) + (phone ? 12 : 0) + (links ? 8 : 0) + (sectionCount / 6) * 50 + (words.length >= 200 ? 12 : (words.length / 200) * 12));
  // Content: do the bullets say what you did and what changed?
  const content = clamp(Math.min(verbHits, 8) / 8 * 45 + Math.min(numbers, 8) / 8 * 35 + (bullets >= 6 ? 20 : (bullets / 6) * 20));
  // Formatting: sensible length, scannable lines.
  const lenScore = words.length < 250 ? (words.length / 250) * 50 : words.length <= 800 ? 50 : Math.max(0, 50 - (words.length - 800) / 20);
  const format = clamp(lenScore + (avgLine > 0 && avgLine < 22 ? 30 : 10) + (bullets > 0 ? 20 : 0));
  const keywords = kw.pct;
  const overall = clamp(ats * 0.3 + content * 0.3 + format * 0.15 + keywords * 0.25);

  const tips = [];
  if (!email) tips.push("Add a professional email address near the top.");
  if (!phone) tips.push("Add a phone number so recruiters can reach you.");
  if (!links) tips.push("Link your GitHub and LinkedIn profiles.");
  for (const [k, ok] of Object.entries(sections)) if (!ok && k !== "summary") tips.push(`Add a clear "${k === "extras" ? "Certifications / Achievements" : k[0].toUpperCase() + k.slice(1)}" section heading.`);
  if (words.length < 250) tips.push("The resume is short. Add projects, internships or coursework with detail.");
  if (words.length > 800) tips.push("The resume is long. Keep it to one page for a fresher, about 400–600 words.");
  if (verbHits < 5) tips.push("Start bullets with action verbs such as built, designed, automated or reduced.");
  if (numbers < 4) tips.push("Add numbers: users, speed-ups, accuracy, marks, team size.");
  if (bullets < 6) tips.push("Use bullet points for projects and experience so they scan quickly.");
  if (kw.missing.length) tips.push(`For ${role.title}, add the skills you really have from: ${kw.missing.slice(0, 5).join(", ")}.`);

  return { words: words.length, overall, ats, content, format, keywords, found: kw.found, missing: kw.missing, tips, sections, email, phone, links };
}

/** Rank every role by how much of its skill list appears in the text. */
export function recommendRoles(text) {
  return ROLES.map((r) => ({ role: r, ...matchSkills(text, r) })).sort((a, b) => b.pct - a.pct);
}

/* ───────── GitHub profile scoring from the public API ───────── */
export function analyzeGithub(user, repos) {
  const own = repos.filter((r) => !r.fork);
  const stars = own.reduce((n, r) => n + r.stargazers_count, 0);
  const forks = own.reduce((n, r) => n + r.forks_count, 0);
  const now = Date.now();
  const recent = own.filter((r) => now - new Date(r.pushed_at).getTime() < 90 * 864e5).length;
  const described = own.filter((r) => r.description).length;
  const withTopics = own.filter((r) => (r.topics || []).length).length;
  const langs = {};
  own.forEach((r) => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
  const langList = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  const profileReadme = repos.some((r) => r.name.toLowerCase() === user.login.toLowerCase());
  const top = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 5);

  const checks = [
    ["Has a bio", !!user.bio], ["Shows a name", !!user.name], ["Links a website or portfolio", !!user.blog],
    ["Has a profile README", profileReadme], ["At least 4 original repositories", own.length >= 4],
    ["Pushed code in the last 90 days", recent > 0], ["Most repos have descriptions", own.length > 0 && described / own.length >= 0.6],
    ["Uses repository topics", withTopics > 0], ["Uses 2+ languages", langList.length >= 2],
  ];
  const score = Math.round((checks.filter((c) => c[1]).length / checks.length) * 100);
  const tips = checks.filter((c) => !c[1]).map(([label]) => `Missing: ${label.toLowerCase()}.`);
  return { score, checks, tips, stars, forks, recent, original: own.length, forked: repos.length - own.length, langList, top };
}

/* ───────── Study helpers: no AI service, just honest text processing ───────── */
const STOP = new Set(("a an the and or but if then else of to in on at by for with from as is are was were be been being this that these those it its " +
  "into about over under between not no can could should would will shall may might do does did done have has had having which who whom whose what when where " +
  "why how than so such also very more most other some any each both few many much own same too just only their there they them we you your our i he she his her").split(" "));

export const sentences = (text) => (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || [text]).map((s) => s.trim()).filter((s) => s.split(" ").length >= 6);

export function keyTerms(text, n = 12) {
  const freq = {};
  (text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []).forEach((w) => { if (!STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w, c]) => ({ term: w, count: c }));
}

export function summarize(text, n = 5) {
  const sents = sentences(text);
  const terms = Object.fromEntries(keyTerms(text, 30).map((t) => [t.term, t.count]));
  const scored = sents.map((s, i) => ({ s, i, score: (s.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []).reduce((a, w) => a + (terms[w] || 0), 0) / Math.sqrt(s.length) }));
  return scored.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.s);
}

/** Fill-in-the-blank questions: blank out the most important term in the best sentences. */
export function makeQuiz(text, n = 6) {
  const terms = keyTerms(text, 25).map((t) => t.term);
  const out = [];
  const used = new Set();
  for (const s of summarize(text, Math.min(n * 2, 14))) {
    const term = terms.find((t) => new RegExp(`\\b${t}\\b`, "i").test(s) && !used.has(t));
    if (!term) continue;
    used.add(term);
    const options = [term, ...terms.filter((t) => t !== term).slice(0, 12).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
    out.push({ q: s.replace(new RegExp(`\\b${term}\\b`, "i"), "_____"), answer: term, options });
    if (out.length >= n) break;
  }
  return out;
}

/* ───────── Full resume report: score, pros, cons, upgrades, readiness ───────── */
const PERSONAL = /\b(date of birth|d\.?o\.?b|father'?s name|mother'?s name|religion|caste|marital status|nationality|gender)\b/i;
const DECLARATION = /^\s*declaration\b|hereby declare/im;
const GENERIC_OBJECTIVE = /(challenging (position|role|environment)|utili[sz]e my skills|growth of the (organi[sz]ation|company))/i;
const CGPA = /\b(c?gpa|cgpa|sgpa)\b[^\n]{0,12}\d(\.\d{1,2})?|\b\d\.\d{1,2}\s*\/\s*10\b/i;
const CODING = /(leetcode|codechef|codeforces|hackerrank|geeksforgeeks|gfg)/i;
const ACHIEVE = /\b(winner|won|first place|1st place|runner[- ]?up|finalist|rank(ed)?|top \d+|hackathon|award|scholarship|published)\b/i;
const INTERN = /\b(intern(ship)?|trainee|work experience)\b/i;

/**
 * Turns the raw scores into what a student can act on. `meta` comes from the
 * PDF reader (pages, size, fonts, links) and is optional for pasted text.
 */
export function resumeReport(text, role, meta = null) {
  const r = analyzeResume(text, role);
  const raw = text || "";
  const pros = [], cons = [], upgrades = [];

  // PDF format
  let formatPenalty = 0;
  if (meta) {
    // A scanned or image-only PDF has (almost) no text layer at all; a short resume still has some.
    const perPage = meta.chars / Math.max(1, meta.pages);
    if (meta.chars < 120 || perPage < 60) { cons.push("The PDF has almost no selectable text. It looks scanned or exported as an image, so ATS software can't read it."); formatPenalty += 25;
      upgrades.push("Export the resume from Word, Google Docs or LaTeX as a text PDF, not a photo or scan."); }
    else pros.push("Text is selectable, so applicant tracking systems can parse it.");
    if (meta.pages === 1) pros.push("One page: the right length for an internship or fresher role.");
    else if (meta.pages === 2) { cons.push("Two pages. Recruiters spend seconds on a fresher resume; one page is safer."); formatPenalty += 4;
      upgrades.push("Trim to one page: drop school-level details, keep the strongest three projects."); }
    else { cons.push(`${meta.pages} pages is too long for a student resume.`); formatPenalty += 12;
      upgrades.push("Cut it down to one page."); }
    if (meta.sizeKB > 2048) { cons.push(`The file is ${(meta.sizeKB / 1024).toFixed(1)} MB. Many job portals reject files over 2 MB.`); formatPenalty += 5;
      upgrades.push("Compress the PDF under 1 MB (remove large images)."); }
    if (meta.fontSizes > 6) { cons.push("Many different font sizes make the layout look inconsistent."); formatPenalty += 3;
      upgrades.push("Use one font, with at most three sizes: name, headings, body."); }
    const linked = meta.links.filter((l) => /linkedin|github|leetcode|portfolio|vercel|netlify|\.dev|\.me/i.test(l));
    if (linked.length) pros.push(`Clickable profile links (${linked.length}) let a recruiter check your work in one click.`);
    else if (r.links) upgrades.push("Make your GitHub and LinkedIn links clickable in the PDF.");
    if (!/resume|cv/i.test(meta.fileName) || /^(document|untitled|scan|img|image)/i.test(meta.fileName)) {
      upgrades.push("Name the file Firstname_Lastname_Resume.pdf so it's easy to find in a recruiter's downloads.");
    }
  }

  // Content
  const has = (k) => r.sections[k];
  if (r.email && r.phone) pros.push("Contact details (email and phone) are present."); else cons.push("Contact details are incomplete.");
  if (r.links) pros.push("Links to GitHub or LinkedIn show work beyond the classroom.");
  else { cons.push("No GitHub or LinkedIn link."); upgrades.push("Add GitHub and LinkedIn URLs under your name."); }
  if (has("education") && CGPA.test(raw)) pros.push("Education section shows your CGPA, which placement cells filter on.");
  else if (has("education")) { cons.push("Education is listed without a CGPA."); upgrades.push("Show your CGPA (e.g. CGPA 8.4/10) next to your degree."); }
  else { cons.push("No Education section heading."); upgrades.push('Add an "Education" section: degree, college, year, CGPA.'); }
  if (has("projects")) pros.push("Has a Projects section, the strongest signal for a student."); else {
    cons.push("No Projects section."); upgrades.push("Add 2–3 projects, each with the tech stack, what you built and a measurable result."); }
  if (has("experience") || INTERN.test(raw)) pros.push("Mentions internship or work experience.");
  else upgrades.push("Even a short internship, freelance job or open-source contribution makes a big difference. Add one when you can.");
  if (has("skills")) pros.push("Has a Skills section for keyword matching."); else { cons.push("No Skills section."); upgrades.push('Add a "Technical Skills" section grouped as Languages, Frameworks, Tools.'); }
  if (CODING.test(raw)) pros.push("Coding-platform profile (LeetCode, CodeChef…) shows problem-solving practice.");
  else upgrades.push("Add your LeetCode or CodeChef profile with problems solved or rating.");
  if (ACHIEVE.test(raw)) pros.push("Achievements (hackathons, ranks, awards) stand out.");
  else upgrades.push("Add achievements: hackathons, contests, symposium prizes, scholarships.");
  if (has("extras")) pros.push("Lists certifications or achievements.");
  if (r.content >= 70) pros.push("Bullets use action verbs and numbers, so impact is clear.");
  else { cons.push("Bullets describe duties more than results."); upgrades.push('Rewrite bullets as "Built X using Y, which improved Z by N%".'); }
  if (PERSONAL.test(raw)) { cons.push("Contains personal details (date of birth, father's name, religion…) that recruiters don't need."); formatPenalty += 3;
    upgrades.push("Remove date of birth, parents' names, religion and marital status."); }
  if (DECLARATION.test(raw)) { cons.push('Has a "Declaration" section, which is outdated and wastes space.'); upgrades.push('Delete the "Declaration" section.'); }
  if (GENERIC_OBJECTIVE.test(raw)) { cons.push("The objective is generic and says nothing specific about you."); upgrades.push("Replace the objective with a 2-line summary: your focus, top skills and what you're looking for."); }
  if (r.words < 250) cons.push(`Only ${r.words} words: too thin to judge.`);
  if (r.words > 800) cons.push(`${r.words} words: too dense for a fresher resume.`);
  if (r.missing.length) upgrades.push(`For ${role.title}, learn and show: ${r.missing.slice(0, 5).join(", ")}.`);

  const score = Math.max(0, Math.min(100, r.overall - formatPenalty));
  const scanned = meta && (meta.chars < 120 || meta.chars / Math.max(1, meta.pages) < 60);

  const internshipBlocks = [];
  if (scanned) internshipBlocks.push("the PDF can't be read by ATS");
  if (!(r.email && r.phone)) internshipBlocks.push("contact details are missing");
  if (!has("education")) internshipBlocks.push("education is missing");
  if (!has("projects") && !has("skills")) internshipBlocks.push("no projects or skills section");
  if (score < 55) internshipBlocks.push(`score ${score} is below 55`);

  const placementBlocks = [];
  if (scanned) placementBlocks.push("the PDF can't be read by ATS");
  if (!has("projects") && !has("experience")) placementBlocks.push("needs projects or internship experience");
  if (!CGPA.test(raw)) placementBlocks.push("CGPA isn't shown");
  if (!r.links) placementBlocks.push("no GitHub / LinkedIn link");
  if (meta && meta.pages > 2) placementBlocks.push("more than two pages");
  if (r.keywords < 50) placementBlocks.push(`only ${r.keywords}% of ${role.title} skills found`);
  if (score < 70) placementBlocks.push(`score ${score} is below 70`);

  return {
    ...r, score, pros, cons, upgrades: [...new Set(upgrades)],
    internship: { ready: internshipBlocks.length === 0, reasons: internshipBlocks },
    placement: { ready: placementBlocks.length === 0, reasons: placementBlocks },
  };
}
