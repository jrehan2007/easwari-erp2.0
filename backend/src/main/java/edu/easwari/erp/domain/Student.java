package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "students",
        indexes = @Index(name = "idx_students_roll", columnList = "roll_no", unique = true))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Student {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 32)
    private String rollNo;        // CSE23089 — also the login username

    @Column(length = 32) private String regNo;
    @Column(nullable = false) private String name;
    private String email;
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "program_id")
    private Program program;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_section_id")
    private ClassSection classSection;

    private int batchStartYear;
    private int currentYear;
    private int currentSemester;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "mentor_faculty_id")
    private Faculty mentor;

    private String hostelBlock;
    private String bloodGroup;

    /** Cached rollup, recomputed on mark publication. */
    @Builder.Default private double cgpa = 0.0;
    @Builder.Default private int creditsEarned = 0;
}
