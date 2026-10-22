package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;

public interface CmsRequestRepo extends JpaRepository<CmsRequest, Long> {
    List<CmsRequest> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<CmsRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status);
    long countByStatus(RequestStatus status);

    @Modifying @Query("delete from CmsRequest c where c.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);
}
