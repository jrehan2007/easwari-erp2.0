package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service @RequiredArgsConstructor
public class AdminService {

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault());

    /** Above this, a student is comfortably clear and needn't be scored for the dashboard count. */
    private static final int SHORTLIST_ATTENDANCE = 80;

    private final UserRepo userRepo;
    private final StudentRepo studentRepo;
    private final FacultyRepo facultyRepo;
    private final DepartmentRepo departmentRepo;
    private final ProgramRepo programRepo;
    private final ClassSectionRepo sectionRepo;
    private final CmsRequestRepo cmsRepo;
    private final AttendanceRepo attendanceRepo;
    private final AuditLogRepo auditRepo;
    private final MarkRepo markRepo;
    private final LeaveApplicationRepo leaveRepo;
    private final PlacementApplicationRepo placementRepo;
    private final SkillScoreRepo skillScoreRepo;
    private final SubjectOfferingRepo offeringRepo;
    private final SubjectRepo subjectRepo;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final IntelligenceService intelligence;

    /* ─────────────── Provisioning ─────────────── */

    @Transactional
    public UserSummary createUser(User actor, CreateUserRequest req) {
        String username = req.username().trim();
        if (username.isEmpty() || req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and full name are required.");
        }
        if (userRepo.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already in use");
        }
        Role role = parseRole(req.role());
        String initial = (req.initialPassword() == null || req.initialPassword().isBlank())
                ? defaultPasswordFor(role) : req.initialPassword();

        // Resolve and validate every linked record before anything is written,
        // so a bad request never leaves a half-created account behind.
        Program program = null;
        ClassSection section = null;
        Department dept = null;
        String staffCode = null;
        if (role == Role.STUDENT) {
            // A student with no class section is invisible to every faculty roster.
            // Better to refuse than to create a record nobody can find.
            if (req.programCode() == null || req.programCode().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Choose a programme. Without one the student won't appear in any class list.");
            }
            program = programRepo.findByCode(req.programCode())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "No programme with code " + req.programCode() + "."));

            if (req.year() == null || req.section() == null || req.section().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Choose a year and section, so the student joins a real class.");
            }
            final Long programId = program.getId();
            section = sectionRepo.findByProgramId(programId).stream()
                    .filter(cs -> cs.getYear() == req.year()
                            && cs.getSection() != null && cs.getSection().equalsIgnoreCase(req.section().trim()))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "No " + req.programCode() + " year " + req.year()
                            + " section " + req.section() + " exists."));
        } else if (role == Role.FACULTY) {
            if (req.departmentCode() == null || req.departmentCode().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Choose a department for the faculty member.");
            }
            dept = departmentRepo.findByCode(req.departmentCode().trim().toUpperCase(Locale.ROOT))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "No department with code " + req.departmentCode() + "."));
            staffCode = (req.staffCode() == null || req.staffCode().isBlank()) ? username : req.staffCode().trim();
            if (facultyRepo.existsByStaffCodeIgnoreCase(staffCode)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Staff code " + staffCode + " is already assigned to someone else.");
            }
        }

        User user = userRepo.save(User.builder()
                .username(username)
                .passwordHash(encoder.encode(initial))
                .role(role)
                .active(true)
                .mustChangePassword(true)         // forced reset on first sign-in
                .createdByUserId(actor.getId())
                .build());

        String deptLabel = "";
        if (role == Role.STUDENT) {
            studentRepo.save(Student.builder()
                    .user(user).rollNo(username).name(req.name()).email(req.email()).phone(req.phone())
                    .program(program).classSection(section)
                    .currentYear(req.year())
                    .currentSemester(section.getSemester())
                    .batchStartYear(java.time.Year.now().getValue() - (req.year() - 1))
                    .build());
            deptLabel = program.getDepartment() != null ? program.getDepartment().getCode() : "";
        } else if (role == Role.FACULTY) {
            facultyRepo.save(Faculty.builder()
                    .user(user)
                    .staffCode(staffCode)
                    .name(req.name()).email(req.email())
                    .designation(req.designation()).department(dept)
                    .build());
            deptLabel = dept.getCode();
        }

        audit.record(actor, "USER_CREATED", "User", user.getId(),
                role + " account " + username + " created for " + req.name());
        return new UserSummary(user.getId(), user.getUsername(), role.name(), req.name(),
                true, deptLabel, FMT.format(user.getCreatedAt()), initial);
    }

    @Transactional
    public void setActive(User actor, Long userId, boolean active) {
        User target = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (target.getId().equals(actor.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot deactivate your own account");
        }
        if (!active && target.getRole() == Role.ADMIN && target.isActive()
                && userRepo.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This is the last active administrator. Create another admin first.");
        }
        target.setActive(active);
        userRepo.save(target);
        audit.record(actor, active ? "ACCESS_GRANTED" : "ACCESS_REVOKED", "User", userId,
                (active ? "Reactivated " : "Deactivated ") + target.getUsername());
    }

    @Transactional
    public String resetPassword(User actor, Long userId) {
        User target = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String temp = defaultPasswordFor(target.getRole());
        target.setPasswordHash(encoder.encode(temp));
        target.setMustChangePassword(true);
        userRepo.save(target);
        audit.record(actor, "PASSWORD_RESET", "User", userId, "Reset by administrator");
        return temp;
    }

    @Transactional(readOnly = true)
    public List<UserSummary> listUsers(String roleFilter) {
        List<User> users = (roleFilter == null || roleFilter.isBlank() || "ALL".equalsIgnoreCase(roleFilter))
                ? userRepo.findAll()
                : userRepo.findByRole(Role.valueOf(roleFilter.toUpperCase()));

        return users.stream().map(u -> {
            String name = u.getUsername();
            String dept = "";
            if (u.getRole() == Role.STUDENT) {
                var s = studentRepo.findByUserId(u.getId()).orElse(null);
                if (s != null) {
                    name = s.getName();
                    dept = s.getProgram() != null && s.getProgram().getDepartment() != null
                            ? s.getProgram().getDepartment().getCode() : "";
                }
            } else if (u.getRole() == Role.FACULTY) {
                var f = facultyRepo.findByUserId(u.getId()).orElse(null);
                if (f != null) {
                    name = f.getName();
                    dept = f.getDepartment() != null ? f.getDepartment().getCode() : "";
                }
            } else {
                name = "Administrator";
            }
            return new UserSummary(u.getId(), u.getUsername(), u.getRole().name(), name,
                    u.isActive(), dept, FMT.format(u.getCreatedAt()), null);
        }).toList();
    }

    /**
     * Programmes and sections that actually exist, so the provisioning form
     * offers choices rather than inviting a typo.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> reference() {
        List<Map<String, Object>> programs = programRepo.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("code", p.getCode());
            m.put("name", p.getName());
            m.put("department", p.getDepartment() == null ? "" : p.getDepartment().getCode());
            m.put("sections", sectionRepo.findByProgramId(p.getId()).stream().map(cs -> {
                Map<String, Object> c = new LinkedHashMap<>();
                c.put("id", cs.getId());
                c.put("year", cs.getYear());
                c.put("semester", cs.getSemester());
                c.put("section", cs.getSection());
                c.put("label", "Year " + cs.getYear() + " · Section " + cs.getSection());
                return c;
            }).toList());
            return m;
        }).toList();

        List<Map<String, Object>> departments = departmentRepo.findAll().stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("code", d.getCode());
            m.put("name", d.getName());
            m.put("hodName", d.getHodName());
            return m;
        }).toList();

        List<Map<String, Object>> faculty = facultyRepo.findAll().stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("name", f.getName());
            m.put("staffCode", f.getStaffCode());
            m.put("department", f.getDepartment() == null ? "" : f.getDepartment().getCode());
            return m;
        }).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("programs", programs);
        out.put("departments", departments);
        out.put("faculty", faculty);
        return out;
    }

    @Transactional
    public DepartmentSummary createDepartment(User actor, CreateDepartmentRequest req) {
        String code = req.code() == null ? "" : req.code().trim().toUpperCase(Locale.ROOT);
        String name = req.name() == null ? "" : req.name().trim();
        String hodName = req.hodName() == null ? "" : req.hodName().trim();

        if (code.isBlank() || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department code and name are required.");
        }
        if (departmentRepo.findByCode(code).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with code " + code + " already exists.");
        }

        Department dept = departmentRepo.save(Department.builder()
                .code(code)
                .name(name)
                .hodName(hodName.isBlank() ? null : hodName)
                .build());

        audit.record(actor, "DEPARTMENT_CREATED", "Department", dept.getId(),
                "Created department " + dept.getCode() + " — " + dept.getName());
        return new DepartmentSummary(dept.getId(), dept.getCode(), dept.getName(), dept.getHodName());
    }

    @Transactional
    public ClassSectionSummary createClassSection(User actor, CreateClassSectionRequest req) {
        Program program = programRepo.findById(req.programId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No programme exists with id " + req.programId() + "."));

        String section = req.section() == null ? "" : req.section().trim().toUpperCase(Locale.ROOT);
        if (section.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section letter is required.");
        }
        if (req.year() < 1 || req.year() > program.getDurationYears()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    program.getCode() + " runs for " + program.getDurationYears() + " years. Choose a year from 1 to "
                    + program.getDurationYears() + ".");
        }
        int perYear = program.getSemestersPerYear();
        int firstSem = (req.year() - 1) * perYear + 1;
        int lastSem = req.year() * perYear;
        if (req.semester() < firstSem || req.semester() > lastSem) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Year " + req.year() + " covers semester " + firstSem + " to " + lastSem + ".");
        }
        boolean duplicate = sectionRepo.findByProgramId(program.getId()).stream()
                .anyMatch(cs -> cs.getYear() == req.year() && section.equalsIgnoreCase(cs.getSection()));
        if (duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    program.getCode() + " Year " + req.year() + " Section " + section + " already exists.");
        }

        ClassSection entity = sectionRepo.save(ClassSection.builder()
                .program(program)
                .year(req.year())
                .semester(req.semester())
                .section(section)
                .academicYear(req.academicYear() == null || req.academicYear().isBlank()
                        ? String.valueOf(java.time.Year.now().getValue()) + "-" + (java.time.Year.now().getValue() + 1)
                        : req.academicYear().trim())
                .build());

        audit.record(actor, "CLASS_SECTION_CREATED", "ClassSection", entity.getId(),
                "Created " + program.getCode() + " Year " + entity.getYear() + " Section " + entity.getSection());
        return toClassSectionSummary(entity);
    }

    @Transactional
    public ClassSectionSummary assignCoordinator(User actor, Long sectionId, AssignCoordinatorRequest req) {
        ClassSection section = sectionRepo.findById(sectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class section not found."));

        Faculty coordinator = null;
        if (req != null && req.facultyId() != null) {
            coordinator = facultyRepo.findById(req.facultyId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Faculty id " + req.facultyId() + " does not exist."));

            if (section.getProgram() == null || section.getProgram().getDepartment() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "The section is not linked to a valid department programme.");
            }
            if (coordinator.getDepartment() == null || !Objects.equals(
                    coordinator.getDepartment().getId(), section.getProgram().getDepartment().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "The coordinator must be a faculty member from the same department as the programme.");
            }
        }

        section.setCoordinator(coordinator);
        sectionRepo.save(section);

        audit.record(actor, "CLASS_COORDINATOR_UPDATED", "ClassSection", section.getId(),
                coordinator == null ? "Removed coordinator from " + section.getDisplayName() :
                        "Assigned " + coordinator.getName() + " as coordinator for " + section.getDisplayName());
        return toClassSectionSummary(section);
    }

    @Transactional(readOnly = true)
    public List<DepartmentSummary> listDepartments() {
        return departmentRepo.findAll().stream()
                .sorted(Comparator.comparing(Department::getCode))
                .map(d -> new DepartmentSummary(d.getId(), d.getCode(), d.getName(), d.getHodName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClassSectionSummary> listClassSections() {
        return sectionRepo.findAll().stream()
                .sorted(Comparator.comparing((ClassSection cs) -> cs.getProgram() == null ? "" : cs.getProgram().getCode())
                        .thenComparingInt(ClassSection::getYear)
                        .thenComparing(ClassSection::getSection))
                .map(this::toClassSectionSummary)
                .toList();
    }

    private ClassSectionSummary toClassSectionSummary(ClassSection section) {
        Program program = section.getProgram();
        Department department = program != null ? program.getDepartment() : null;
        Faculty coordinator = section.getCoordinator();
        return new ClassSectionSummary(
                section.getId(),
                program != null ? program.getId() : null,
                program != null ? program.getCode() : null,
                program != null ? program.getName() : null,
                department != null ? department.getCode() : null,
                section.getYear(),
                section.getSemester(),
                section.getSection(),
                section.getAcademicYear(),
                coordinator != null ? coordinator.getId() : null,
                coordinator != null ? coordinator.getName() : null,
                coordinator != null ? coordinator.getStaffCode() : null);
    }

    /* ─────────────── Removal ─────────────── */

    /**
     * Permanently removes an account. A student's own records (attendance, marks,
     * requests, applications) go with them; a faculty member's references from
     * other people's records are cleared rather than deleted.
     */
    @Transactional
    public void deleteUser(User actor, Long userId) {
        User target = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (target.getId().equals(actor.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }
        if (target.getRole() == Role.ADMIN && target.isActive()
                && userRepo.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This is the last active administrator. Create another admin first.");
        }

        String label = target.getUsername();
        if (target.getRole() == Role.STUDENT) {
            studentRepo.findByUserId(userId).ifPresent(s -> {
                Long sid = s.getId();
                attendanceRepo.deleteByStudentId(sid);
                markRepo.deleteByStudentId(sid);
                cmsRepo.deleteByStudentId(sid);
                leaveRepo.deleteByStudentId(sid);
                placementRepo.deleteByStudentId(sid);
                skillScoreRepo.deleteByStudentId(sid);
                studentRepo.delete(s);
            });
        } else if (target.getRole() == Role.FACULTY) {
            facultyRepo.findByUserId(userId).ifPresent(f -> {
                Long fid = f.getId();
                sectionRepo.clearCoordinator(fid);
                studentRepo.clearMentor(fid);
                offeringRepo.clearFaculty(fid);
                attendanceRepo.clearMarkedBy(fid);
                leaveRepo.clearReviewedBy(fid);
                facultyRepo.delete(f);
            });
        }
        userRepo.delete(target);

        audit.record(actor, "USER_DELETED", "User", userId,
                target.getRole() + " account " + label + " deleted");
    }

    @Transactional
    public void deleteDepartment(User actor, Long departmentId) {
        Department dept = departmentRepo.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));
        if (programRepo.existsByDepartmentId(departmentId) || facultyRepo.existsByDepartmentId(departmentId)
                || subjectRepo.existsByDepartmentId(departmentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    dept.getCode() + " still has programmes, faculty or subjects. Move or remove them first.");
        }
        departmentRepo.delete(dept);
        audit.record(actor, "DEPARTMENT_DELETED", "Department", departmentId,
                "Deleted department " + dept.getCode() + " — " + dept.getName());
    }

    @Transactional
    public void deleteClassSection(User actor, Long sectionId) {
        ClassSection section = sectionRepo.findById(sectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class section not found."));
        long students = studentRepo.countByClassSectionId(sectionId);
        if (students > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    section.getDisplayName() + " still has " + students + " student(s). Move or remove them first.");
        }
        if (offeringRepo.existsByClassSectionId(sectionId) || leaveRepo.existsByClassSectionId(sectionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    section.getDisplayName() + " has subjects or leave history attached and can't be deleted.");
        }
        String name = section.getDisplayName();
        sectionRepo.delete(section);
        audit.record(actor, "CLASS_SECTION_DELETED", "ClassSection", sectionId, "Deleted " + name);
    }

    @Transactional(readOnly = true)
    public List<AuditEntry> recentAudit() {
        return auditRepo.findTop200ByOrderByOccurredAtDesc().stream()
                .map(a -> new AuditEntry(a.getActorUsername(), a.getAction(), a.getTargetType(),
                        a.getTargetId(), a.getDetail(), FMT.format(a.getOccurredAt())))
                .toList();
    }

    /* ─────────────── Institution dashboard ─────────────── */

    @Transactional(readOnly = true)
    public AdminDashboard dashboard() {
        List<Map<String, Object>> deptStats = new ArrayList<>();
        long totalConducted = 0, totalAttended = 0;

        for (Object[] row : attendanceRepo.departmentRollup()) {
            String code = (String) row[0];
            long conducted = ((Number) row[1]).longValue();
            long attended = ((Number) row[2]).longValue();
            totalConducted += conducted;
            totalAttended += attended;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("department", code);
            m.put("attendance", conducted == 0 ? 0 : Math.round(attended * 100.0 / conducted));
            m.put("periods", conducted);
            deptStats.add(m);
        }

        // Scoring every student would mean one HTTP call each. Instead we shortlist
        // on a cheap aggregate — students whose attendance is already thin — and
        // run the model only on those. Same answer, a fraction of the work.
        Map<String, Integer> riskByDept = new LinkedHashMap<>();
        Map<String, List<Long>> shortlist = new LinkedHashMap<>();

        for (Object[] row : attendanceRepo.studentTotalsByDepartment()) {
            String dept = (String) row[0];
            Long studentId = ((Number) row[1]).longValue();
            long conducted = ((Number) row[2]).longValue();
            long attended = ((Number) row[3]).longValue();
            int pct = conducted == 0 ? 0 : (int) Math.round(attended * 100.0 / conducted);

            riskByDept.putIfAbsent(dept, 0);
            if (pct < SHORTLIST_ATTENDANCE) {
                shortlist.computeIfAbsent(dept, k -> new ArrayList<>()).add(studentId);
            }
        }

        for (Map.Entry<String, List<Long>> e : shortlist.entrySet()) {
            int high = 0;
            for (Long studentId : e.getValue()) {
                Map<String, Object> r = intelligence.riskFor(studentId);
                if ("HIGH".equals(r.get("band"))) high++;
            }
            riskByDept.put(e.getKey(), high);
        }

        List<Map<String, Object>> riskDist = riskByDept.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("department", e.getKey());
                    m.put("highRisk", e.getValue());
                    return m;
                }).toList();

        return new AdminDashboard(
                userRepo.countByRole(Role.STUDENT),
                userRepo.countByRole(Role.FACULTY),
                departmentRepo.count(),
                cmsRepo.countByStatus(RequestStatus.OPEN),
                totalConducted == 0 ? 0 : (int) Math.round(totalAttended * 100.0 / totalConducted),
                deptStats, riskDist);
    }

    private Role parseRole(String raw) {
        try {
            return Role.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be STUDENT, FACULTY or ADMIN.");
        }
    }

    private String defaultPasswordFor(Role role) {
        return switch (role) {
            case ADMIN -> "Admin@123";
            case FACULTY -> "Faculty@123";
            case STUDENT -> "Student@123";
        };
    }
}
