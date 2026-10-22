package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "leave_applications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaveApplication {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_section_id", nullable = false)
    private ClassSection classSection;

    @Column(nullable = false)
    private LocalDate fromDate;

    @Column(nullable = false)
    private LocalDate toDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private LeaveApplicationType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(length = 255)
    private String proofFileName;

    @Column(length = 255)
    private String proofUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private LeaveApplicationStatus status = LeaveApplicationStatus.PENDING;

    @Builder.Default
    private Instant appliedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reviewed_by_faculty_id")
    private Faculty reviewedBy;

    private Instant reviewedAt;

    @Column(columnDefinition = "TEXT")
    private String reviewNote;
}
