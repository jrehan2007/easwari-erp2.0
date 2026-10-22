package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * Everything the administrator needs to describe what a class studies and who
 * teaches it: programmes, subjects offered to a section, the teacher for each,
 * and the weekly timetable slots that drive the attendance register.
 */
@Service @RequiredArgsConstructor
public class CurriculumService {

    private static final String[] DAYS = {"", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};

    private final ProgramRepo programRepo;
    private final DepartmentRepo departmentRepo;
    private final ClassSectionRepo sectionRepo;
    private final SubjectRepo subjectRepo;
    private final SubjectOfferingRepo offeringRepo;
    private final TimetableSlotRepo slotRepo;
    private final FacultyRepo facultyRepo;
    private final AuditService audit;

    public record CreateProgramRequest(@NotBlank String code, @NotBlank String name,
                                       @NotBlank String departmentCode, Integer durationYears,
                                       Integer semestersPerYear, Integer totalCredits) {}
    public record SlotInput(@Min(1) @Max(6) int dayOfWeek, @Min(1) @Max(8) int period, String room) {}
    public record CreateOfferingRequest(@NotNull Long classSectionId, @NotBlank String subjectCode,
                                        @NotBlank String subjectName, @Min(0) @Max(10) int credits,
                                        Long facultyId, boolean laboratory, List<SlotInput> slots) {}
    public record AssignFacultyRequest(Long facultyId) {}
    public record ProgramSummary(Long id, String code, String name, String departmentCode,
                                 int durationYears, int semestersPerYear, int totalCredits) {}
    public record OfferingView(Long id, Long classSectionId, String sectionLabel, String subjectCode,
                               String subjectName, int credits, Long facultyId, String facultyName,
                               List<String> slots, boolean editable, boolean laboratory) {}

    /* ─────────────── Programmes ─────────────── */

    @Transactional
    public ProgramSummary createProgram(User actor, CreateProgramRequest req) {
        String code = req.code().trim().toUpperCase(Locale.ROOT);
        if (programRepo.findByCode(code).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A programme with code " + code + " already exists.");
        }
        Department dept = departmentRepo.findByCode(req.departmentCode().trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No department with code " + req.departmentCode() + ". Create the department first."));
        int years = req.durationYears() == null ? 4 : req.durationYears();
        int perYear = req.semestersPerYear() == null ? 2 : req.semestersPerYear();
        int credits = req.totalCredits() == null ? 168 : req.totalCredits();
        if (years < 1 || years > 6 || perYear < 1 || perYear > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check the duration and semesters per year.");
        }
        Program p = programRepo.save(Program.builder()
                .code(code).name(req.name().trim()).department(dept)
                .durationYears(years).semestersPerYear(perYear).totalCreditsRequired(credits)
                .build());
        audit.record(actor, "PROGRAM_CREATED", "Program", p.getId(), "Created programme " + code + " — " + p.getName());
        return toProgram(p);
    }

    @Transactional(readOnly = true)
    public List<ProgramSummary> listPrograms() {
        return programRepo.findAll().stream()
                .sorted(Comparator.comparing(Program::getCode))
                .map(this::toProgram).toList();
    }

    private ProgramSummary toProgram(Program p) {
        return new ProgramSummary(p.getId(), p.getCode(), p.getName(),
                p.getDepartment() == null ? null : p.getDepartment().getCode(),
                p.getDurationYears(), p.getSemestersPerYear(), p.getTotalCreditsRequired());
    }

    /* ─────────────── Offerings (subject + section + teacher + timetable) ─────────────── */

    @Transactional
    public OfferingView createOffering(User actor, CreateOfferingRequest req) {
        ClassSection section = sectionRepo.findById(req.classSectionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a class first."));
        String code = req.subjectCode().trim().toUpperCase(Locale.ROOT);

        Faculty teacher = null;
        if (req.facultyId() != null) {
            teacher = facultyRepo.findById(req.facultyId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "That faculty member doesn't exist."));
        }

        Subject subject = subjectRepo.findByCode(code).orElseGet(() -> subjectRepo.save(Subject.builder()
                .code(code).name(req.subjectName().trim()).credits(req.credits())
                .semester(section.getSemester())
                .department(section.getProgram() == null ? null : section.getProgram().getDepartment())
                .laboratory(req.laboratory())
                .build()));

        if (offeringRepo.findBySubjectIdAndClassSectionId(subject.getId(), section.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    code + " is already offered to " + section.getDisplayName() + ".");
        }

        // Validate every slot before writing anything.
        List<SlotInput> slots = req.slots() == null ? List.of() : req.slots();
        Set<String> clash = new HashSet<>();
        for (TimetableSlot existing : slotRepo.findBySubjectOfferingClassSectionId(section.getId())) {
            clash.add(existing.getDayOfWeek() + ":" + existing.getPeriod());
        }
        for (SlotInput slot : slots) {
            String key = slot.dayOfWeek() + ":" + slot.period();
            if (!clash.add(key)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        DAYS[slot.dayOfWeek()] + " period " + slot.period() + " is already taken in this class.");
            }
        }

        SubjectOffering offering = offeringRepo.save(SubjectOffering.builder()
                .subject(subject).classSection(section).faculty(teacher)
                .academicYear(section.getAcademicYear()).build());
        for (SlotInput slot : slots) {
            slotRepo.save(TimetableSlot.builder()
                    .subjectOffering(offering).dayOfWeek(slot.dayOfWeek()).period(slot.period())
                    .room(slot.room() == null || slot.room().isBlank() ? null : slot.room().trim())
                    .build());
        }
        audit.record(actor, "OFFERING_CREATED", "SubjectOffering", offering.getId(),
                code + " offered to " + section.getDisplayName()
                        + (teacher != null ? ", taught by " + teacher.getName() : ""));
        return toView(offering, true);
    }

    @Transactional
    public OfferingView assignFaculty(User actor, Long offeringId, AssignFacultyRequest req) {
        SubjectOffering offering = offeringRepo.findById(offeringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found."));
        Faculty teacher = null;
        if (req != null && req.facultyId() != null) {
            teacher = facultyRepo.findById(req.facultyId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "That faculty member doesn't exist."));
        }
        offering.setFaculty(teacher);
        offeringRepo.save(offering);
        audit.record(actor, "OFFERING_TEACHER_SET", "SubjectOffering", offering.getId(),
                offering.getSubject().getCode() + " → " + (teacher == null ? "unassigned" : teacher.getName()));
        return toView(offering, true);
    }

    @Transactional(readOnly = true)
    public List<OfferingView> listAll() {
        return offeringRepo.findAll().stream()
                .sorted(Comparator.comparing((SubjectOffering o) -> o.getClassSection().getDisplayName())
                        .thenComparing(o -> o.getSubject().getCode()))
                .map(o -> toView(o, true)).toList();
    }

    /**
     * Offerings in one class, for a faculty member. A class coordinator sees and
     * can edit every subject of the class; a subject teacher sees all subjects
     * but can edit only their own.
     */
    @Transactional(readOnly = true)
    public List<OfferingView> forSection(User actor, Long sectionId) {
        ClassSection section = sectionRepo.findById(sectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found."));
        Long facultyId = null;
        boolean coordinator = actor.getRole() == Role.ADMIN;
        if (actor.getRole() != Role.ADMIN) {
            Faculty me = facultyRepo.findByUserId(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No staff profile on this account"));
            facultyId = me.getId();
            coordinator = section.getCoordinator() != null && section.getCoordinator().getId().equals(me.getId());
        }
        List<SubjectOffering> offerings = offeringRepo.findByClassSectionId(sectionId);
        final Long myId = facultyId;
        boolean teaches = myId != null && offerings.stream()
                .anyMatch(o -> o.getFaculty() != null && o.getFaculty().getId().equals(myId));
        if (!coordinator && !teaches) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this class");
        }
        final boolean all = coordinator;
        return offerings.stream()
                .sorted(Comparator.comparing((SubjectOffering o) -> o.getSubject().getCode()))
                .map(o -> toView(o, all || (o.getFaculty() != null && o.getFaculty().getId().equals(myId))))
                .toList();
    }

    private OfferingView toView(SubjectOffering o, boolean editable) {
        List<String> slots = slotRepo.findBySubjectOfferingId(o.getId()).stream()
                .sorted(Comparator.comparingInt(TimetableSlot::getDayOfWeek).thenComparingInt(TimetableSlot::getPeriod))
                .map(s -> DAYS[Math.max(0, Math.min(6, s.getDayOfWeek()))] + " P" + s.getPeriod())
                .toList();
        Faculty f = o.getFaculty();
        return new OfferingView(o.getId(), o.getClassSection().getId(), o.getClassSection().getDisplayName(),
                o.getSubject().getCode(), o.getSubject().getName(), o.getSubject().getCredits(),
                f == null ? null : f.getId(), f == null ? null : f.getName(), slots, editable, o.getSubject().isLaboratory());
    }
}
