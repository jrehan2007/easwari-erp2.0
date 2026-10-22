package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SubjectRepo extends JpaRepository<Subject, Long> {
    Optional<Subject> findByCode(String code);
    List<Subject> findByDepartmentIdAndSemester(Long departmentId, int semester);

    boolean existsByDepartmentId(Long departmentId);
}
