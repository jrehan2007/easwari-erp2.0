package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Who granted what, and when. Every privileged admin action lands here.
 */
@Entity @Table(name = "audit_logs",
        indexes = @Index(name = "idx_audit_at", columnList = "occurred_at"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long actorUserId;
    @Column(length = 64) private String actorUsername;
    @Column(nullable = false, length = 64) private String action;   // USER_CREATED, ACCESS_REVOKED...
    @Column(length = 64) private String targetType;
    private Long targetId;
    @Column(length = 1000) private String detail;

    @Builder.Default private Instant occurredAt = Instant.now();
}
