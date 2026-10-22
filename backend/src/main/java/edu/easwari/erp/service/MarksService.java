package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class MarksService {

    private final AssessmentRepo assessmentRepo;
    private final MarkRepo markRepo;
    private final StudentRepo studentRepo;
    private final SubjectOfferingRepo offeringRepo;
    private final FacultyRepo facultyRepo;
    private final AuditService audit;
    private final UniversityResultRepo resultRepo;

    /**
     * Save draft or publish. Nothing reaches the student view until
     * published — the gate that stops half-entered marks leaking.
     */
    @Transactional
    public Assessment saveMarks(User actor, MarkEntryRequest req) {
        SubjectOffering offering = offeringRepo.findById(req.subjectOfferingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        assertTeaches(actor, offering);

        Assessment assessment = assessmentRepo
                .findBySubjectOfferingIdAndType(offering.getId(), req.type())
                .orElseGet(() -> assessmentRepo.save(Assessment.builder()
                        .subjectOffering(offering).type(req.type())
                        .maxMarks(req.maxMarks()).createdAt(Instant.now()).build()));

        assessment.setMaxMarks(req.maxMarks());

        for (ScoreEntry entry : req.scores()) {
            if (entry.score() != null && (entry.score() < 0 || entry.score() > req.maxMarks())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Score " + entry.score() + " is outside 0–" + req.maxMarks());
            }
            Student student = studentRepo.findById(entry.studentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
            AttendanceService.assertInClass(student, offering);
            // A blank box means "not entered", never "erase": skipping it keeps a score
            // already on record when the teacher later fills in one late student.
            if (entry.score() == null) continue;
            Mark mark = markRepo.findByAssessmentIdAndStudentId(assessment.getId(), student.getId())
                    .orElseGet(() -> Mark.builder().assessment(assessment).student(student).build());
            mark.setScore(entry.score());
            markRepo.save(mark);
        }

        // Lowering the maximum must not leave earlier scores above it.
        if (assessment.getId() != null) {
            for (Mark m : markRepo.findByAssessmentId(assessment.getId())) {
                if (m.getScore() != null && m.getScore() > req.maxMarks()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "A score of " + m.getScore() + " is already recorded, above the new maximum of " + req.maxMarks() + ".");
                }
            }
        }

        if (req.publish()) {
            assessment.setPublished(true);
            assessment.setPublishedAt(Instant.now());
            audit.record(actor, "MARKS_PUBLISHED", "Assessment", assessment.getId(),
                    offering.getSubject().getCode() + " " + req.type());
        }
        assessmentRepo.save(assessment);

        // Editing an already-published assessment changes what students see, so grades follow.
        if (assessment.isPublished()) recomputeCgpaForSection(offering.getClassSection().getId());
        return assessment;
    }

    /** Existing scores for the entry form. Same ownership rule as saving. */
    @Transactional(readOnly = true)
    public MarkSheet sheetFor(User actor, Long offeringId, AssessmentType type) {
        SubjectOffering offering = offeringRepo.findById(offeringId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        assertTeaches(actor, offering);
        return assessmentRepo.findBySubjectOfferingIdAndType(offeringId, type)
                .map(a -> {
                    Map<Long, Double> scores = new LinkedHashMap<>();
                    for (Mark m : markRepo.findByAssessmentId(a.getId())) {
                        if (m.getScore() != null) scores.put(m.getStudent().getId(), m.getScore());
                    }
                    return new MarkSheet(a.getId(), a.getMaxMarks(), a.isPublished(), scores);
                })
                .orElse(new MarkSheet(null, null, false, Map.of()));
    }

    @Transactional(readOnly = true)
    public MarksView viewFor(Long studentId) {
        Student student = studentRepo.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        List<SubjectMarks> subjects = publishedBySubject(studentId).stream().map(b -> {
            Integer pct = b.averagePercentage();
            return new SubjectMarks(b.code, b.name, b.credits, b.ia1, b.ia1Max, b.ia2, b.ia2Max, pct, grade(pct));
        }).toList();

        int required = student.getProgram() != null ? student.getProgram().getTotalCreditsRequired() : 168;
        return new MarksView(student.getCgpa(), student.getCreditsEarned(), required, subjects);
    }

    /** Anna University style ten-point grading. */
    public static String grade(Integer pct) {
        if (pct == null) return "—";
        if (pct >= 91) return "O";
        if (pct >= 81) return "A+";
        if (pct >= 71) return "A";
        if (pct >= 61) return "B+";
        if (pct >= 50) return "B";
        return "RA";
    }

    public static int gradePoint(String grade) {
        return switch (grade) {
            case "O" -> 10; case "A+" -> 9; case "A" -> 8;
            case "B+" -> 7; case "B" -> 6; default -> 0;
        };
    }

    @Transactional
    public void recomputeCgpaForSection(Long sectionId) {
        for (Student s : studentRepo.findByClassSectionId(sectionId)) {
            recomputeCgpa(s);
        }
    }

    @Transactional
    public void recomputeCgpa(Student student) {
        // Completed semesters count through their university grades; the current
        // semester's courses are estimated from published internals until results arrive.
        int weighted = 0, credits = 0;
        Set<String> graded = new HashSet<>();
        for (UniversityResult r : resultRepo.findByStudentIdOrderBySemesterAscSubjectCodeAsc(student.getId())) {
            graded.add(r.getSubjectCode());
            if (!r.passed()) continue;
            weighted += r.getGradePoint() * r.getCredits();
            credits += r.getCredits();
        }
        for (SubjectMarksBuilder b : publishedBySubject(student.getId())) {
            if (graded.contains(b.code)) continue;
            Integer pct = b.averagePercentage();
            if (pct == null) continue;
            String g = grade(pct);
            if ("RA".equals(g)) continue;          // arrears earn no credit
            weighted += gradePoint(g) * b.credits;
            credits += b.credits;
        }
        student.setCgpa(credits == 0 ? 0 : Math.round((weighted / (double) credits) * 100.0) / 100.0);
        student.setCreditsEarned(credits);
        studentRepo.save(student);
    }

    private void assertTeaches(User actor, SubjectOffering offering) {
        if (actor.getRole() == Role.ADMIN) return;
        Faculty faculty = facultyRepo.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No staff profile"));
        boolean teaches = offering.getFaculty() != null && offering.getFaculty().getId().equals(faculty.getId());
        ClassSection cs = offering.getClassSection();
        boolean coordinates = cs != null && cs.getCoordinator() != null
                && cs.getCoordinator().getId().equals(faculty.getId());
        if (!teaches && !coordinates) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this class");
        }
    }

    /** Published IA scores grouped per subject, each test keeping its own maximum. */
    private List<SubjectMarksBuilder> publishedBySubject(Long studentId) {
        Map<String, SubjectMarksBuilder> map = new LinkedHashMap<>();
        for (Object[] row : markRepo.publishedMarks(studentId)) {
            AssessmentType type = (AssessmentType) row[3];
            if (type != AssessmentType.IA1 && type != AssessmentType.IA2) continue;   // other components live under Examinations
            String code = (String) row[0];
            SubjectMarksBuilder b = map.computeIfAbsent(code, k -> new SubjectMarksBuilder(
                    code, (String) row[1], ((Number) row[2]).intValue()));
            Double score = row[4] == null ? null : ((Number) row[4]).doubleValue();
            int max = ((Number) row[5]).intValue();
            if (type == AssessmentType.IA1) { b.ia1 = score; b.ia1Max = max; }
            if (type == AssessmentType.IA2) { b.ia2 = score; b.ia2Max = max; }
        }
        return new ArrayList<>(map.values());
    }

    private static class SubjectMarksBuilder {
        final String code, name; final int credits;
        Double ia1, ia2; Integer ia1Max, ia2Max;
        SubjectMarksBuilder(String code, String name, int credits) {
            this.code = code; this.name = name; this.credits = credits;
        }
        /** Mean of the per-test percentages, so IA1 out of 50 and IA2 out of 30 weigh equally. */
        Integer averagePercentage() {
            double sum = 0; int n = 0;
            if (ia1 != null && ia1Max != null && ia1Max > 0) { sum += ia1 / ia1Max; n++; }
            if (ia2 != null && ia2Max != null && ia2Max > 0) { sum += ia2 / ia2Max; n++; }
            if (n == 0) return null;
            return (int) Math.round(sum / n * 100);
        }
    }
}
