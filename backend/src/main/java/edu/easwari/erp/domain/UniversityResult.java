package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * End-semester (university) examination result for one course. Grades follow
 * the Anna University ten-point scale; RA = re-appearance (arrear).
 */
@Entity @Table(name = "university_results",
        uniqueConstraints = @UniqueConstraint(name = "uk_univ_result", columnNames = {"student_id", "subject_code", "exam_session"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UniversityResult {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    private int semester;
    @Column(name = "exam_session", nullable = false, length = 24) private String examSession;   // "Apr/May 2026"
    @Column(name = "subject_code", nullable = false, length = 16) private String subjectCode;
    @Column(nullable = false) private String subjectName;
    private int credits;
    @Builder.Default private boolean laboratory = false;

    private int internalMarks;         // out of 40 (theory) or 60 (practical)
    private int externalMarks;         // out of 60 (theory) or 40 (practical)
    @Column(nullable = false, length = 4) private String grade;   // O, A+, A, B+, B, C, RA, AB
    private int gradePoint;

    public boolean passed() { return gradePoint > 0; }
    public int total() { return internalMarks + externalMarks; }
}
