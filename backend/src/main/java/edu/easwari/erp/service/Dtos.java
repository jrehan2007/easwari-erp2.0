package edu.easwari.erp.service;

import edu.easwari.erp.domain.AttendanceStatus;
import edu.easwari.erp.domain.AssessmentType;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Request and response shapes. Records keep them immutable and terse. */
public class Dtos {

    // ── Auth ──
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record LoginResponse(String token, String username, String role, String displayName,
                                boolean mustChangePassword, Long profileId, boolean hasQuickCode) {}
    public record CodeLoginRequest(@NotBlank String username, @NotBlank @Pattern(regexp = "\\d{6}", message = "The code is 6 digits") String code) {}
    public record SetCodeRequest(@NotBlank String password, @NotBlank @Pattern(regexp = "\\d{6}", message = "The code must be exactly 6 digits") String code) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 8, message = "Use at least 8 characters") String newPassword) {}

    // ── Admin ──
    public record CreateUserRequest(@NotBlank String username, @NotBlank String role, @NotBlank String name,
                                    String email, String phone, String departmentCode, String programCode,
                                    String section, Integer year, Integer semester, String staffCode,
                                    String designation, String initialPassword) {}
    public record CreateDepartmentRequest(@NotBlank String code, @NotBlank String name, String hodName) {}
    public record CreateClassSectionRequest(@NotNull Long programId, @Min(1) int year,
                                           @Min(1) int semester, @NotBlank String section,
                                           String academicYear) {}
    public record AddStudentToSectionRequest(@NotBlank String name, @NotBlank String rollNumber,
                                             @NotNull Integer year, @NotNull Integer batch) {}
    public record AssignCoordinatorRequest(@NotNull Long facultyId) {}
    public record DepartmentSummary(Long id, String code, String name, String hodName) {}
    public record ClassSectionSummary(Long id, Long programId, String programCode, String programName,
                                     String departmentCode, int year, int semester, String section,
                                     String academicYear, Long coordinatorId, String coordinatorName,
                                     String coordinatorStaffCode) {}
    /** initialPassword is populated only in the response to a creation, never when listing. */
    public record UserSummary(Long id, String username, String role, String name, boolean active,
                              String department, String createdAt, String initialPassword) {}
    public record AuditEntry(String actor, String action, String targetType, Long targetId,
                             String detail, String at) {}
    /** credentials: each created account's one-time password, shown to the admin once. */
    public record ImportResult(int created, int skipped, List<String> errors, List<Credential> credentials) {}
    public record Credential(String username, String name, String temporaryPassword) {}
    /** A student added by their class coordinator, with the one-time password to hand over. */
    public record AddedStudent(edu.easwari.erp.domain.Student student, String temporaryPassword) {}

    // ── Attendance ──
    /** Single period, one class. The quick path faculty use between hours. */
    public record MarkPeriodRequest(@NotNull Long subjectOfferingId, @NotNull LocalDate date,
                                    @Min(1) @Max(8) int period,
                                    @NotNull List<StudentStatus> entries) {}
    public record StudentStatus(@NotNull Long studentId, @NotNull AttendanceStatus status, String remarks) {}

    /** Whole day in one submit, for catching up on a backlog. */
    public record MarkDayRequest(@NotNull Long classSectionId, @NotNull LocalDate date,
                                 @NotNull List<PeriodBlock> periods) {}
    public record PeriodBlock(@NotNull Long subjectOfferingId, @Min(1) @Max(8) int period,
                              @NotNull List<StudentStatus> entries) {}

    public record AttendanceCell(String date, int period, String subjectCode, String subjectName,
                                 String status, String time) {}
    public record SubjectAttendance(String subjectCode, String subjectName, int credits,
                                    long conducted, long attended, int percentage,
                                    boolean eligible, long periodsCanStillMiss) {}
    public record DayAttendance(String date, long conducted, long attended, int percentage) {}
    public record AttendanceView(int overallPercentage, long conducted, long attended,
                                 Map<String, Long> statusCounts,
                                 List<SubjectAttendance> subjects,
                                 List<AttendanceCell> cells,
                                 List<DayAttendance> days) {}
    public record RosterEntry(Long studentId, String rollNo, String name, String status) {}
    public record PeriodRoster(Long subjectOfferingId, String subjectCode, String subjectName,
                               int period, String time, String room, boolean alreadyMarked,
                               List<RosterEntry> roster) {}

    // ── Marks ──
    public record MarkEntryRequest(@NotNull Long subjectOfferingId, @NotNull AssessmentType type,
                                   @Min(1) int maxMarks, @NotNull List<ScoreEntry> scores, boolean publish) {}
    public record ScoreEntry(@NotNull Long studentId, Double score) {}
    /** What is already stored for one subject + assessment, so the entry form starts from it. */
    public record MarkSheet(Long assessmentId, Integer maxMarks, boolean published, Map<Long, Double> scores) {}
    public record SubjectMarks(String subjectCode, String subjectName, int credits,
                               Double ia1, Integer ia1Max, Double ia2, Integer ia2Max,
                               Integer averagePercentage, String grade) {}
    public record MarksView(double cgpa, int creditsEarned, int creditsRequired, List<SubjectMarks> subjects) {}

    // ── Campus services ──
    public record CmsRequestCreate(@NotBlank String serviceType, Map<String, String> fields) {}
    public record CmsRequestView(Long id, String ticketNo, String serviceType, String status,
                                 String createdAt, String resolutionNote) {}

    // ── Placement ──
    public record CompanyView(Long id, String name, String jobRole, String ctc, String criteria,
                              String deadline, boolean eligible, String ineligibleReason,
                              Integer matchPercentage, boolean applied) {}
    public record InternshipView(Long id, String title, String organisation, String duration,
                                 String stipend, String mode, String deadline, long daysLeft) {}

    // ── Dashboards ──
    public record StudentProfile(Long id, String rollNo, String regNo, String name, String email,
                                 String phone, String programCode, String programName, int durationYears,
                                 String department, String section, int year, int semester,
                                 String batch, String mentor, String classCoordinator, String hostel,
                                 double cgpa, int creditsEarned, int creditsRequired) {}
    /** coordinator: the signed-in faculty member is this section's class coordinator. */
    public record FacultyClass(Long classSectionId, Long subjectOfferingId, String subjectCode,
                               String subjectName, String sectionName, int studentCount,
                               int averageAttendance, int studentsAtRisk, boolean coordinator) {}
    public record AtRiskStudent(Long studentId, String rollNo, String name, String sectionName,
                                int riskScore, String band, List<String> reasons) {}
    public record AdminDashboard(long students, long faculty, long departments, long openRequests,
                                 int institutionAttendance, List<Map<String, Object>> departmentStats,
                                 List<Map<String, Object>> riskDistribution) {}
    public record LeaveApplicationView(Long id, String studentName, String rollNo, String className,
                                      String fromDate, String toDate, String type, String reason,
                                      String proofFileName, String proofUrl, String status,
                                      String appliedAt, String reviewedBy, String reviewedAt, String reviewNote) {}
    public record ChatRequest(@NotBlank String message) {}
}
