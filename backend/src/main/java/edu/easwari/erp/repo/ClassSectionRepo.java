package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;

public interface ClassSectionRepo extends JpaRepository<ClassSection, Long> {
    List<ClassSection> findByProgramId(Long programId);
    List<ClassSection> findByCoordinatorId(Long coordinatorId);

    boolean existsByProgramDepartmentId(Long departmentId);

    @Modifying @Query("update ClassSection c set c.coordinator = null where c.coordinator.id = :facultyId")
    void clearCoordinator(@Param("facultyId") Long facultyId);
}
