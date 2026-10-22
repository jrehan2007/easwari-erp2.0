package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;

public interface PlacementApplicationRepo extends JpaRepository<PlacementApplication, Long> {
    List<PlacementApplication> findByStudentId(Long studentId);
    boolean existsByStudentIdAndCompanyId(Long studentId, Long companyId);
    long countByCompanyId(Long companyId);

    @Modifying @Query("delete from PlacementApplication p where p.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);
}
