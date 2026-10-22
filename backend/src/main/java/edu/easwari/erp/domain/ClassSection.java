package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

/** A concrete cohort: CSE, year 3, section A, semester 6, AY 2025-26. */
@Entity @Table(name = "class_sections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClassSection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "program_id")
    private Program program;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "coordinator_id")
    private Faculty coordinator;
    @Column(name = "class_year")
    private int year;
    private int semester;
    @Column(length = 4) private String section;   // A, B
    @Column(length = 16) private String academicYear;

    public String getDisplayName() {
        return (program != null ? program.getCode() : "?") + " Y" + year + "-" + section;
    }
}
