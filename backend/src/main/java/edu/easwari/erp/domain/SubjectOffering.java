package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * The join that makes attendance meaningful: this subject, taught to this
 * section, by this member of staff, in this academic year. Attendance and
 * marks hang off the offering rather than the subject.
 */
@Entity @Table(name = "subject_offerings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SubjectOffering {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_section_id", nullable = false)
    private ClassSection classSection;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    @Column(length = 16) private String academicYear;
}
