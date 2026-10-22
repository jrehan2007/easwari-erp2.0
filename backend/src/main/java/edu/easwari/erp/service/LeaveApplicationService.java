package edu.easwari.erp.service;

import edu.easwari.erp.config.CurrentUser;
import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;

@Service @RequiredArgsConstructor
public class LeaveApplicationService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
    );

    private final LeaveApplicationRepo leaveApplicationRepo;
    private final StudentRepo studentRepo;
    private final FacultyRepo facultyRepo;
    private final SubjectOfferingRepo subjectOfferingRepo;
    private final TimetableSlotRepo timetableSlotRepo;
    private final AttendanceRepo attendanceRepo;
    private final CurrentUser currentUser;

    @Transactional
    public LeaveApplicationView submit(User actor, LocalDate fromDate, LocalDate toDate,
                                      LeaveApplicationType type, String reason,
                                      MultipartFile proof) {
        if (fromDate == null || toDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "From and to dates are required");
        }
        if (fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "From date must be on or before to date");
        }
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please include the reason for the request");
        }

        Student student = studentRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has no student profile"));

        String savedFileName = null;
        String savedUrl = null;
        if (proof != null && !proof.isEmpty()) {
            validateProof(proof);
            savedFileName = saveProofFile(student.getId(), proof);
            savedUrl = "/api/leave-proofs/" + savedFileName;
        }

        LeaveApplication application = LeaveApplication.builder()
                .student(student)
                .classSection(student.getClassSection())
                .fromDate(fromDate)
                .toDate(toDate)
                .type(type)
                .reason(reason.trim())
                .proofFileName(savedFileName)
                .proofUrl(savedUrl)
                .status(LeaveApplicationStatus.PENDING)
                .build();

        LeaveApplication saved = leaveApplicationRepo.save(application);
        return toView(saved);
    }

    @Transactional(readOnly = true)
    public List<LeaveApplicationView> listForStudent(User actor) {
        Student student = studentRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has no student profile"));
        return leaveApplicationRepo.findByStudentIdOrderByAppliedAtDesc(student.getId()).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveApplicationView> listPendingForFaculty(User actor) {
        Faculty faculty = facultyRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has no staff profile"));
        Set<Long> sectionIds = subjectOfferingRepo.findByFacultyId(faculty.getId()).stream()
                .map(off -> off.getClassSection().getId())
                .collect(java.util.stream.Collectors.toSet());

        return leaveApplicationRepo.findByStatusOrderByAppliedAtDesc(LeaveApplicationStatus.PENDING).stream()
                .filter(app -> app.getClassSection() != null && sectionIds.contains(app.getClassSection().getId()))
                .map(this::toView)
                .toList();
    }

    @Transactional
    public LeaveApplicationView approve(User actor, Long applicationId) {
        LeaveApplication application = leaveApplicationRepo.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leave application not found"));
        Faculty faculty = resolveFacultyActorForApplication(actor, application);

        if (application.getStatus() != LeaveApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This application is no longer pending");
        }

        application.setStatus(LeaveApplicationStatus.APPROVED);
        application.setReviewedBy(faculty);
        application.setReviewedAt(Instant.now());
        application.setReviewNote(application.getReviewNote() == null ? "Approved by faculty" : application.getReviewNote());

        if (application.getType() == LeaveApplicationType.OD) {
            createOdAttendanceEntries(application, faculty);
        }

        return toView(leaveApplicationRepo.save(application));
    }

    @Transactional
    public LeaveApplicationView reject(User actor, Long applicationId, String reviewNote) {
        LeaveApplication application = leaveApplicationRepo.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leave application not found"));
        Faculty faculty = resolveFacultyActorForApplication(actor, application);

        if (application.getStatus() != LeaveApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This application is no longer pending");
        }
        if (reviewNote == null || reviewNote.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A review note is required when rejecting a request");
        }

        application.setStatus(LeaveApplicationStatus.REJECTED);
        application.setReviewedBy(faculty);
        application.setReviewedAt(Instant.now());
        application.setReviewNote(reviewNote.trim());
        return toView(leaveApplicationRepo.save(application));
    }

    @Transactional(readOnly = true)
    public List<LeaveApplicationView> listAllForAdmin() {
        return leaveApplicationRepo.findAllByOrderByAppliedAtDesc().stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public LeaveApplication findByProofFileName(String fileName) {
        return leaveApplicationRepo.findByProofFileName(fileName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proof not found"));
    }

    public boolean canAccessProof(User actor, LeaveApplication application) {
        if (actor.getRole() == Role.ADMIN) {
            return true;
        }
        if (application.getStudent().getUser() != null && application.getStudent().getUser().getId().equals(actor.getId())) {
            return true;
        }
        if (application.getReviewedBy() != null && application.getReviewedBy().getUser() != null
                && application.getReviewedBy().getUser().getId().equals(actor.getId())) {
            return true;
        }

        Faculty faculty = facultyRepo.findByUserId(actor.getId()).orElse(null);
        if (faculty == null) {
            return false;
        }

        Set<Long> taughtSections = subjectOfferingRepo.findByFacultyId(faculty.getId()).stream()
                .map(off -> off.getClassSection().getId())
                .collect(java.util.stream.Collectors.toSet());
        return application.getClassSection() != null && taughtSections.contains(application.getClassSection().getId());
    }

    public Path resolveProofPath(String fileName) {
        return Paths.get("uploads", "leave-proofs", fileName).toAbsolutePath().normalize();
    }

    private Faculty resolveFacultyActorForApplication(User actor, LeaveApplication application) {
        if (actor.getRole() == Role.ADMIN) {
            return application.getReviewedBy();
        }
        Faculty faculty = facultyRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has no staff profile"));

        Set<Long> taughtSections = subjectOfferingRepo.findByFacultyId(faculty.getId()).stream()
                .map(off -> off.getClassSection().getId())
                .collect(java.util.stream.Collectors.toSet());

        if (application.getClassSection() == null || !taughtSections.contains(application.getClassSection().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this class");
        }
        return faculty;
    }

    private void createOdAttendanceEntries(LeaveApplication application, Faculty faculty) {
        if (application.getClassSection() == null) {
            return;
        }

        Student student = application.getStudent();
        for (LocalDate date = application.getFromDate(); !date.isAfter(application.getToDate()); date = date.plusDays(1)) {
            final LocalDate currentDate = date;
            List<TimetableSlot> slots = timetableSlotRepo.findBySubjectOfferingClassSectionIdAndDayOfWeekOrderByPeriodAsc(
                    application.getClassSection().getId(), currentDate.getDayOfWeek().getValue());
            for (TimetableSlot slot : slots) {
                AttendanceRecord record = attendanceRepo
                        .findByStudentIdAndSubjectOfferingIdAndClassDateAndPeriod(
                                student.getId(), slot.getSubjectOffering().getId(), currentDate, slot.getPeriod())
                        .orElseGet(() -> AttendanceRecord.builder()
                                .student(student)
                                .subjectOffering(slot.getSubjectOffering())
                                .classDate(currentDate)
                                .period(slot.getPeriod())
                                .build());
                record.setStatus(AttendanceStatus.OD);
                record.setRemarks("OD approved via leave workflow");
                record.setMarkedBy(faculty);
                record.setMarkedAt(Instant.now());
                attendanceRepo.save(record);
            }
        }
    }

    private void validateProof(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return;
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proof must be 5MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Proof upload must be a PDF, JPG, PNG, or WEBP image");
        }
    }

    private String saveProofFile(Long studentId, MultipartFile file) {
        String originalFilename = Optional.ofNullable(file.getOriginalFilename()).orElse("proof");
        String safeName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storedName = studentId + "-" + UUID.randomUUID() + "-" + safeName;
        Path root = Paths.get("uploads", "leave-proofs").toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
            Files.copy(file.getInputStream(), root.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
            return storedName;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store the proof file");
        }
    }

    private LeaveApplicationView toView(LeaveApplication app) {
        String reviewedBy = app.getReviewedBy() != null ? app.getReviewedBy().getName() : null;
        String className = app.getClassSection() != null ? app.getClassSection().getDisplayName() : "";
        return new LeaveApplicationView(
                app.getId(),
                app.getStudent().getName(),
                app.getStudent().getRollNo(),
                className,
                app.getFromDate().toString(),
                app.getToDate().toString(),
                app.getType().name(),
                app.getReason(),
                app.getProofFileName(),
                app.getProofUrl(),
                app.getStatus().name(),
                app.getAppliedAt().toString(),
                reviewedBy,
                app.getReviewedAt() != null ? app.getReviewedAt().toString() : null,
                app.getReviewNote()
        );
    }
}
