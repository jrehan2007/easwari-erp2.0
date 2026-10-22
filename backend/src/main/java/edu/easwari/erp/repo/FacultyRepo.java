package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FacultyRepo extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findByUserId(Long userId);
    Optional<Faculty> findByStaffCode(String staffCode);
    List<Faculty> findByDepartmentId(Long departmentId);

    boolean existsByDepartmentId(Long departmentId);
    boolean existsByStaffCodeIgnoreCase(String staffCode);
}
