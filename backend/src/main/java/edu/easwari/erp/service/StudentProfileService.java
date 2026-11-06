package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.StudentRepo;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

/** The student's own profile: personal details and the passport photo. */
@Service @RequiredArgsConstructor
public class StudentProfileService {

    private static final long MAX_PHOTO_BYTES = 3L * 1024 * 1024;
    private static final Map<String, String> PHOTO_TYPES = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp"
    );

    private final StudentRepo studentRepo;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public StudentProfile view(Long studentId) {
        Student s = load(studentId);
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
                s.getHostelBlock(), s.getCgpa(), s.getCreditsEarned(), creditsRequired,
                s.getBloodGroup(), s.getDateOfBirth() != null ? s.getDateOfBirth().toString() : null,
                s.getGender(), s.getAddress(), s.getFatherName(), s.getMotherName(), s.getParentPhone(),
                s.getAbout(), s.getLinkedinUrl(), s.getGithubUrl(), s.getPhotoFileName() != null);
    }

    @Transactional
    public StudentProfile update(User actor, Long studentId, StudentProfileUpdate req) {
        Student s = load(studentId);
        s.setEmail(blankToNull(req.email()));
        s.setPhone(blankToNull(req.phone()));
        s.setDateOfBirth(req.dateOfBirth());
        s.setGender(blankToNull(req.gender()));
        s.setBloodGroup(blankToNull(req.bloodGroup()));
        s.setAddress(blankToNull(req.address()));
        s.setFatherName(blankToNull(req.fatherName()));
        s.setMotherName(blankToNull(req.motherName()));
        s.setParentPhone(blankToNull(req.parentPhone()));
        s.setAbout(blankToNull(req.about()));
        s.setLinkedinUrl(blankToNull(req.linkedinUrl()));
        s.setGithubUrl(blankToNull(req.githubUrl()));
        auditService.record(actor, "PROFILE_UPDATED", "Student", s.getId(), "Personal details updated");
        return view(studentId);
    }

    @Transactional
    public StudentProfile savePhoto(User actor, Long studentId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a photo to upload");
        }
        if (file.getSize() > MAX_PHOTO_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo must be 3 MB or smaller");
        }
        String contentType = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        String extension = PHOTO_TYPES.get(contentType);
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo must be a JPG, PNG or WEBP image");
        }

        Student s = load(studentId);
        String storedName = s.getId() + "-" + UUID.randomUUID() + extension;
        try {
            Path root = photoRoot();
            Files.createDirectories(root);
            Files.copy(file.getInputStream(), root.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store the photo");
        }
        deleteStoredPhoto(s.getPhotoFileName());
        s.setPhotoFileName(storedName);
        auditService.record(actor, "PHOTO_UPDATED", "Student", s.getId(), "Profile photo uploaded");
        return view(studentId);
    }

    @Transactional
    public StudentProfile removePhoto(User actor, Long studentId) {
        Student s = load(studentId);
        deleteStoredPhoto(s.getPhotoFileName());
        s.setPhotoFileName(null);
        auditService.record(actor, "PHOTO_REMOVED", "Student", s.getId(), "Profile photo removed");
        return view(studentId);
    }

    /** Path of the student's photo on disk, or empty when none has been uploaded. */
    @Transactional(readOnly = true)
    public Optional<Path> photoPath(Long studentId) {
        String name = load(studentId).getPhotoFileName();
        if (name == null) return Optional.empty();
        Path path = photoRoot().resolve(name).normalize();
        return Files.exists(path) ? Optional.of(path) : Optional.empty();
    }

    private Student load(Long studentId) {
        return studentRepo.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    private void deleteStoredPhoto(String name) {
        if (name == null) return;
        try {
            Files.deleteIfExists(photoRoot().resolve(name).normalize());
        } catch (IOException ignored) {
            // A leftover file is harmless; the record no longer points at it.
        }
    }

    private static Path photoRoot() {
        return Paths.get("uploads", "student-photos").toAbsolutePath().normalize();
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
