package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AssessmentRepo extends JpaRepository<Assessment, Long> {
    List<Assessment> findBySubjectOfferingId(Long offeringId);
    List<Assessment> findBySubjectOfferingIdAndPublishedTrue(Long offeringId);
    Optional<Assessment> findBySubjectOfferingIdAndType(Long offeringId, AssessmentType type);
}
