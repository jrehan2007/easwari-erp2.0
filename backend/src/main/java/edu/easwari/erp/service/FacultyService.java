package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service @RequiredArgsConstructor
public class FacultyService {

    /** Above this, attendance alone isn't a reason to score a student. */
    private static final int SHORTLIST_ATTENDANCE = 82;

    private final FacultyRepo facultyRepo;
    private final ClassSectionRepo classSectionRepo;
    private final SubjectOfferingRepo offeringRepo;
    private final StudentRepo studentRepo;
    private final UserRepo userRepo;
    private final AttendanceRepo attendanceRepo;
    private final AttendanceService attendanceService;
    private final IntelligenceService intelligence;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public Faculty profileOf(User user) {
        return facultyRepo.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "This account has no staff profile"));
    }

    @Transactional(readOnly = true)
    public List<FacultyClass> classesFor(User user) {
        Faculty faculty = profileOf(user);
        Map<Long, FacultyClass> resultBySection = new LinkedHashMap<>();

        for (SubjectOffering off : offeringRepo.findByFacultyId(faculty.getId())) {
            List<Student> students = studentRepo.findByClassSectionId(off.getClassSection().getId());
            long conducted = 0, attended = 0;
            int atRisk = 0;
            for (Student s : students) {
                List<AttendanceRecord> recs =
                        attendanceRepo.findByStudentIdAndSubjectOfferingId(s.getId(), off.getId());
                long c = recs.size();
                long a = recs.stream().filter(r -> r.getStatus().countsAsAttended()).count();
                conducted += c; attended += a;
                if (c > 0 && (a * 100.0 / c) < AttendanceService.ELIGIBILITY_THRESHOLD) atRisk++;
            }

            resultBySection.put(off.getClassSection().getId(),
                    new FacultyClass(off.getClassSection().getId(), off.getId(),
                            off.getSubject().getCode(), off.getSubject().getName(),
                            off.getClassSection().getDisplayName(), students.size(),
                            conducted == 0 ? 0 : (int) Math.round(attended * 100.0 / conducted), atRisk));
        }

        for (ClassSection section : classSectionRepo.findByCoordinatorId(faculty.getId())) {
            if (resultBySection.containsKey(section.getId())) {
                continue;
            }
            List<Student> students = studentRepo.findByClassSectionIdOrderByRollNoAsc(section.getId());
            long total = 0;
            long attended = 0;
            for (Student student : students) {
                List<AttendanceRecord> recs = attendanceRepo.findByStudentIdOrderByClassDateAscPeriodAsc(student.getId());
                total += recs.size();
                attended += recs.stream().filter(r -> r.getStatus().countsAsAttended()).count();
            }
            int averageAttendance = students.isEmpty() || total == 0 ? 0 :
                    (int) Math.round(attended * 100.0 / total);
            resultBySection.put(section.getId(),
                    new FacultyClass(section.getId(), null, "COORD", "Class coordinator",
                            section.getDisplayName(), students.size(), averageAttendance, 0));
        }

        return new ArrayList<>(resultBySection.values());
    }

    /**
     * Students the model flags, scoped to classes this member of staff teaches.
     * A cheap aggregate shortlists who is worth scoring, so a staff member with
     * two sections triggers a handful of model calls rather than forty.
     */
    @Transactional(readOnly = true)
    public List<AtRiskStudent> needsAttention(User user) {
        Faculty faculty = profileOf(user);
        Set<Long> sectionIds = new HashSet<>();
        sectionIds.addAll(offeringRepo.findByFacultyId(faculty.getId()).stream()
                .map(o -> o.getClassSection().getId()).collect(java.util.stream.Collectors.toSet()));
        sectionIds.addAll(classSectionRepo.findByCoordinatorId(faculty.getId()).stream()
                .map(ClassSection::getId).collect(java.util.stream.Collectors.toSet()));

        List<AtRiskStudent> flagged = new ArrayList<>();
        for (Long sectionId : sectionIds) {

            Set<Long> shortlist = new HashSet<>();
            for (Object[] row : attendanceRepo.studentTotalsForSection(sectionId)) {
                Long studentId = ((Number) row[0]).longValue();
                long conducted = ((Number) row[1]).longValue();
                long attended = ((Number) row[2]).longValue();
                int pct = conducted == 0 ? 0 : (int) Math.round(attended * 100.0 / conducted);
                if (pct < SHORTLIST_ATTENDANCE) shortlist.add(studentId);
            }

            for (Student s : studentRepo.findByClassSectionIdOrderByRollNoAsc(sectionId)) {
                // Weak marks matter even when attendance looks fine.
                boolean worthScoring = shortlist.contains(s.getId()) || s.getCgpa() < 7.0;
                if (!worthScoring) continue;

                Map<String, Object> risk = intelligence.riskFor(s.getId());
                String band = String.valueOf(risk.getOrDefault("band", "UNKNOWN"));
                if (!"HIGH".equals(band) && !"MEDIUM".equals(band)) continue;

                int score = risk.get("risk_score") instanceof Number n ? n.intValue() : 0;
                List<String> reasons = new ArrayList<>();
                Object factors = risk.get("factors");
                if (factors instanceof List<?> list) {
                    for (Object f : list) {
                        if (f instanceof Map<?, ?> fm && fm.get("detail") != null) {
                            reasons.add(String.valueOf(fm.get("detail")));
                        }
                    }
                }
                flagged.add(new AtRiskStudent(s.getId(), s.getRollNo(), s.getName(),
                        s.getClassSection() != null ? s.getClassSection().getDisplayName() : "",
                        score, band, reasons));
            }
        }
        flagged.sort(Comparator.comparingInt(AtRiskStudent::riskScore).reversed());
        return flagged;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> studentsIn(User user, Long classSectionId) {
        Faculty faculty = profileOf(user);
        boolean teaches = offeringRepo.findByFacultyId(faculty.getId()).stream()
                .anyMatch(o -> o.getClassSection().getId().equals(classSectionId));
        boolean coordinates = classSectionRepo.findByCoordinatorId(faculty.getId()).stream()
                .anyMatch(section -> section.getId().equals(classSectionId));
        if (!teaches && !coordinates && user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this class");
        }

        return studentRepo.findByClassSectionIdOrderByRollNoAsc(classSectionId).stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("studentId", s.getId());
            m.put("rollNo", s.getRollNo());
            m.put("name", s.getName());
            m.put("cgpa", s.getCgpa());
            m.put("attendance", attendanceService.overallPercentage(s.getId()));
            return m;
        }).toList();
    }

    @Transactional
    public Student addStudentToSection(User actor, Long classSectionId, AddStudentToSectionRequest req) {
        Faculty faculty = facultyRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No staff profile on this account"));

        ClassSection section = classSectionRepo.findById(classSectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class section not found"));

        if (section.getCoordinator() == null || !Objects.equals(section.getCoordinator().getId(), faculty.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the coordinator for this class");
        }

        if (req == null || req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student name is required");
        }
        if (req.rollNumber() == null || req.rollNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Roll number is required");
        }
        if (req.year() == null || req.batch() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Year and batch are required");
        }

        String rollNo = req.rollNumber().trim();
        if (studentRepo.findByRollNoIgnoreCase(rollNo).isPresent() || userRepo.existsByUsernameIgnoreCase(rollNo)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A student with roll number " + rollNo + " already exists");
        }

        Program program = section.getProgram();
        if (program == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This class section is not linked to a programme");
        }

        User studentUser = userRepo.save(User.builder()
                .username(rollNo)
                .passwordHash(passwordEncoder.encode("Student@123"))
                .role(Role.STUDENT)
                .active(true)
                .mustChangePassword(true)
                .createdByUserId(actor.getId())
                .build());

        Student student = studentRepo.save(Student.builder()
                .user(studentUser)
                .rollNo(rollNo)
                .name(req.name().trim())
                .program(program)
                .classSection(section)
                .currentYear(req.year())
                .currentSemester(section.getSemester())
                .batchStartYear(req.batch())
                .build());

        return student;
    }
}
