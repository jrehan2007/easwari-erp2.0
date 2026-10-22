package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Table(name = "companies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Company {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false) private String name;
    private String jobRole;
    private String ctc;

    /** Eligibility is data, so the placement cell can change it without a release. */
    @Builder.Default private double minCgpa = 7.0;
    @Builder.Default private int minAttendance = 75;
    @Column(length = 128) private String eligibleDepartments;  // "CSE,IT" or "ALL"
    @Builder.Default private int maxStandingArrears = 0;

    private LocalDate applicationDeadline;
    private LocalDate driveDate;
    @Column(length = 512) private String description;
}
