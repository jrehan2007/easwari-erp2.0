package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Assembles the feature payload the Python service scores. Java owns the
 * data; Python owns the model. Neither reaches into the other's storage.
 */
@Service @RequiredArgsConstructor
public class IntelligenceService {

    private final StudentRepo studentRepo;
    private final SkillScoreRepo skillRepo;
    private final AttendanceService attendanceService;
    private final MarksService marksService;
    private final MlClient ml;

    public Map<String, Object> featuresFor(Student s) {
        MarksView marks = marksService.viewFor(s.getId());
        AttendanceView att = attendanceService.viewFor(s.getId(), null);

        List<Map<String, Object>> subjects = new ArrayList<>();
        for (SubjectMarks m : marks.subjects()) {
            Map<String, Object> row = new HashMap<>();
            row.put("code", m.subjectCode());
            row.put("name", m.subjectName());
            row.put("credits", m.credits());
            row.put("ia1", m.ia1());
            row.put("ia2", m.ia2());
            row.put("percentage", m.averagePercentage());
            att.subjects().stream()
                    .filter(a -> a.subjectCode().equals(m.subjectCode())).findFirst()
                    .ifPresent(a -> row.put("attendance", a.percentage()));
            subjects.add(row);
        }
        // Subjects with attendance but no published marks yet still matter to risk.
        for (SubjectAttendance a : att.subjects()) {
            boolean present = subjects.stream().anyMatch(r -> a.subjectCode().equals(r.get("code")));
            if (!present) {
                Map<String, Object> row = new HashMap<>();
                row.put("code", a.subjectCode());
                row.put("name", a.subjectName());
                row.put("credits", a.credits());
                row.put("attendance", a.percentage());
                subjects.add(row);
            }
        }

        Map<String, Integer> skills = new LinkedHashMap<>();
        skillRepo.findByStudentId(s.getId()).forEach(sk -> skills.put(sk.getSkill(), sk.getScore()));

        Map<String, Object> payload = new HashMap<>();
        payload.put("student_id", s.getId());
        payload.put("roll_no", s.getRollNo());
        payload.put("name", s.getName());
        payload.put("cgpa", s.getCgpa());
        payload.put("credits_earned", s.getCreditsEarned());
        payload.put("credits_required", s.getProgram() != null ? s.getProgram().getTotalCreditsRequired() : 168);
        payload.put("current_year", s.getCurrentYear());
        payload.put("current_semester", s.getCurrentSemester());
        payload.put("overall_attendance", att.overallPercentage());
        payload.put("subjects", subjects);
        payload.put("skills", skills);
        return payload;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> riskFor(Long studentId) {
        Student s = studentRepo.findById(studentId).orElseThrow();
        Map<String, Object> fallback = Map.of(
                "risk_score", 0, "band", "UNKNOWN",
                "factors", List.of(), "note", "Scoring service unavailable");
        return ml.post("/risk-score", featuresFor(s), fallback);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> readinessFor(Long studentId) {
        Student s = studentRepo.findById(studentId).orElseThrow();
        Map<String, Object> fallback = Map.of(
                "overall", 0, "skills", Map.of(), "weakest_skill", "",
                "note", "Scoring service unavailable");
        return ml.post("/placement-readiness", featuresFor(s), fallback);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> recommendationsFor(Long studentId) {
        Student s = studentRepo.findById(studentId).orElseThrow();
        Map<String, Object> fallback = Map.of("recommendations", List.of());
        return ml.post("/recommendations", featuresFor(s), fallback);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> chat(Long studentId, String role, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("role", role);
        body.put("message", message);
        if (studentId != null) {
            body.put("context", featuresFor(studentRepo.findById(studentId).orElseThrow()));
        }
        Map<String, Object> fallback = Map.of(
                "reply", "The assistant is offline right now. Your dashboards are still up to date.",
                "suggestions", List.of());
        return ml.post("/chat", body, fallback);
    }
}
