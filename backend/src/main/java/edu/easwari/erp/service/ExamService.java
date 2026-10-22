package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * The student's Examinations area: internal assessments of theory courses,
 * practical (laboratory) components, and end-semester university results.
 * Only published internal marks are ever returned.
 */
@Service @RequiredArgsConstructor
public class ExamService {

    private static final Map<AssessmentType, String> LABELS = Map.ofEntries(
            Map.entry(AssessmentType.IA1, "Internal Assessment 1"),
            Map.entry(AssessmentType.IA2, "Internal Assessment 2"),
            Map.entry(AssessmentType.UNIT_TEST, "Unit test"),
            Map.entry(AssessmentType.ASSIGNMENT, "Assignment"),
            Map.entry(AssessmentType.GROUP_PRESENTATION, "Group presentation"),
            Map.entry(AssessmentType.MODEL_EXAM, "Model examination"),
            Map.entry(AssessmentType.LAB_OBSERVATION, "Observation"),
            Map.entry(AssessmentType.LAB_RECORD, "Record"),
            Map.entry(AssessmentType.LAB_MODEL_EXAM, "Model practical"),
            Map.entry(AssessmentType.LAB_VIVA, "Viva voce"));

    private final MarkRepo markRepo;
    private final UniversityResultRepo resultRepo;

    @Transactional(readOnly = true)
    public List<CourseAssessments> assessments(Long studentId) {
        return courses(studentId, false);
    }

    @Transactional(readOnly = true)
    public PracticalsView practicals(Long studentId) {
        List<UniversityCourse> completed = resultRepo.findByStudentIdOrderBySemesterAscSubjectCodeAsc(studentId).stream()
                .filter(UniversityResult::isLaboratory).map(ExamService::toCourse).toList();
        return new PracticalsView(courses(studentId, true), completed);
    }

    @Transactional(readOnly = true)
    public UniversityView university(Long studentId) {
        Map<Integer, List<UniversityResult>> bySemester = new TreeMap<>();
        for (UniversityResult r : resultRepo.findByStudentIdOrderBySemesterAscSubjectCodeAsc(studentId)) {
            bySemester.computeIfAbsent(r.getSemester(), k -> new ArrayList<>()).add(r);
        }
        List<UniversitySemester> semesters = new ArrayList<>();
        int weighted = 0, earned = 0, arrears = 0;
        for (var e : bySemester.entrySet()) {
            List<UniversityResult> rs = e.getValue();
            int semWeighted = 0, semEarned = 0, semRegistered = 0, semArrears = 0;
            for (UniversityResult r : rs) {
                semRegistered += r.getCredits();
                if (r.passed()) { semWeighted += r.getGradePoint() * r.getCredits(); semEarned += r.getCredits(); }
                else semArrears++;
            }
            weighted += semWeighted; earned += semEarned; arrears += semArrears;
            semesters.add(new UniversitySemester(e.getKey(), rs.get(0).getExamSession(), round2(semWeighted, semEarned),
                    semRegistered, semEarned, semArrears, rs.stream().map(ExamService::toCourse).toList()));
        }
        return new UniversityView(round2(weighted, earned), earned, arrears, semesters);
    }

    private List<CourseAssessments> courses(Long studentId, boolean laboratory) {
        Map<String, List<Object[]>> byCourse = new LinkedHashMap<>();
        for (Object[] row : markRepo.publishedComponents(studentId)) {
            if ((Boolean) row[3] != laboratory) continue;
            byCourse.computeIfAbsent((String) row[0], k -> new ArrayList<>()).add(row);
        }
        List<CourseAssessments> out = new ArrayList<>();
        for (List<Object[]> rows : byCourse.values()) {
            Object[] first = rows.get(0);
            List<ExamComponent> parts = new ArrayList<>();
            double got = 0, max = 0;
            for (Object[] r : rows) {
                AssessmentType type = (AssessmentType) r[4];
                Double score = r[5] == null ? null : ((Number) r[5]).doubleValue();
                int m = ((Number) r[6]).intValue();
                parts.add(new ExamComponent(type.name(), LABELS.getOrDefault(type, type.name()), score, m));
                if (score != null) { got += score; max += m; }
            }
            out.add(new CourseAssessments((String) first[0], (String) first[1], ((Number) first[2]).intValue(),
                    (String) first[7], parts, max == 0 ? null : (int) Math.round(got * 100 / max)));
        }
        return out;
    }

    static UniversityCourse toCourse(UniversityResult r) {
        return new UniversityCourse(r.getSubjectCode(), r.getSubjectName(), r.getCredits(), r.isLaboratory(),
                r.getInternalMarks(), r.getExternalMarks(), r.total(), r.getGrade(), r.getGradePoint(), r.passed());
    }

    private static double round2(int weighted, int credits) {
        return credits == 0 ? 0 : Math.round(weighted * 100.0 / credits) / 100.0;
    }
}
