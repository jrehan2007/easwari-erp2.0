package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;

public interface SkillScoreRepo extends JpaRepository<SkillScore, Long> {
    List<SkillScore> findByStudentId(Long studentId);

    @Modifying @Query("delete from SkillScore s where s.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);
}
