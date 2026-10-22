package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TimetableSlotRepo extends JpaRepository<TimetableSlot, Long> {
    List<TimetableSlot> findBySubjectOfferingClassSectionIdAndDayOfWeekOrderByPeriodAsc(Long sectionId, int dayOfWeek);
    List<TimetableSlot> findBySubjectOfferingClassSectionId(Long sectionId);
    List<TimetableSlot> findBySubjectOfferingFacultyIdAndDayOfWeekOrderByPeriodAsc(Long facultyId, int dayOfWeek);
    List<TimetableSlot> findBySubjectOfferingId(Long offeringId);
}
