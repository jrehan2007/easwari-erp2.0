package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * Duration is a field, not a constant. A 5-year integrated programme or a
 * 3-year degree needs no code change — the roadmap renders from this.
 */
@Entity @Table(name = "programs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Program {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;          // BE-CSE

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "department_id")
    private Department department;

    @Builder.Default private int durationYears = 4;
    @Builder.Default private int totalCreditsRequired = 168;
    @Builder.Default private int semestersPerYear = 2;
}
