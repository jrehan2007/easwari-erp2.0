package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepo extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByStudentIdOrderByClassDateAscPeriodAsc(Long studentId);

    List<AttendanceRecord> findByStudentIdAndClassDateBetweenOrderByClassDateAscPeriodAsc(
            Long studentId, LocalDate from, LocalDate to);

    List<AttendanceRecord> findByStudentIdAndSubjectOfferingId(Long studentId, Long offeringId);

    List<AttendanceRecord> findBySubjectOfferingIdAndClassDateAndPeriod(
            Long offeringId, LocalDate date, int period);

    List<AttendanceRecord> findBySubjectOfferingClassSectionIdAndClassDate(Long sectionId, LocalDate date);

    Optional<AttendanceRecord> findByStudentIdAndSubjectOfferingIdAndClassDateAndPeriod(
            Long studentId, Long offeringId, LocalDate date, int period);

    @Query("""
           select so.subject.code, so.subject.name, so.subject.credits,
                  count(a), sum(case when a.status <> edu.easwari.erp.domain.AttendanceStatus.ABSENT then 1 else 0 end)
           from AttendanceRecord a join a.subjectOffering so
           where a.student.id = :studentId
           group by so.subject.code, so.subject.name, so.subject.credits
           order by so.subject.code
           """)
    List<Object[]> subjectRollup(@Param("studentId") Long studentId);

    @Query("""
           select a.classDate, count(a),
                  sum(case when a.status <> edu.easwari.erp.domain.AttendanceStatus.ABSENT then 1 else 0 end)
           from AttendanceRecord a
           where a.student.id = :studentId
             and (:offeringId is null or a.subjectOffering.id = :offeringId)
           group by a.classDate order by a.classDate
           """)
    List<Object[]> dayRollup(@Param("studentId") Long studentId, @Param("offeringId") Long offeringId);

    @Query("""
           select count(a), sum(case when a.status <> edu.easwari.erp.domain.AttendanceStatus.ABSENT then 1 else 0 end)
           from AttendanceRecord a where a.student.id = :studentId
           """)
    Object overallRollup(@Param("studentId") Long studentId);

    @Query("""
           select d.code, count(a),
                  sum(case when a.status <> edu.easwari.erp.domain.AttendanceStatus.ABSENT then 1 else 0 end)
           from AttendanceRecord a
           join a.student s join s.program p join p.department d
           group by d.code order by d.code
           """)
    List<Object[]> departmentRollup();

    @Query("select count(distinct a.classDate) from AttendanceRecord a where a.subjectOffering.id = :offeringId")
    long distinctDatesForOffering(@Param("offeringId") Long offeringId);

    @Query("""
           select a.student.id, count(a),
                  sum(case when a.status <> edu.easwari.erp.domain.AttendanceStatus.ABSENT then 1 else 0 end)
           from AttendanceRecord a
           where a.student.classSection.id = :sectionId
           group by a.student.id
           """)
    List<Object[]> studentTotalsForSection(@Param("sectionId") Long sectionId);

    @Query("""
           select d.code, a.student.id, count(a),
                  sum(case when a.status <> edu.easwari.erp.domain.AttendanceStatus.ABSENT then 1 else 0 end)
           from AttendanceRecord a
           join a.student s join s.program p join p.department d
           group by d.code, a.student.id
           """)
    List<Object[]> studentTotalsByDepartment();

    @Modifying @Query("delete from AttendanceRecord a where a.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);

    @Modifying @Query("update AttendanceRecord a set a.markedBy = null where a.markedBy.id = :facultyId")
    void clearMarkedBy(@Param("facultyId") Long facultyId);
}
