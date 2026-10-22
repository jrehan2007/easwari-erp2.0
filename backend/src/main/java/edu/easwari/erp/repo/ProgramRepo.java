package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProgramRepo extends JpaRepository<Program, Long> {
    Optional<Program> findByCode(String code);

    boolean existsByDepartmentId(Long departmentId);
    java.util.List<Program> findByDepartmentId(Long departmentId);
}
