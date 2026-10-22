package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MarkRepo extends JpaRepository<Mark, Long> {
    List<Mark> findByAssessmentId(Long assessmentId);
    Optional<Mark> findByAssessmentIdAndStudentId(Long assessmentId, Long studentId);

    @Query("""
           select so.subject.code, so.subject.name, so.subject.credits,
                  a.type, m.score, a.maxMarks
           from Mark m join m.assessment a join a.subjectOffering so
           where m.student.id = :studentId and a.published = true
           order by so.subject.code, a.type
           """)
    List<Object[]> publishedMarks(@Param("studentId") Long studentId);

    /** Every published component (theory and practical) for one student, with the course teacher. */
    @Query("""
           select so.subject.code, so.subject.name, so.subject.credits, so.subject.laboratory,
                  a.type, m.score, a.maxMarks, f.name
           from Mark m join m.assessment a join a.subjectOffering so left join so.faculty f
           where m.student.id = :studentId and a.published = true
           order by so.subject.code, a.type
           """)
    List<Object[]> publishedComponents(@Param("studentId") Long studentId);

    @Query("select m from Mark m where m.assessment.id = :assessmentId and m.student.classSection.id = :sectionId")
    List<Mark> findForSection(@Param("assessmentId") Long assessmentId, @Param("sectionId") Long sectionId);

    @Modifying @Query("delete from Mark m where m.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);
}
