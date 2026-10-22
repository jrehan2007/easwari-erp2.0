package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Table(name = "internships")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Internship {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false) private String title;
    private String organisation;
    private String duration;
    private String stipend;
    private String mode;
    @Column(length = 128) private String eligibleDepartments;
    private LocalDate applicationDeadline;
}
