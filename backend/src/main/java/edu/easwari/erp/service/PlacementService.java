package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor
public class PlacementService {

    private final CompanyRepo companyRepo;
    private final InternshipRepo internshipRepo;
    private final PlacementApplicationRepo applicationRepo;
    private final StudentRepo studentRepo;
    private final AttendanceService attendanceService;
    private final IntelligenceService intelligence;

    @Transactional(readOnly = true)
    public List<CompanyView> companiesFor(Long studentId) {
        Student s = studentRepo.findById(studentId).orElseThrow();
        int attendance = attendanceService.overallPercentage(s.getId());
        String deptCode = s.getProgram() != null && s.getProgram().getDepartment() != null
                ? s.getProgram().getDepartment().getCode() : "";

        Map<String, Object> readiness = intelligence.readinessFor(studentId);
        int overallReadiness = readiness.get("overall") instanceof Number n ? n.intValue() : 0;

        return companyRepo.findAll().stream().map(c -> {
            List<String> blockers = new ArrayList<>();
            if (s.getCgpa() < c.getMinCgpa())
                blockers.add(String.format("CGPA %.2f is below the required %.1f", s.getCgpa(), c.getMinCgpa()));
            if (attendance < c.getMinAttendance())
                blockers.add("Attendance " + attendance + "% is below the required " + c.getMinAttendance() + "%");
            if (c.getEligibleDepartments() != null && !"ALL".equalsIgnoreCase(c.getEligibleDepartments())
                    && !Arrays.asList(c.getEligibleDepartments().split(",")).contains(deptCode))
                blockers.add("Open to " + c.getEligibleDepartments() + " only");

            String criteria = "CGPA ≥ " + c.getMinCgpa() + " · Attendance ≥ " + c.getMinAttendance()
                    + "% · " + (c.getEligibleDepartments() == null ? "ALL" : c.getEligibleDepartments());

            // Match blends academic standing with the readiness model's view.
            int cgpaScore = (int) Math.min(100, (s.getCgpa() / 10.0) * 100);
            int match = (int) Math.round(cgpaScore * 0.4 + attendance * 0.2 + overallReadiness * 0.4);

            return new CompanyView(c.getId(), c.getName(), c.getJobRole(), c.getCtc(), criteria,
                    c.getApplicationDeadline() == null ? null : c.getApplicationDeadline().toString(),
                    blockers.isEmpty(), blockers.isEmpty() ? null : String.join(" · ", blockers),
                    match, applicationRepo.existsByStudentIdAndCompanyId(studentId, c.getId()));
        }).sorted(Comparator.comparingInt(CompanyView::matchPercentage).reversed()).toList();
    }

    @Transactional
    public void apply(Long studentId, Long companyId) {
        CompanyView view = companiesFor(studentId).stream()
                .filter(c -> c.id().equals(companyId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));

        // Eligibility is enforced on the server. Hiding the button is not enough.
        if (!view.eligible()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You don't meet the criteria: " + view.ineligibleReason());
        }
        if (view.applied()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already applied to this company");
        }
        applicationRepo.save(PlacementApplication.builder()
                .student(studentRepo.findById(studentId).orElseThrow())
                .company(companyRepo.findById(companyId).orElseThrow())
                .build());
    }

    @Transactional(readOnly = true)
    public List<InternshipView> internshipsFor(Long studentId) {
        Student s = studentRepo.findById(studentId).orElseThrow();
        String deptCode = s.getProgram() != null && s.getProgram().getDepartment() != null
                ? s.getProgram().getDepartment().getCode() : "";
        LocalDate today = LocalDate.now();

        return internshipRepo.findAll().stream()
                .filter(i -> i.getEligibleDepartments() == null
                        || "ALL".equalsIgnoreCase(i.getEligibleDepartments())
                        || Arrays.asList(i.getEligibleDepartments().split(",")).contains(deptCode))
                .map(i -> new InternshipView(i.getId(), i.getTitle(), i.getOrganisation(), i.getDuration(),
                        i.getStipend(), i.getMode(),
                        i.getApplicationDeadline() == null ? null : i.getApplicationDeadline().toString(),
                        i.getApplicationDeadline() == null ? 0
                                : Math.max(0, ChronoUnit.DAYS.between(today, i.getApplicationDeadline()))))
                .toList();
    }
}
