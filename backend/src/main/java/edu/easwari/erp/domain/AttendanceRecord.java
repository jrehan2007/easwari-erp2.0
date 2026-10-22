package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

/**
 * One row per student, per subject offering, per date, per period.
 * Period-level granularity is what allows both the per-paper view and the
 * per-day rollup without storing the same fact twice.
 */
@Entity @Table(name = "attendance_records",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_attendance_slot",
                columnNames = {"student_id", "subject_offering_id", "class_date", "period"}),
        indexes = {
                @Index(name = "idx_att_student_date", columnList = "student_id, class_date"),
                @Index(name = "idx_att_offering_date", columnList = "subject_offering_id, class_date")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subject_offering_id", nullable = false)
    private SubjectOffering subjectOffering;

    @Column(nullable = false) private LocalDate classDate;
    @Column(nullable = false) private int period;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private AttendanceStatus status;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "marked_by_faculty_id")
    private Faculty markedBy;

    @Builder.Default private Instant markedAt = Instant.now();
    @Column(length = 256) private String remarks;
}
