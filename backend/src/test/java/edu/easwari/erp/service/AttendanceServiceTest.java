package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock private AttendanceRepo attendanceRepo;
    @Mock private StudentRepo studentRepo;
    @Mock private SubjectOfferingRepo offeringRepo;
    @Mock private TimetableSlotRepo slotRepo;
    @Mock private FacultyRepo facultyRepo;
    @Mock private ClassSectionRepo sectionRepo;

    @InjectMocks private AttendanceService attendanceService;

    private final Faculty teacher = Faculty.builder().id(2L).name("Mr. Karthik").build();
    private final User teacherUser = User.builder().id(20L).role(Role.FACULTY).build();
    private final ClassSection sectionE = ClassSection.builder().id(1L).section("E").year(3).build();
    private final ClassSection sectionF = ClassSection.builder().id(2L).section("F").year(3).build();

    @Test
    void teacherCannotMarkStudentFromAnotherClass() {
        SubjectOffering offering = SubjectOffering.builder().id(10L).classSection(sectionE).faculty(teacher).build();
        Student outsider = Student.builder().id(9L).rollNo("310623104099").classSection(sectionF).build();

        when(offeringRepo.findById(10L)).thenReturn(Optional.of(offering));
        when(facultyRepo.findByUserId(20L)).thenReturn(Optional.of(teacher));
        when(studentRepo.findById(9L)).thenReturn(Optional.of(outsider));

        MarkPeriodRequest req = new MarkPeriodRequest(10L, LocalDate.of(2026, 10, 19), 2,
                List.of(new StudentStatus(9L, AttendanceStatus.ABSENT, null)));

        assertThatThrownBy(() -> attendanceService.markPeriod(teacherUser, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
        verify(attendanceRepo, never()).save(any());
    }

    @Test
    void rosterIsForbiddenToFacultyNotAssignedToTheClass() {
        when(facultyRepo.findByUserId(20L)).thenReturn(Optional.of(teacher));
        when(sectionRepo.findById(2L)).thenReturn(Optional.of(sectionF));
        when(offeringRepo.findByClassSectionId(2L)).thenReturn(List.of());

        assertThatThrownBy(() -> attendanceService.rosterForDay(teacherUser, 2L, LocalDate.of(2026, 10, 19)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }
}
