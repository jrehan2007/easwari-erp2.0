package edu.easwari.erp.web;

import edu.easwari.erp.config.CurrentUser;
import edu.easwari.erp.domain.*;
import edu.easwari.erp.excel.ExcelService;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.*;
import edu.easwari.erp.service.Dtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

/**
 * Every endpoint resolves the student from the token, never from a path
 * parameter — a student cannot read another student's record by changing a URL.
 */
@RestController @RequestMapping("/api/student")
@PreAuthorize("hasAnyRole('STUDENT','ADMIN')") @RequiredArgsConstructor
public class StudentController {

    private final CurrentUser currentUser;
    private final StudentRepo studentRepo;
    private final AttendanceService attendanceService;
    private final MarksService marksService;
    private final CmsService cmsService;
    private final PlacementService placementService;
    private final IntelligenceService intelligence;
    private final ExcelService excelService;
    private final LeaveApplicationService leaveApplicationService;

    private Student me() {
        User user = currentUser.get();
        return studentRepo.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "This account has no student profile"));
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public StudentProfile profile() {
        Student s = me();
        Program p = s.getProgram();
        String programCode = p != null ? p.getCode() : "";
        String programName = p != null ? p.getName() : "";
        int durationYears = p != null ? p.getDurationYears() : 4;
        String department = p != null && p.getDepartment() != null ? p.getDepartment().getName() : "";
        ClassSection sectionEntity = s.getClassSection();
        String section = sectionEntity != null ? sectionEntity.getSection() : "";
        String mentor = s.getMentor() != null ? s.getMentor().getName() : "";
        String classCoordinator = sectionEntity != null && sectionEntity.getCoordinator() != null
                ? sectionEntity.getCoordinator().getName() : "";
        int creditsRequired = p != null ? p.getTotalCreditsRequired() : 168;
        String batch = s.getBatchStartYear() + " – " + (s.getBatchStartYear() + durationYears);

        return new StudentProfile(s.getId(), s.getRollNo(), s.getRegNo(), s.getName(), s.getEmail(), s.getPhone(),
                programCode, programName, durationYears, department, section,
                s.getCurrentYear(), s.getCurrentSemester(), batch, mentor, classCoordinator,
                s.getHostelBlock(), s.getCgpa(), s.getCreditsEarned(), creditsRequired);
    }

    /** subject=all or a subject code such as CS8492. */
    @GetMapping("/attendance")
    public AttendanceView attendance(@RequestParam(required = false, defaultValue = "all") String subject) {
        return attendanceService.viewFor(me().getId(), subject);
    }

    @GetMapping("/marks")
    public MarksView marks() {
        return marksService.viewFor(me().getId());
    }

    @GetMapping("/cms-requests")
    public List<CmsRequestView> cmsRequests() {
        return cmsService.listFor(me().getId());
    }

    @PostMapping("/cms-requests")
    public CmsRequestView raiseRequest(@Valid @RequestBody CmsRequestCreate req) {
        return cmsService.create(me().getId(), req);
    }

    @GetMapping("/placement/companies")
    public List<CompanyView> companies() {
        return placementService.companiesFor(me().getId());
    }

    @PostMapping("/placement/companies/{companyId}/apply")
    public Map<String, String> apply(@PathVariable Long companyId) {
        placementService.apply(me().getId(), companyId);
        return Map.of("message", "Application submitted");
    }

    @GetMapping("/placement/readiness")
    public Map<String, Object> readiness() {
        return intelligence.readinessFor(me().getId());
    }

    @GetMapping("/internships")
    public List<InternshipView> internships() {
        return placementService.internshipsFor(me().getId());
    }

    @GetMapping("/leave-applications")
    public List<LeaveApplicationView> leaveApplications() {
        return leaveApplicationService.listForStudent(currentUser.get());
    }

    @PostMapping(value = "/leave-applications", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LeaveApplicationView submitLeaveApplication(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
                                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
                                                     @RequestParam LeaveApplicationType type,
                                                     @RequestParam String reason,
                                                     @RequestPart(name = "proof", required = false) MultipartFile proof) {
        return leaveApplicationService.submit(currentUser.get(), fromDate, toDate, type, reason, proof);
    }

    @GetMapping("/leave-proofs/{fileName:.+}")
    public ResponseEntity<Resource> proof(@PathVariable String fileName) throws IOException {
        LeaveApplication app = leaveApplicationService.findByProofFileName(fileName);
        if (!leaveApplicationService.canAccessProof(currentUser.get(), app)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this proof");
        }
        Resource resource = new org.springframework.core.io.FileSystemResource(leaveApplicationService.resolveProofPath(fileName));
        if (!resource.exists()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Proof not found");
        }
        String contentType = java.nio.file.Files.probeContentType(resource.getFile().toPath());
        if (contentType == null) {
            contentType = "application/octet-stream";
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename*=UTF-8''" + URLEncoder.encode(app.getProofFileName(), StandardCharsets.UTF_8))
                .body(resource);
    }

    @GetMapping("/learning-path")
    public Map<String, Object> learningPath() {
        return intelligence.recommendationsFor(me().getId());
    }

    @GetMapping("/risk")
    public Map<String, Object> risk() {
        return intelligence.riskFor(me().getId());
    }

    /** Roadmap length comes from the programme record, not a constant. */
    @GetMapping("/roadmap")
    @Transactional(readOnly = true)
    public Map<String, Object> roadmap() {
        Student s = me();
        int duration = s.getProgram() == null ? 4 : s.getProgram().getDurationYears();
        List<Map<String, Object>> years = new ArrayList<>();
        for (int y = 1; y <= duration; y++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("year", y);
            m.put("status", y < s.getCurrentYear() ? "COMPLETED"
                    : y == s.getCurrentYear() ? "IN_PROGRESS" : "UPCOMING");
            years.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("durationYears", duration);
        out.put("currentYear", s.getCurrentYear());
        out.put("years", years);
        return out;
    }

    @PostMapping("/assistant/chat")
    public Map<String, Object> chat(@Valid @RequestBody ChatRequest req) {
        return intelligence.chat(me().getId(), "STUDENT", req.message());
    }

    @GetMapping("/export/attendance.xlsx")
    public ResponseEntity<byte[]> exportAttendance() {
        Student s = me();
        return xlsx(excelService.attendanceWorkbook(s.getId()), "attendance-" + s.getRollNo() + ".xlsx");
    }

    @GetMapping("/export/marks.xlsx")
    public ResponseEntity<byte[]> exportMarks() {
        Student s = me();
        return xlsx(excelService.marksWorkbook(s.getId()), "marks-" + s.getRollNo() + ".xlsx");
    }

    private ResponseEntity<byte[]> xlsx(byte[] body, String filename) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(body);
    }
}
