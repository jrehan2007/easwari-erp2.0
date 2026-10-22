package edu.easwari.erp.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "subjects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Subject {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 16)
    private String code;          // CS8492

    @Column(nullable = false) private String name;
    private int credits;
    private int semester;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "department_id")
    private Department department;

    @Builder.Default private boolean laboratory = false;
}
