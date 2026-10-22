package edu.easwari.erp.repo;

import edu.easwari.erp.domain.UniversityResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UniversityResultRepo extends JpaRepository<UniversityResult, Long> {
    List<UniversityResult> findByStudentIdOrderBySemesterAscSubjectCodeAsc(Long studentId);

    @Modifying @Query("delete from UniversityResult r where r.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);
}
