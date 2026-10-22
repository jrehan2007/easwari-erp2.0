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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarksServiceTest {

    @Mock private AssessmentRepo assessmentRepo;
    @Mock private MarkRepo markRepo;
    @Mock private StudentRepo studentRepo;
    @Mock private SubjectOfferingRepo offeringRepo;
    @Mock private FacultyRepo facultyRepo;
    @Mock private AuditService audit;

    @InjectMocks private MarksService marksService;

    @Test
    void averageUsesEachTestsOwnMaximum() {
        Student student = Student.builder().id(5L).build();
        when(studentRepo.findById(5L)).thenReturn(Optional.of(student));
        when(markRepo.publishedMarks(5L)).thenReturn(List.of(
                new Object[]{"CS3501", "Compiler Design", 4, AssessmentType.IA1, 46.0, 50},
                new Object[]{"CS3501", "Compiler Design", 4, AssessmentType.IA2, 15.0, 30}));

        SubjectMarks m = marksService.viewFor(5L).subjects().get(0);

        // 46/50 = 92%, 15/30 = 50% → 71%, not (46+15)/(2×30) = 102%.
        assertThat(m.averagePercentage()).isEqualTo(71);
        assertThat(m.grade()).isEqualTo("A");
        assertThat(m.ia1Max()).isEqualTo(50);
        assertThat(m.ia2Max()).isEqualTo(30);
    }

    @Test
    void blankScoreDoesNotEraseAMarkAlreadyOnRecord() {
        ClassSection section = ClassSection.builder().id(1L).section("E").year(3).build();
        SubjectOffering offering = SubjectOffering.builder().id(10L).classSection(section)
                .subject(Subject.builder().code("CS3501").build()).build();
        Student asha = Student.builder().id(5L).rollNo("310623104001").classSection(section).build();
        Assessment ia1 = Assessment.builder().id(3L).subjectOffering(offering).type(AssessmentType.IA1).maxMarks(50).build();
        Mark existing = Mark.builder().id(30L).assessment(ia1).student(asha).score(46.0).build();
        User admin = User.builder().id(1L).role(Role.ADMIN).build();

        when(offeringRepo.findById(10L)).thenReturn(Optional.of(offering));
        when(assessmentRepo.findBySubjectOfferingIdAndType(10L, AssessmentType.IA1)).thenReturn(Optional.of(ia1));
        when(studentRepo.findById(5L)).thenReturn(Optional.of(asha));
        when(markRepo.findByAssessmentId(3L)).thenReturn(List.of(existing));

        marksService.saveMarks(admin, new MarkEntryRequest(10L, AssessmentType.IA1, 50,
                List.of(new ScoreEntry(5L, null)), false));

        verify(markRepo, never()).save(any());
        assertThat(existing.getScore()).isEqualTo(46.0);
    }

    @Test
    void maximumCannotDropBelowAScoreAlreadyRecorded() {
        ClassSection section = ClassSection.builder().id(1L).section("E").year(3).build();
        SubjectOffering offering = SubjectOffering.builder().id(10L).classSection(section)
                .subject(Subject.builder().code("CS3501").build()).build();
        Student asha = Student.builder().id(5L).classSection(section).build();
        Assessment ia1 = Assessment.builder().id(3L).subjectOffering(offering).type(AssessmentType.IA1).maxMarks(50).build();
        User admin = User.builder().id(1L).role(Role.ADMIN).build();

        when(offeringRepo.findById(10L)).thenReturn(Optional.of(offering));
        when(assessmentRepo.findBySubjectOfferingIdAndType(10L, AssessmentType.IA1)).thenReturn(Optional.of(ia1));
        when(markRepo.findByAssessmentId(3L)).thenReturn(List.of(
                Mark.builder().id(30L).assessment(ia1).student(asha).score(46.0).build()));

        assertThatThrownBy(() -> marksService.saveMarks(admin,
                new MarkEntryRequest(10L, AssessmentType.IA1, 30, List.of(), true)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void marksCannotBeEnteredForStudentOutsideTheOfferingsClass() {
        ClassSection mine = ClassSection.builder().id(1L).section("E").year(3).build();
        ClassSection other = ClassSection.builder().id(2L).section("F").year(3).build();
        SubjectOffering offering = SubjectOffering.builder().id(10L).classSection(mine)
                .subject(Subject.builder().code("CS3501").build()).build();
        Student outsider = Student.builder().id(9L).rollNo("310623104099").classSection(other).build();
        User admin = User.builder().id(1L).role(Role.ADMIN).build();

        when(offeringRepo.findById(10L)).thenReturn(Optional.of(offering));
        when(assessmentRepo.findBySubjectOfferingIdAndType(10L, AssessmentType.IA1)).thenReturn(Optional.empty());
        when(assessmentRepo.save(any(Assessment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(studentRepo.findById(9L)).thenReturn(Optional.of(outsider));

        MarkEntryRequest req = new MarkEntryRequest(10L, AssessmentType.IA1, 50,
                List.of(new ScoreEntry(9L, 40.0)), true);

        assertThatThrownBy(() -> marksService.saveMarks(admin, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
        verify(markRepo, never()).save(any());
    }
}
