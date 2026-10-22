package edu.easwari.erp.excel;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.AdminService;
import edu.easwari.erp.service.AttendanceService;
import edu.easwari.erp.service.Dtos.*;
import edu.easwari.erp.service.MarksService;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

/**
 * Spreadsheets in and out. Registrars work in Excel, so bulk provisioning and
 * every report round-trips through xlsx even though the store is relational.
 */
@Service @RequiredArgsConstructor
public class ExcelService {

    private final AdminService adminService;
    private final StudentRepo studentRepo;
    private final AttendanceService attendanceService;
    private final MarksService marksService;

    /* ─────────────── Import ─────────────── */

    /**
     * Expected header row: username | name | role | email | phone |
     * departmentCode | programCode | section | year | semester
     */
    // Deliberately not @Transactional: each row commits in its own transaction
    // (inside createUser), so one bad row is skipped instead of rolling back the file.
    @SneakyThrows
    public ImportResult importUsers(User actor, MultipartFile file) {
        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();
        List<Credential> credentials = new ArrayList<>();

        try (InputStream in = file.getInputStream(); Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            Map<String, Integer> cols = headerIndex(sheet.getRow(0));

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                String username = str(row, cols.get("username"));
                if (username.isBlank()) continue;

                try {
                    UserSummary made = adminService.createUser(actor, new CreateUserRequest(
                            username,
                            orDefault(str(row, cols.get("role")), "STUDENT"),
                            str(row, cols.get("name")),
                            str(row, cols.get("email")),
                            str(row, cols.get("phone")),
                            str(row, cols.get("departmentcode")),
                            str(row, cols.get("programcode")),
                            str(row, cols.get("section")),
                            intOrNull(row, cols.get("year")),
                            intOrNull(row, cols.get("semester")),
                            str(row, cols.get("staffcode")),
                            str(row, cols.get("designation")),
                            null));
                    credentials.add(new Credential(made.username(), made.name(), made.initialPassword()));
                    created++;
                } catch (Exception ex) {
                    skipped++;
                    errors.add("Row " + (r + 1) + " (" + username + "): " + rootMessage(ex));
                }
            }
        }
        return new ImportResult(created, skipped, errors, credentials);
    }

    /* ─────────────── Export ─────────────── */

    @SneakyThrows
    @Transactional(readOnly = true)
    public byte[] attendanceWorkbook(Long studentId) {
        Student student = studentRepo.findById(studentId).orElseThrow();
        AttendanceView view = attendanceService.viewFor(studentId, null);

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle head = headerStyle(wb);

            Sheet summary = wb.createSheet("Summary");
            writeRow(summary, 0, head, "Easwari Engineering College — Attendance Statement");
            writeRow(summary, 1, null, "Student", student.getName());
            writeRow(summary, 2, null, "Roll number", student.getRollNo());
            writeRow(summary, 3, null, "Overall attendance", view.overallPercentage() + "%");
            writeRow(summary, 4, null, "Periods conducted", String.valueOf(view.conducted()));
            writeRow(summary, 5, null, "Periods attended", String.valueOf(view.attended()));

            Sheet bySubject = wb.createSheet("By subject");
            writeRow(bySubject, 0, head, "Code", "Subject", "Credits", "Conducted", "Attended", "Percentage", "Eligible");
            int r = 1;
            for (SubjectAttendance s : view.subjects()) {
                writeRow(bySubject, r++, null, s.subjectCode(), s.subjectName(),
                        String.valueOf(s.credits()), String.valueOf(s.conducted()),
                        String.valueOf(s.attended()), s.percentage() + "%", s.eligible() ? "Yes" : "No");
            }
            autoSize(bySubject, 7);

            Sheet register = wb.createSheet("Register");
            writeRow(register, 0, head, "Date", "Period", "Subject code", "Subject", "Status");
            r = 1;
            for (AttendanceCell c : view.cells()) {
                writeRow(register, r++, null, c.date(), String.valueOf(c.period()),
                        c.subjectCode(), c.subjectName(), c.status());
            }
            autoSize(register, 5);

            wb.write(out);
            return out.toByteArray();
        }
    }

    @SneakyThrows
    @Transactional(readOnly = true)
    public byte[] marksWorkbook(Long studentId) {
        Student student = studentRepo.findById(studentId).orElseThrow();
        MarksView view = marksService.viewFor(studentId);

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle head = headerStyle(wb);
            Sheet sheet = wb.createSheet("Internal marks");

            writeRow(sheet, 0, head, "Easwari Engineering College — Internal Assessment Record");
            writeRow(sheet, 1, null, student.getName() + " (" + student.getRollNo() + ")");
            writeRow(sheet, 2, null, "CGPA", String.valueOf(view.cgpa()),
                    "Credits", view.creditsEarned() + " of " + view.creditsRequired());

            writeRow(sheet, 4, head, "Code", "Subject", "Credits", "IA1", "IA2", "Average", "Grade");
            int r = 5;
            for (SubjectMarks m : view.subjects()) {
                writeRow(sheet, r++, null, m.subjectCode(), m.subjectName(), String.valueOf(m.credits()),
                        m.ia1() == null ? "" : String.valueOf(m.ia1()),
                        m.ia2() == null ? "" : String.valueOf(m.ia2()),
                        m.averagePercentage() == null ? "" : m.averagePercentage() + "%", m.grade());
            }
            autoSize(sheet, 7);
            wb.write(out);
            return out.toByteArray();
        }
    }

    /** Blank template so the office knows exactly which columns to fill. */
    @SneakyThrows
    public byte[] userImportTemplate() {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Users");
            writeRow(sheet, 0, headerStyle(wb), "username", "name", "role", "email", "phone",
                    "departmentCode", "programCode", "section", "year", "semester", "staffCode", "designation");
            writeRow(sheet, 1, null, "CSE23200", "Anitha Raman", "STUDENT", "anitha@easwari.edu.in",
                    "9840000000", "CSE", "BE-CSE", "A", "3", "5", "", "");
            writeRow(sheet, 2, null, "s.kumar@easwari.edu.in", "Prof. S Kumar", "FACULTY",
                    "s.kumar@easwari.edu.in", "9840000001", "CSE", "", "", "", "", "EEC-F210", "Assistant Professor");
            autoSize(sheet, 12);
            wb.write(out);
            return out.toByteArray();
        }
    }

    /* ─────────────── helpers ─────────────── */

    private Map<String, Integer> headerIndex(Row header) {
        Map<String, Integer> map = new HashMap<>();
        if (header == null) return map;
        for (int c = 0; c < header.getLastCellNum(); c++) {
            Cell cell = header.getCell(c);
            if (cell != null) {
                map.put(cell.getStringCellValue().trim().toLowerCase().replace(" ", ""), c);
            }
        }
        return map;
    }

    private String str(Row row, Integer idx) {
        if (idx == null) return "";
        Cell cell = row.getCell(idx);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private Integer intOrNull(Row row, Integer idx) {
        String v = str(row, idx);
        try { return v.isBlank() ? null : Integer.parseInt(v); }
        catch (NumberFormatException e) { return null; }
    }

    private String orDefault(String v, String fallback) { return v == null || v.isBlank() ? fallback : v; }

    private String rootMessage(Throwable ex) {
        Throwable t = ex;
        while (t.getCause() != null) t = t.getCause();
        return t.getMessage() == null ? ex.getClass().getSimpleName() : t.getMessage();
    }

    private CellStyle headerStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private void writeRow(Sheet sheet, int rowIdx, CellStyle style, String... values) {
        Row row = sheet.createRow(rowIdx);
        for (int i = 0; i < values.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(values[i]);
            if (style != null) cell.setCellStyle(style);
        }
    }

    private void autoSize(Sheet sheet, int columns) {
        for (int i = 0; i < columns; i++) sheet.autoSizeColumn(i);
    }
}
