package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface StudentRepo extends JpaRepository<Student, Long> {
    @EntityGraph(attributePaths = {"program", "program.department", "classSection", "mentor", "user"})
    Optional<Student> findByUserId(Long userId);

    Optional<Student> findByRollNoIgnoreCase(String rollNo);
    List<Student> findByClassSectionId(Long classSectionId);
    List<Student> findByClassSectionIdOrderByRollNoAsc(Long classSectionId);

    @Query("select s from Student s where s.program.department.id = :deptId")
    List<Student> findByDepartment(@Param("deptId") Long deptId);

    long countByClassSectionId(Long classSectionId);

    @Modifying @Query("update Student s set s.mentor = null where s.mentor.id = :facultyId")
    void clearMentor(@Param("facultyId") Long facultyId);
}
