package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "placement_applications",
        uniqueConstraints = @UniqueConstraint(name = "uk_application", columnNames = {"student_id", "company_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlacementApplication {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    @Builder.Default private ApplicationStatus status = ApplicationStatus.APPLIED;

    @Builder.Default private Instant appliedAt = Instant.now();
}
