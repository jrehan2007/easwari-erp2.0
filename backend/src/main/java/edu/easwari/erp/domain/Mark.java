package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "marks",
        uniqueConstraints = @UniqueConstraint(name = "uk_mark", columnNames = {"assessment_id", "student_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Mark {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    private Double score;         // null = not yet entered
}
