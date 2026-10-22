package edu.easwari.erp.repo;

import edu.easwari.erp.domain.FeeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FeeItemRepo extends JpaRepository<FeeItem, Long> {
    List<FeeItem> findByStudentIdOrderByDueDateAscIdAsc(Long studentId);
    Optional<FeeItem> findByIdAndStudentId(Long id, Long studentId);

    @Modifying @Query("delete from FeeItem f where f.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);
}
