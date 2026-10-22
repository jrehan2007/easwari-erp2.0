package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** Fee, hostel, transport, ID card, exam cell and library requests. */
@Entity @Table(name = "cms_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CmsRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false, length = 32) private String serviceType;
    @Column(nullable = false, unique = true, length = 32) private String ticketNo;

    @Column(length = 2000) private String payloadJson;
    @Column(length = 1000) private String resolutionNote;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    @Builder.Default private RequestStatus status = RequestStatus.OPEN;

    @Builder.Default private Instant createdAt = Instant.now();
    private Instant resolvedAt;
}
