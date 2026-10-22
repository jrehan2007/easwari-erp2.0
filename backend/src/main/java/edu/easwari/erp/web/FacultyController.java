package edu.easwari.erp.web;

import edu.easwari.erp.config.CurrentUser;
import edu.easwari.erp.domain.AssessmentType;
import edu.easwari.erp.service.*;
import edu.easwari.erp.service.Dtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/faculty")
@PreAuthorize("hasAnyRole('FACULTY','ADMIN')") @RequiredArgsConstructor
public class FacultyController {

    private final CurrentUser currentUser;
    private final FacultyService facultyService;
    private final AttendanceService attendanceService;
    private final MarksService marksService;
    private final IntelligenceService intelligence;
    private final LeaveApplicationService leaveApplicationService;
    private final CurriculumService curriculumService;

    @GetMapping("/classes")
    public List<FacultyClass> classes() {
        return facultyService.classesFor(currentUser.get());
    }

    @GetMapping("/classes/{classSectionId}/students")
    public List<Map<String, Object>> students(@PathVariable Long classSectionId) {
        return facultyService.studentsIn(currentUser.get(), classSectionId);
    }

    @PostMapping("/classes/{classSectionId}/students")
    public Map<String, Object> addStudent(@PathVariable Long classSectionId,
                                         @Valid @RequestBody AddStudentToSectionRequest req) {
        var created = facultyService.addStudentToSection(currentUser.get(), classSectionId, req);
        return Map.of(
                "studentId", created.getId(),
                "rollNo", created.getRollNo(),
                "name", created.getName(),
                "message", "Student added to the section");
    }

    /** Every subject of a class; editable=true only where this user may mark or enter marks. */
    @GetMapping("/classes/{classSectionId}/offerings")
    public List<CurriculumService.OfferingView> offerings(@PathVariable Long classSectionId) {
        return curriculumService.forSection(currentUser.get(), classSectionId);
    }

    @GetMapping("/attention")
    public List<AtRiskStudent> needsAttention() {
        return facultyService.needsAttention(currentUser.get());
    }

    /* ─────────────── Attendance: two entry paths ─────────────── */

    /** Pre-filled roster for the whole teaching day, defaulted to present. */
    @GetMapping("/attendance/roster")
    public List<PeriodRoster> roster(@RequestParam Long classSectionId,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return attendanceService.rosterForDay(currentUser.get(), classSectionId, date);
    }

    /** Path one: a single period, marked between hours. */
    @PostMapping("/attendance/period")
    public Map<String, Object> markPeriod(@Valid @RequestBody MarkPeriodRequest req) {
        int written = attendanceService.markPeriod(currentUser.get(), req);
        return Map.of("recordsWritten", written, "message", "Attendance saved for period " + req.period());
    }

    /** Path two: the whole day in one submit, for catching up. */
    @PostMapping("/attendance/day")
    public Map<String, Object> markDay(@Valid @RequestBody MarkDayRequest req) {
        int written = attendanceService.markDay(currentUser.get(), req);
        return Map.of("recordsWritten", written, "message", "Attendance saved for " + req.date());
    }

    /* ─────────────── Marks with the publish gate ─────────────── */

    @PostMapping("/marks")
    public Map<String, Object> saveMarks(@Valid @RequestBody MarkEntryRequest req) {
        var assessment = marksService.saveMarks(currentUser.get(), req);
        // An assessment stays published once released; saving it again updates what students see.
        return Map.of("assessmentId", assessment.getId(),
                "published", assessment.isPublished(),
                "message", req.publish() ? "Marks published and visible to students"
                        : assessment.isPublished() ? "Saved. This assessment is already published, so students see the change."
                        : "Draft saved. Students cannot see these yet.");
    }

    @GetMapping("/marks")
    public MarkSheet markSheet(@RequestParam Long subjectOfferingId, @RequestParam AssessmentType type) {
        return marksService.sheetFor(currentUser.get(), subjectOfferingId, type);
    }

    @GetMapping("/leave-applications/pending")
    public List<LeaveApplicationView> pendingLeaveApplications() {
        return leaveApplicationService.listPendingForFaculty(currentUser.get());
    }

    @PostMapping("/leave-applications/{id}/approve")
    public LeaveApplicationView approveLeaveApplication(@PathVariable Long id) {
        return leaveApplicationService.approve(currentUser.get(), id);
    }

    @PostMapping("/leave-applications/{id}/reject")
    public LeaveApplicationView rejectLeaveApplication(@PathVariable Long id,
                                                     @RequestParam String reviewNote) {
        return leaveApplicationService.reject(currentUser.get(), id, reviewNote);
    }

    @PostMapping("/assistant/chat")
    public Map<String, Object> chat(@Valid @RequestBody ChatRequest req) {
        return intelligence.chat(null, "FACULTY", req.message());
    }
}
