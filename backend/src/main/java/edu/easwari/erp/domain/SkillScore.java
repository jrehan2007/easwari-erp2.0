package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * Inputs the Python readiness model cannot derive from marks alone —
 * mock interview results, communication assessments, project counts.
 */
@Entity @Table(name = "skill_scores",
        uniqueConstraints = @UniqueConstraint(name = "uk_skill", columnNames = {"student_id", "skill"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SkillScore {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false, length = 32) private String skill;  // CODING, APTITUDE, COMMUNICATION...
    private int score;                                            // 0..100
}
