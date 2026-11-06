package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

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

    // Personal details the student keeps up to date from My Profile.
    private LocalDate dateOfBirth;
    @Column(length = 16) private String gender;
    @Column(length = 400) private String address;
    private String fatherName;
    private String motherName;
    @Column(length = 20) private String parentPhone;
    @Column(length = 1000) private String about;
    private String linkedinUrl;
    private String githubUrl;

    /** Stored under uploads/student-photos; null until the student uploads one. */
    private String photoFileName;

    /** Cached rollup, recomputed on mark publication. */
    @Builder.Default private double cgpa = 0.0;
    @Builder.Default private int creditsEarned = 0;
}
