package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * One account table for all three portals. Students sign in with their college
 * roll number, staff with their email — the column is identifier-agnostic.
 */
@Entity @Table(name = "users",
        indexes = @Index(name = "idx_users_username", columnList = "username", unique = true))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String username;

    /** BCrypt hash. Plaintext passwords never touch the database. */
    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private Role role;

    @Builder.Default private boolean active = true;
    @Builder.Default private boolean mustChangePassword = false;

    /** BCrypt hash of the optional 6-digit quick code (null = not set up). */
    private String quickCodeHash;
    @Builder.Default private int quickCodeFailures = 0;
    private Instant quickCodeLockedUntil;

    private Instant lastLoginAt;
    @Builder.Default private Instant createdAt = Instant.now();
    private Long createdByUserId;
}
