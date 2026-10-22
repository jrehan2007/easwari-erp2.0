package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * The publish gate. Marks stay invisible to students until published,
 * so half-entered scores never leak.
 */
@Entity @Table(name = "assessments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Assessment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subject_offering_id", nullable = false)
    private SubjectOffering subjectOffering;

    // 24, not 16: GROUP_PRESENTATION (18 characters) did not fit.
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private AssessmentType type;

    @Builder.Default private int maxMarks = 30;
    @Builder.Default private boolean published = false;
    private Instant publishedAt;
    private Instant createdAt;
}
