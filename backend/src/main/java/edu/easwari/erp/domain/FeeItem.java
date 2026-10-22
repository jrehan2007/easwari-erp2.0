package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/** One line on a student's fee statement: tuition, transport, hostel, exam and so on. */
@Entity @Table(name = "fee_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeeItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    /** TUITION, DEVELOPMENT, TRANSPORT, HOSTEL, MESS, EXAM, LIBRARY, LAB, ... */
    @Column(nullable = false, length = 24) private String category;
    @Column(nullable = false) private String description;
    /** e.g. "2026-27 · Odd semester" */
    @Column(nullable = false, length = 40) private String term;
    private long amount;               // rupees
    private LocalDate dueDate;

    @Builder.Default private boolean paid = false;
    private Instant paidAt;
    @Column(length = 32) private String receiptNo;
    @Column(length = 24) private String paymentMode;
}
