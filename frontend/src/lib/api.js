/**
 * Single place the browser talks to the server.
 * Token lives in memory only — no localStorage, so a shared lab machine
 * doesn't leave a session behind after the tab closes.
 */

const BASE = import.meta.env.VITE_API_BASE || "";

let authToken = null;
const listeners = new Set();

export function setToken(token) {
  authToken = token;
  listeners.forEach((fn) => fn(token));
}
export function getToken() { return authToken; }
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

async function request(path, { method = "GET", body, raw = false } = {}) {
  const headers = {};
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  // A 401 only means an expired session if we actually sent a token.
  // At sign-in it means wrong credentials, and the server's message says so.
  if (res.status === 401 && authToken) {
    setToken(null);
    throw new Error("Your session has expired. Sign in again.");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json()).message || message; } catch { /* non-JSON error body */ }
    throw new Error(message);
  }
  if (raw) return res.blob();
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // auth
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password } }),
  loginCode: (username, code) => request("/auth/login-code", { method: "POST", body: { username, code } }),
  setQuickCode: (password, code) => request("/auth/quick-code", { method: "POST", body: { password, code } }),
  removeQuickCode: () => request("/auth/quick-code", { method: "DELETE" }),
  me: () => request("/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }),
  health: () => request("/health"),

  // student
  studentProfile: () => request("/student/me"),
  studentAttendance: (subject = "all") => request(`/student/attendance?subject=${encodeURIComponent(subject)}`),
  studentMarks: () => request("/student/marks"),
  studentCmsRequests: () => request("/student/cms-requests"),
  raiseCmsRequest: (serviceType, fields) =>
    request("/student/cms-requests", { method: "POST", body: { serviceType, fields } }),
  studentCompanies: () => request("/student/placement/companies"),
  applyToCompany: (id) => request(`/student/placement/companies/${id}/apply`, { method: "POST" }),
  studentReadiness: () => request("/student/placement/readiness"),
  studentInternships: () => request("/student/internships"),
  studentLearningPath: () => request("/student/learning-path"),
  studentRoadmap: () => request("/student/roadmap"),
  studentRisk: () => request("/student/risk"),
  studentLeaveApplications: () => request("/student/leave-applications"),
  submitLeaveApplication: (formData) => request("/student/leave-applications", { method: "POST", body: formData }),
  studentChat: (message) => request("/student/assistant/chat", { method: "POST", body: { message } }),
  exportAttendance: () => request("/student/export/attendance.xlsx", { raw: true }),
  exportMarks: () => request("/student/export/marks.xlsx", { raw: true }),

  // admin curriculum
  adminPrograms: () => request("/admin/programs"),
  adminCreateProgram: (payload) => request("/admin/programs", { method: "POST", body: payload }),
  adminOfferings: () => request("/admin/offerings"),
  adminCreateOffering: (payload) => request("/admin/offerings", { method: "POST", body: payload }),
  adminAssignFaculty: (id, facultyId) =>
    request(`/admin/offerings/${id}/faculty`, { method: "PATCH", body: { facultyId } }),

  // faculty
  facultyClasses: () => request("/faculty/classes"),
  facultyStudents: (sectionId) => request(`/faculty/classes/${sectionId}/students`),
  facultyAddStudent: (sectionId, payload) => request(`/faculty/classes/${sectionId}/students`, {
    method: "POST",
    body: payload,
  }),
  facultyOfferings: (sectionId) => request(`/faculty/classes/${sectionId}/offerings`),
  facultyAttention: () => request("/faculty/attention"),
  facultyRoster: (classSectionId, date) =>
    request(`/faculty/attendance/roster?classSectionId=${classSectionId}&date=${date}`),
  markPeriod: (payload) => request("/faculty/attendance/period", { method: "POST", body: payload }),
  markDay: (payload) => request("/faculty/attendance/day", { method: "POST", body: payload }),
  saveMarks: (payload) => request("/faculty/marks", { method: "POST", body: payload }),
  facultyMarkSheet: (subjectOfferingId, type) =>
    request(`/faculty/marks?subjectOfferingId=${subjectOfferingId}&type=${encodeURIComponent(type)}`),
  facultyPendingLeaveApplications: () => request("/faculty/leave-applications/pending"),
  approveLeaveApplication: (id) => request(`/faculty/leave-applications/${id}/approve`, { method: "POST" }),
  rejectLeaveApplication: (id, reviewNote) => request(`/faculty/leave-applications/${id}/reject?reviewNote=${encodeURIComponent(reviewNote)}`, { method: "POST" }),
  facultyChat: (message) => request("/faculty/assistant/chat", { method: "POST", body: { message } }),

  // admin
  adminDashboard: () => request("/admin/dashboard"),
  adminReference: () => request("/admin/reference"),
  adminUsers: (role) => request(`/admin/users${role ? `?role=${role}` : ""}`),
  createUser: (payload) => request("/admin/users", { method: "POST", body: payload }),
  adminDepartments: () => request("/admin/departments"),
  createDepartment: (payload) => request("/admin/departments", { method: "POST", body: payload }),
  adminClassSections: () => request("/admin/class-sections"),
  createClassSection: (payload) => request("/admin/class-sections", { method: "POST", body: payload }),
  assignClassSectionCoordinator: (id, facultyId) => request(`/admin/class-sections/${id}/coordinator`, {
    method: "PATCH",
    body: facultyId == null ? { facultyId: null } : { facultyId },
  }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),
  deleteDepartment: (id) => request(`/admin/departments/${id}`, { method: "DELETE" }),
  deleteClassSection: (id) => request(`/admin/class-sections/${id}`, { method: "DELETE" }),
  setUserAccess: (id, active) => request(`/admin/users/${id}/access?active=${active}`, { method: "PATCH" }),
  resetUserPassword: (id) => request(`/admin/users/${id}/reset-password`, { method: "POST" }),
  bulkImport: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/admin/users/bulk-import", { method: "POST", body: fd });
  },
  importTemplate: () => request("/admin/users/import-template.xlsx", { raw: true }),
  adminAudit: () => request("/admin/audit"),
  adminCmsRequests: () => request("/admin/cms-requests"),
  adminLeaveApplications: () => request("/admin/leave-applications"),
  updateCmsRequest: (id, status, note) =>
    request(`/admin/cms-requests/${id}?status=${status}${note ? `&note=${encodeURIComponent(note)}` : ""}`,
      { method: "PATCH" }),
};

/** Triggers a browser download from a blob response. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
