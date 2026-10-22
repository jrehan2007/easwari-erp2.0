package edu.easwari.erp.config;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.*;
import edu.easwari.erp.service.Dtos.FacultyClass;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FacultyServiceTest {

    @Mock private FacultyRepo facultyRepo;
    @Mock private SubjectOfferingRepo offeringRepo;
    @Mock private StudentRepo studentRepo;
    @Mock private AttendanceRepo attendanceRepo;
    @Mock private AttendanceService attendanceService;
    @Mock private IntelligenceService intelligence;
    @Mock private ClassSectionRepo classSectionRepo;
    @Mock private UserRepo userRepo;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private FacultyService facultyService;

    @Test
    void classesForIncludesCoordinatorAssignedSections() {
        Faculty faculty = Faculty.builder().id(7L).name("Dr. Rao").build();
        ClassSection section = ClassSection.builder().id(42L).section("A").year(3).build();
        section.setCoordinator(faculty);

        User user = User.builder().id(99L).role(Role.FACULTY).build();

        when(facultyRepo.findByUserId(99L)).thenReturn(java.util.Optional.of(faculty));
        when(offeringRepo.findByFacultyId(7L)).thenReturn(List.of());
        when(classSectionRepo.findByCoordinatorId(7L)).thenReturn(List.of(section));

        List<FacultyClass> classes = facultyService.classesFor(user);

        assertThat(classes).hasSize(1);
        assertThat(classes.get(0).classSectionId()).isEqualTo(42L);
        assertThat(classes.get(0).sectionName()).isEqualTo("? Y3-A");
    }

    @Test
    void studentsInAllowsCoordinatorAccessEvenWithoutTeachingAssignment() {
        Faculty faculty = Faculty.builder().id(7L).name("Dr. Rao").build();
        User user = User.builder().id(99L).role(Role.FACULTY).build();
        ClassSection section = ClassSection.builder().id(42L).section("A").year(3).build();
        section.setCoordinator(faculty);
        Student student = Student.builder().id(5L).rollNo("CSE23001").name("Asha").classSection(section).build();

        when(facultyRepo.findByUserId(99L)).thenReturn(java.util.Optional.of(faculty));
        when(offeringRepo.findByFacultyId(7L)).thenReturn(List.of());
        when(classSectionRepo.findByCoordinatorId(7L)).thenReturn(List.of(section));
        when(studentRepo.findByClassSectionIdOrderByRollNoAsc(42L)).thenReturn(List.of(student));
        when(attendanceService.overallPercentage(5L)).thenReturn(88);

        List<Map<String, Object>> students = facultyService.studentsIn(user, 42L);

        assertThat(students).hasSize(1);
        assertThat(students.get(0).get("studentId")).isEqualTo(5L);
        assertThat(students.get(0).get("attendance")).isEqualTo(88);
    }

    @Test
    void facultyCanCreateStudentOnlyForOwnCoordinatedSection() {
        Faculty faculty = Faculty.builder().id(7L).name("Dr. Rao").build();
        User user = User.builder().id(99L).role(Role.FACULTY).build();
        Program program = Program.builder().id(11L).code("CSE").build();
        ClassSection section = ClassSection.builder().id(42L).program(program).section("A").year(3).semester(6).build();
        section.setCoordinator(faculty);

        when(facultyRepo.findByUserId(99L)).thenReturn(java.util.Optional.of(faculty));
        when(classSectionRepo.findById(42L)).thenReturn(java.util.Optional.of(section));
        when(studentRepo.findByRollNoIgnoreCase("CSE23001")).thenReturn(java.util.Optional.empty());
        when(passwordEncoder.encode("Student@123")).thenReturn("hashed-password");
        when(userRepo.save(org.mockito.ArgumentMatchers.any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1001L);
            return u;
        });
        when(studentRepo.save(org.mockito.ArgumentMatchers.any(Student.class))).thenAnswer(inv -> {
            Student s = inv.getArgument(0);
            s.setId(500L);
            return s;
        });

        Student created = facultyService.addStudentToSection(user, 42L,
                new edu.easwari.erp.service.Dtos.AddStudentToSectionRequest("Asha", "CSE23001", 3, 2023));

        assertThat(created.getName()).isEqualTo("Asha");
        assertThat(created.getClassSection()).isSameAs(section);
        assertThat(created.getCurrentYear()).isEqualTo(3);
        assertThat(created.getBatchStartYear()).isEqualTo(2023);
    }
}
