package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "departments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Department {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 16)
    private String code;          // CSE, ECE, IT

    @Column(nullable = false)
    private String name;

    private String hodName;
}
