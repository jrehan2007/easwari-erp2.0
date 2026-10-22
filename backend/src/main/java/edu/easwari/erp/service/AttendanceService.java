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
import java.util.*;
import java.util.stream.Collectors;

/**
 * Attendance is stored once, at period level, and read three ways:
 * per subject, per day, and as the raw register grid.
 */
@Service @RequiredArgsConstructor
public class AttendanceService {

    public static final int ELIGIBILITY_THRESHOLD = 75;

    private final AttendanceRepo attendanceRepo;
    private final StudentRepo studentRepo;
    private final SubjectOfferingRepo offeringRepo;
    private final TimetableSlotRepo slotRepo;
    private final FacultyRepo facultyRepo;
    private final ClassSectionRepo sectionRepo;

    /* ─────────────── FACULTY: entry path one — a single period ─────────────── */

    @Transactional
    public int markPeriod(User actor, MarkPeriodRequest req) {
        SubjectOffering offering = offeringRepo.findById(req.subjectOfferingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        Faculty faculty = resolveFaculty(actor, offering);

        int written = 0;
        for (StudentStatus entry : req.entries()) {
            Student student = studentRepo.findById(entry.studentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Student " + entry.studentId() + " not found"));
            assertInClass(student, offering);

            // Re-marking the same slot updates rather than duplicates.
            AttendanceRecord record = attendanceRepo
                    .findByStudentIdAndSubjectOfferingIdAndClassDateAndPeriod(
                            student.getId(), offering.getId(), req.date(), req.period())
                    .orElseGet(() -> AttendanceRecord.builder()
                            .student(student).subjectOffering(offering)
                            .classDate(req.date()).period(req.period()).build());

            record.setStatus(entry.status());
            record.setRemarks(entry.remarks());
            record.setMarkedBy(faculty);
            record.setMarkedAt(java.time.Instant.now());
            attendanceRepo.save(record);
            written++;
        }
        return written;
    }

    /* ─────────────── FACULTY: entry path two — a whole day at once ─────────────── */

    @Transactional
    public int markDay(User actor, MarkDayRequest req) {
        int total = 0;
        for (PeriodBlock block : req.periods()) {
            total += markPeriod(actor, new MarkPeriodRequest(
                    block.subjectOfferingId(), req.date(), block.period(), block.entries()));
        }
        return total;
    }

    /** Pre-filled roster so faculty tap rather than type. Defaults everyone present. */
    @Transactional(readOnly = true)
    public List<PeriodRoster> rosterForDay(User actor, Long classSectionId, LocalDate date) {
        assertSectionAccess(actor, classSectionId);
        int dow = date.getDayOfWeek().getValue();
        List<TimetableSlot> slots = slotRepo
                .findBySubjectOfferingClassSectionIdAndDayOfWeekOrderByPeriodAsc(classSectionId, dow);
        List<Student> students = studentRepo.findByClassSectionIdOrderByRollNoAsc(classSectionId);

        List<PeriodRoster> result = new ArrayList<>();
        for (TimetableSlot slot : slots) {
            SubjectOffering off = slot.getSubjectOffering();
            List<AttendanceRecord> existing = attendanceRepo
                    .findBySubjectOfferingIdAndClassDateAndPeriod(off.getId(), date, slot.getPeriod());
            Map<Long, AttendanceStatus> marked = existing.stream()
                    .collect(Collectors.toMap(r -> r.getStudent().getId(), AttendanceRecord::getStatus));

            List<RosterEntry> roster = students.stream()
                    .map(s -> new RosterEntry(s.getId(), s.getRollNo(), s.getName(),
                            marked.getOrDefault(s.getId(), AttendanceStatus.PRESENT).name()))
                    .toList();

            result.add(new PeriodRoster(off.getId(), off.getSubject().getCode(), off.getSubject().getName(),
                    slot.getPeriod(), slot.getStartTime(), slot.getRoom(), !existing.isEmpty(), roster));
        }
        return result;
    }

    /* ─────────────── STUDENT: the three read shapes ─────────────── */

    @Transactional(readOnly = true)
    public AttendanceView viewFor(Long studentId, String subjectCode) {
        Long offeringId = null;
        if (subjectCode != null && !subjectCode.isBlank() && !"all".equalsIgnoreCase(subjectCode)) {
            offeringId = attendanceRepo.findByStudentIdOrderByClassDateAscPeriodAsc(studentId).stream()
                    .filter(r -> r.getSubjectOffering().getSubject().getCode().equalsIgnoreCase(subjectCode))
                    .map(r -> r.getSubjectOffering().getId()).findFirst().orElse(null);
        }

        List<AttendanceRecord> all = attendanceRepo.findByStudentIdOrderByClassDateAscPeriodAsc(studentId);
        final Long scopeOffering = offeringId;
        List<AttendanceRecord> scoped = scopeOffering == null ? all
                : all.stream().filter(r -> r.getSubjectOffering().getId().equals(scopeOffering)).toList();

        long conducted = scoped.size();
        long attended = scoped.stream().filter(r -> r.getStatus().countsAsAttended()).count();
        int overall = conducted == 0 ? 0 : (int) Math.round(attended * 100.0 / conducted);

        Map<String, Long> statusCounts = new LinkedHashMap<>();
        for (AttendanceStatus st : AttendanceStatus.values()) {
            statusCounts.put(st.name(), scoped.stream().filter(r -> r.getStatus() == st).count());
        }

        // Per-subject, always across all subjects so the sidebar list stays complete.
        List<SubjectAttendance> subjects = attendanceRepo.subjectRollup(studentId).stream()
                .map(row -> {
                    String code = (String) row[0];
                    String name = (String) row[1];
                    int credits = ((Number) row[2]).intValue();
                    long conductedS = ((Number) row[3]).longValue();
                    long attendedS = ((Number) row[4]).longValue();
                    int pct = conductedS == 0 ? 0 : (int) Math.round(attendedS * 100.0 / conductedS);
                    long slack = Math.max(0, (long) Math.floor(
                            (attendedS - (ELIGIBILITY_THRESHOLD / 100.0) * conductedS) / (ELIGIBILITY_THRESHOLD / 100.0)));
                    return new SubjectAttendance(code, name, credits, conductedS, attendedS, pct,
                            pct >= ELIGIBILITY_THRESHOLD, slack);
                }).toList();

        List<AttendanceCell> cells = scoped.stream()
                .map(r -> new AttendanceCell(r.getClassDate().toString(), r.getPeriod(),
                        r.getSubjectOffering().getSubject().getCode(),
                        r.getSubjectOffering().getSubject().getName(),
                        r.getStatus().name(), null))
                .toList();

        Map<LocalDate, long[]> byDate = new TreeMap<>();
        for (AttendanceRecord r : scoped) {
            long[] agg = byDate.computeIfAbsent(r.getClassDate(), d -> new long[2]);
            agg[0]++;
            if (r.getStatus().countsAsAttended()) agg[1]++;
        }
        List<DayAttendance> days = byDate.entrySet().stream()
                .map(e -> new DayAttendance(e.getKey().toString(), e.getValue()[0], e.getValue()[1],
                        e.getValue()[0] == 0 ? 0 : (int) Math.round(e.getValue()[1] * 100.0 / e.getValue()[0])))
                .toList();

        return new AttendanceView(overall, conducted, attended, statusCounts, subjects, cells, days);
    }

    /** Percentage used by risk scoring and eligibility checks. */
    @Transactional(readOnly = true)
    public int overallPercentage(Long studentId) {
        List<AttendanceRecord> all = attendanceRepo.findByStudentIdOrderByClassDateAscPeriodAsc(studentId);
        if (all.isEmpty()) return 0;
        long attended = all.stream().filter(r -> r.getStatus().countsAsAttended()).count();
        return (int) Math.round(attended * 100.0 / all.size());
    }

    /** Attendance can only be written for students who belong to the offering's class. */
    static void assertInClass(Student student, SubjectOffering offering) {
        ClassSection cs = offering.getClassSection();
        if (student.getClassSection() == null || cs == null
                || !student.getClassSection().getId().equals(cs.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    student.getRollNo() + " is not in " + (cs == null ? "this class" : cs.getDisplayName()));
        }
    }

    /** The day's roster is for the class coordinator and the teachers of that class. */
    private void assertSectionAccess(User actor, Long classSectionId) {
        if (actor.getRole() == Role.ADMIN) return;
        Faculty faculty = facultyRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No staff profile on this account"));
        ClassSection cs = sectionRepo.findById(classSectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        boolean coordinates = cs.getCoordinator() != null && cs.getCoordinator().getId().equals(faculty.getId());
        boolean teaches = offeringRepo.findByClassSectionId(classSectionId).stream()
                .anyMatch(o -> o.getFaculty() != null && o.getFaculty().getId().equals(faculty.getId()));
        if (!coordinates && !teaches) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this class");
        }
    }

    private Faculty resolveFaculty(User actor, SubjectOffering offering) {
        if (actor.getRole() == Role.ADMIN) {
            return offering.getFaculty();
        }
        Faculty faculty = facultyRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No staff profile on this account"));
        // Ownership check: staff may mark classes they teach, and the class coordinator
        // may mark every period of the class they coordinate.
        boolean teaches = offering.getFaculty() != null && offering.getFaculty().getId().equals(faculty.getId());
        ClassSection cs = offering.getClassSection();
        boolean coordinates = cs != null && cs.getCoordinator() != null
                && cs.getCoordinator().getId().equals(faculty.getId());
        if (!teaches && !coordinates) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this class");
        }
        return faculty;
    }
}
