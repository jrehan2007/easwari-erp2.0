package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;
import java.util.Optional;

public interface SubjectOfferingRepo extends JpaRepository<SubjectOffering, Long> {
    List<SubjectOffering> findByFacultyId(Long facultyId);
    List<SubjectOffering> findByClassSectionId(Long classSectionId);
    Optional<SubjectOffering> findBySubjectIdAndClassSectionId(Long subjectId, Long classSectionId);

    boolean existsByClassSectionId(Long classSectionId);

    @Modifying @Query("update SubjectOffering o set o.faculty = null where o.faculty.id = :facultyId")
    void clearFaculty(@Param("facultyId") Long facultyId);
}
