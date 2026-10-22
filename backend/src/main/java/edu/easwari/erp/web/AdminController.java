package edu.easwari.erp.web;

import edu.easwari.erp.config.CurrentUser;
import edu.easwari.erp.excel.ExcelService;
import edu.easwari.erp.service.*;
import edu.easwari.erp.service.Dtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class AdminController {

    private final CurrentUser currentUser;
    private final AdminService adminService;
    private final CmsService cmsService;
    private final ExcelService excelService;
    private final IntelligenceService intelligence;
    private final LeaveApplicationService leaveApplicationService;
    private final CurriculumService curriculumService;

    @GetMapping("/dashboard")
    public AdminDashboard dashboard() {
        return adminService.dashboard();
    }

    /* ─────────────── Access management ─────────────── */

    /** Programmes, sections and departments that exist — populates the provisioning form. */
    @GetMapping("/reference")
    public Map<String, Object> reference() {
        return adminService.reference();
    }

    @GetMapping("/users")
    public List<UserSummary> users(@RequestParam(required = false) String role) {
        return adminService.listUsers(role);
    }

    @PostMapping("/users")
    public UserSummary createUser(@Valid @RequestBody CreateUserRequest req) {
        return adminService.createUser(currentUser.get(), req);
    }

    @PostMapping("/departments")
    public DepartmentSummary createDepartment(@Valid @RequestBody CreateDepartmentRequest req) {
        return adminService.createDepartment(currentUser.get(), req);
    }

    @PostMapping("/class-sections")
    public ClassSectionSummary createClassSection(@Valid @RequestBody CreateClassSectionRequest req) {
        return adminService.createClassSection(currentUser.get(), req);
    }

    @GetMapping("/departments")
    public List<DepartmentSummary> departments() {
        return adminService.listDepartments();
    }

    @GetMapping("/class-sections")
    public List<ClassSectionSummary> classSections() {
        return adminService.listClassSections();
    }

    @PatchMapping("/class-sections/{id}/coordinator")
    public ClassSectionSummary assignCoordinator(@PathVariable Long id,
                                               @RequestBody(required = false) AssignCoordinatorRequest req) {
        return adminService.assignCoordinator(currentUser.get(), id, req);
    }

    @PatchMapping("/users/{id}/access")
    public Map<String, String> setAccess(@PathVariable Long id, @RequestParam boolean active) {
        adminService.setActive(currentUser.get(), id, active);
        return Map.of("message", active ? "Access granted" : "Access revoked");
    }

    @DeleteMapping("/users/{id}")
    public Map<String, String> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(currentUser.get(), id);
        return Map.of("message", "Account deleted");
    }

    @DeleteMapping("/departments/{id}")
    public Map<String, String> deleteDepartment(@PathVariable Long id) {
        adminService.deleteDepartment(currentUser.get(), id);
        return Map.of("message", "Department deleted");
    }

    @DeleteMapping("/class-sections/{id}")
    public Map<String, String> deleteClassSection(@PathVariable Long id) {
        adminService.deleteClassSection(currentUser.get(), id);
        return Map.of("message", "Class section deleted");
    }

    @PostMapping("/users/{id}/reset-password")
    public Map<String, String> resetPassword(@PathVariable Long id) {
        String temp = adminService.resetPassword(currentUser.get(), id);
        return Map.of("temporaryPassword", temp,
                "message", "Share this once. The user must change it at next sign-in.");
    }

    @PostMapping(value = "/users/bulk-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResult bulkImport(@RequestParam("file") MultipartFile file) {
        return excelService.importUsers(currentUser.get(), file);
    }

    @GetMapping("/users/import-template.xlsx")
    public ResponseEntity<byte[]> importTemplate() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"user-import-template.xlsx\"")
                .body(excelService.userImportTemplate());
    }

    /* ─────────────── Curriculum: programmes, courses, teachers, timetable ─────────────── */

    @GetMapping("/programs")
    public List<CurriculumService.ProgramSummary> programs() {
        return curriculumService.listPrograms();
    }

    @PostMapping("/programs")
    public CurriculumService.ProgramSummary createProgram(@Valid @RequestBody CurriculumService.CreateProgramRequest req) {
        return curriculumService.createProgram(currentUser.get(), req);
    }

    @GetMapping("/offerings")
    public List<CurriculumService.OfferingView> offerings() {
        return curriculumService.listAll();
    }

    @PostMapping("/offerings")
    public CurriculumService.OfferingView createOffering(@Valid @RequestBody CurriculumService.CreateOfferingRequest req) {
        return curriculumService.createOffering(currentUser.get(), req);
    }

    @PatchMapping("/offerings/{id}/faculty")
    public CurriculumService.OfferingView assignFaculty(@PathVariable Long id,
                                                       @RequestBody(required = false) CurriculumService.AssignFacultyRequest req) {
        return curriculumService.assignFaculty(currentUser.get(), id, req);
    }

    @GetMapping("/audit")
    public List<AuditEntry> audit() {
        return adminService.recentAudit();
    }

    @GetMapping("/leave-applications")
    public List<LeaveApplicationView> leaveApplications() {
        return leaveApplicationService.listAllForAdmin();
    }

    /* ─────────────── Campus services queue ─────────────── */

    @GetMapping("/cms-requests")
    public List<CmsRequestView> openRequests() {
        return cmsService.listOpen();
    }

    @PatchMapping("/cms-requests/{id}")
    public CmsRequestView updateRequest(@PathVariable Long id,
                                        @RequestParam String status,
                                        @RequestParam(required = false) String note) {
        return cmsService.updateStatus(id, status, note);
    }

    @PostMapping("/assistant/chat")
    public Map<String, Object> chat(@Valid @RequestBody ChatRequest req) {
        return intelligence.chat(null, "ADMIN", req.message());
    }
}
