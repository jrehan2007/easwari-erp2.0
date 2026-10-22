package edu.easwari.erp.repo;

import edu.easwari.erp.domain.LeaveApplication;
import edu.easwari.erp.domain.LeaveApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;
import java.util.Optional;

public interface LeaveApplicationRepo extends JpaRepository<LeaveApplication, Long> {
    List<LeaveApplication> findByStudentIdOrderByAppliedAtDesc(Long studentId);
    List<LeaveApplication> findByStatusOrderByAppliedAtDesc(LeaveApplicationStatus status);
    List<LeaveApplication> findAllByOrderByAppliedAtDesc();
    Optional<LeaveApplication> findByProofFileName(String proofFileName);

    boolean existsByClassSectionId(Long classSectionId);

    @Modifying @Query("delete from LeaveApplication l where l.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);

    @Modifying @Query("update LeaveApplication l set l.reviewedBy = null where l.reviewedBy.id = :facultyId")
    void clearReviewedBy(@Param("facultyId") Long facultyId);
}
