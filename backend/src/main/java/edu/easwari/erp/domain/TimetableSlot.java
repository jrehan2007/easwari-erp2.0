package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * Weekly recurring slot. dayOfWeek follows java.time.DayOfWeek (1 = Monday).
 * The faculty attendance grid is generated from these.
 */
@Entity @Table(name = "timetable_slots")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TimetableSlot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subject_offering_id", nullable = false)
    private SubjectOffering subjectOffering;

    private int dayOfWeek;        // 1 = Monday ... 5 = Friday
    private int period;           // 1..7
    @Column(length = 8) private String startTime;
    @Column(length = 16) private String room;
}
