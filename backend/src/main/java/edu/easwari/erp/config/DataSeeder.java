package edu.easwari.erp.config;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.MarksService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Seeds a demonstrable institution: three departments, six sections,
 * roughly 100 students, a full semester of period-level attendance,
 * published marks, and a placement pipeline.
 *
 * Seeded RNG — every run produces the same institution, so a demo is
 * repeatable and screenshots stay valid.
 */
@Component @RequiredArgsConstructor @Slf4j
@ConditionalOnExpression("'${app.seed.enabled:true}' == 'true' and '${app.seed.mode:full}' == 'full'")
public class DataSeeder implements CommandLineRunner {

    private static final Random RNG = new Random(20260808L);
    private static final String[] PERIOD_TIMES = {"08:45", "09:40", "10:45", "11:40", "13:30", "14:25", "15:20"};

    private final UserRepo userRepo;
    private final DepartmentRepo departmentRepo;
    private final ProgramRepo programRepo;
    private final ClassSectionRepo sectionRepo;
    private final SubjectRepo subjectRepo;
    private final FacultyRepo facultyRepo;
    private final StudentRepo studentRepo;
    private final SubjectOfferingRepo offeringRepo;
    private final TimetableSlotRepo slotRepo;
    private final AttendanceRepo attendanceRepo;
    private final AssessmentRepo assessmentRepo;
    private final MarkRepo markRepo;
    private final CompanyRepo companyRepo;
    private final InternshipRepo internshipRepo;
    private final SkillScoreRepo skillRepo;
    private final PasswordEncoder encoder;
    private final MarksService marksService;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepo.count() > 0) {
            log.info("Database already populated — skipping seed.");
            return;
        }
        log.info("Seeding Easwari Engineering College demonstration data...");

        createAdmin();
        List<Department> departments = createDepartments();
        Map<String, Program> programs = createPrograms(departments);
        Map<String, List<Subject>> subjects = createSubjects(departments);
        Map<String, List<Faculty>> faculty = createFaculty(departments);
        List<ClassSection> sections = createSections(programs);

        int studentCount = 0;
        for (ClassSection section : sections) {
            String deptCode = section.getProgram().getDepartment().getCode();
            List<SubjectOffering> offerings =
                    createOfferings(section, subjects.get(deptCode), faculty.get(deptCode));
            createTimetable(offerings);
            List<Student> students = createStudents(section, faculty.get(deptCode));
            studentCount += students.size();
            generateAttendance(section, offerings, students);
            generateMarks(offerings, students);
            students.forEach(marksService::recomputeCgpa);
            students.forEach(this::seedSkills);
        }

        createPlacementPipeline();
        log.info("Seed complete: {} departments, {} sections, {} students, {} attendance records.",
                departments.size(), sections.size(), studentCount, attendanceRepo.count());
        log.info("Sign in with — admin / Admin@123 · CSE23001 / Student@123 · EEC-CSE001 / Faculty@123");
    }

    /* ─────────────── org structure ─────────────── */

    private void createAdmin() {
        User u = userRepo.save(User.builder()
                .username("admin").passwordHash(encoder.encode("Admin@123"))
                .role(Role.ADMIN).active(true).build());
        log.info("Administrator account created (id {})", u.getId());
    }

    private List<Department> createDepartments() {
        return List.of(
                departmentRepo.save(Department.builder().code("CSE")
                        .name("Computer Science & Engineering").hodName("Dr. R. Lakshmi").build()),
                departmentRepo.save(Department.builder().code("ECE")
                        .name("Electronics & Communication Engineering").hodName("Dr. V. Ganesan").build()),
                departmentRepo.save(Department.builder().code("IT")
                        .name("Information Technology").hodName("Dr. S. Priya").build()));
    }

    private Map<String, Program> createPrograms(List<Department> departments) {
        Map<String, Program> map = new LinkedHashMap<>();
        for (Department d : departments) {
            map.put(d.getCode(), programRepo.save(Program.builder()
                    .code("BE-" + d.getCode())
                    .name("B.E. " + d.getName())
                    .department(d)
                    .durationYears(4)
                    .totalCreditsRequired(168)
                    .semestersPerYear(2)
                    .build()));
        }
        return map;
    }

    private Map<String, List<Subject>> createSubjects(List<Department> departments) {
        Map<String, String[][]> catalogue = Map.of(
                "CSE", new String[][]{
                        {"CS8591", "Computer Networks", "3"},
                        {"CS8492", "Database Management Systems", "4"},
                        {"CS8451", "Design & Analysis of Algorithms", "4"},
                        {"CS8493", "Operating Systems", "3"},
                        {"CS8601", "Machine Learning", "3"},
                        {"CS8611", "Mini Project Laboratory", "2"}},
                "ECE", new String[][]{
                        {"EC8552", "Computer Architecture", "3"},
                        {"EC8491", "Communication Theory", "4"},
                        {"EC8451", "Electromagnetic Fields", "4"},
                        {"EC8453", "Linear Integrated Circuits", "3"},
                        {"EC8562", "Digital Signal Processing", "3"},
                        {"EC8611", "Communication Laboratory", "2"}},
                "IT", new String[][]{
                        {"IT8501", "Web Technology", "3"},
                        {"IT8502", "Software Engineering", "4"},
                        {"IT8503", "Data Warehousing & Mining", "4"},
                        {"IT8504", "Cloud Computing", "3"},
                        {"IT8505", "Cryptography & Network Security", "3"},
                        {"IT8511", "Application Development Laboratory", "2"}});

        Map<String, List<Subject>> map = new LinkedHashMap<>();
        for (Department d : departments) {
            List<Subject> list = new ArrayList<>();
            for (String[] row : catalogue.get(d.getCode())) {
                list.add(subjectRepo.save(Subject.builder()
                        .code(row[0]).name(row[1]).credits(Integer.parseInt(row[2]))
                        .semester(6).department(d)
                        .laboratory(row[1].toLowerCase().contains("laborator"))
                        .build()));
            }
            map.put(d.getCode(), list);
        }
        return map;
    }

    private Map<String, List<Faculty>> createFaculty(List<Department> departments) {
        String[] names = {"Prof. Marcus Lin", "Dr. S. Meena", "Prof. R. Anand",
                          "Prof. K. Vasanth", "Dr. A. Krishnan", "Prof. D. Kavitha"};
        Map<String, List<Faculty>> map = new LinkedHashMap<>();
        int n = 1;
        for (Department d : departments) {
            List<Faculty> list = new ArrayList<>();
            for (String name : names) {
                String code = "EEC-" + d.getCode() + String.format("%03d", n++);
                User u = userRepo.save(User.builder()
                        .username(code).passwordHash(encoder.encode("Faculty@123"))
                        .role(Role.FACULTY).active(true).build());
                list.add(facultyRepo.save(Faculty.builder()
                        .user(u).staffCode(code).name(name)
                        .email(code.toLowerCase() + "@easwari.edu.in")
                        .designation("Assistant Professor").department(d).build()));
            }
            map.put(d.getCode(), list);
        }
        return map;
    }

    private List<ClassSection> createSections(Map<String, Program> programs) {
        List<ClassSection> sections = new ArrayList<>();
        for (Program p : programs.values()) {
            for (String sec : new String[]{"A", "B"}) {
                sections.add(sectionRepo.save(ClassSection.builder()
                        .program(p).year(3).semester(6).section(sec).academicYear("2025-26").build()));
            }
        }
        return sections;
    }

    private List<SubjectOffering> createOfferings(ClassSection section, List<Subject> subjects, List<Faculty> faculty) {
        List<SubjectOffering> offerings = new ArrayList<>();
        for (int i = 0; i < subjects.size(); i++) {
            offerings.add(offeringRepo.save(SubjectOffering.builder()
                    .subject(subjects.get(i)).classSection(section)
                    .faculty(faculty.get(i % faculty.size()))
                    .academicYear("2025-26").build()));
        }
        return offerings;
    }

    /** Seven periods a day, Monday to Friday — 35 slots per section. */
    private void createTimetable(List<SubjectOffering> offerings) {
        int[][] weekPattern = {
                {0, 1, 2, 3, 4, 5, 5},
                {2, 0, 4, 1, 3, 0, 2},
                {1, 4, 0, 2, 5, 5, 3},
                {3, 2, 1, 4, 0, 2, 1},
                {4, 3, 2, 0, 1, 3, 4}};

        for (int day = 1; day <= 5; day++) {
            for (int period = 1; period <= 7; period++) {
                SubjectOffering off = offerings.get(weekPattern[day - 1][period - 1]);
                slotRepo.save(TimetableSlot.builder()
                        .subjectOffering(off).dayOfWeek(day).period(period)
                        .startTime(PERIOD_TIMES[period - 1])
                        .room(off.getSubject().isLaboratory()
                                ? "Lab-" + (day % 3 + 1)
                                : "LH-" + (200 + day * 2))
                        .build());
            }
        }
    }

    /* ─────────────── people ─────────────── */

    private static final String[] FIRST = {"Priya", "Arjun", "Sara", "Devon", "Kavya", "Rahul", "Meera", "Vikram",
            "Ananya", "Karthik", "Divya", "Sanjay", "Nithya", "Aravind", "Shreya", "Gopal", "Lakshmi", "Rohan",
            "Deepa", "Suresh", "Anjali", "Manoj", "Swathi", "Hari", "Pooja", "Naveen", "Ramya", "Vishal",
            "Sneha", "Aditya", "Bhavana", "Krishna", "Malini", "Prakash"};
    private static final String[] LAST = {"Nair", "Mehta", "Iqbal", "Reyes", "Rao", "Sharma", "Krishnan", "Patel",
            "Menon", "Subramanian", "Reddy", "Pillai", "Varma", "Chandran", "Balaji", "Joseph"};

    private List<Student> createStudents(ClassSection section, List<Faculty> faculty) {
        String deptCode = section.getProgram().getDepartment().getCode();
        int base = section.getSection().equals("A") ? 1 : 51;
        int count = 17;                      // 17 x 2 sections x 3 depts ≈ 102 per year-group
        List<Student> students = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            String roll = deptCode + "23" + String.format("%03d", base + i);
            String name = FIRST[RNG.nextInt(FIRST.length)] + " " + LAST[RNG.nextInt(LAST.length)];

            User u = userRepo.save(User.builder()
                    .username(roll).passwordHash(encoder.encode("Student@123"))
                    .role(Role.STUDENT).active(true).build());

            students.add(studentRepo.save(Student.builder()
                    .user(u).rollNo(roll).regNo("7311223" + String.format("%05d", base + i))
                    .name(name)
                    .email(roll.toLowerCase() + "@easwari.edu.in")
                    .phone("+91 98" + String.format("%08d", RNG.nextInt(100000000)))
                    .program(section.getProgram()).classSection(section)
                    .batchStartYear(2023).currentYear(3).currentSemester(6)
                    .mentor(faculty.get(i % faculty.size()))
                    .hostelBlock(i % 3 == 0 ? "Kaveri Block · Room " + (200 + i) : null)
                    .bloodGroup(new String[]{"O+", "A+", "B+", "AB+", "O-"}[RNG.nextInt(5)])
                    .build()));
        }
        return students;
    }

    /* ─────────────── activity ─────────────── */

    /** A full semester of period-level records: Jan to Jul, weekdays only. */
    private void generateAttendance(ClassSection section, List<SubjectOffering> offerings, List<Student> students) {
        Map<Long, List<TimetableSlot>> slotsByDay = new HashMap<>();
        for (int day = 1; day <= 5; day++) {
            slotsByDay.put((long) day,
                    slotRepo.findBySubjectOfferingClassSectionIdAndDayOfWeekOrderByPeriodAsc(section.getId(), day));
        }

        // Each student gets a personal diligence factor, so cohorts look real.
        Map<Long, Double> diligence = new HashMap<>();
        for (Student s : students) diligence.put(s.getId(), 0.80 + RNG.nextDouble() * 0.19);

        LocalDate start = LocalDate.of(2026, 4, 6);
        LocalDate end = LocalDate.of(2026, 8, 7);
        List<AttendanceRecord> batch = new ArrayList<>();

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            int dow = date.getDayOfWeek().getValue();
            if (dow > 5) continue;                                   // weekends off
            List<TimetableSlot> slots = slotsByDay.get((long) dow);
            if (slots == null) continue;

            for (TimetableSlot slot : slots) {
                for (Student s : students) {
                    double p = diligence.get(s.getId());
                    AttendanceStatus status;
                    double roll = RNG.nextDouble();
                    if (roll < p) status = AttendanceStatus.PRESENT;
                    else if (roll < p + 0.06) status = AttendanceStatus.ABSENT;
                    else if (roll < p + 0.09) status = AttendanceStatus.OD;
                    else if (roll < p + 0.11) status = AttendanceStatus.MEDICAL;
                    else status = AttendanceStatus.ABSENT;

                    batch.add(AttendanceRecord.builder()
                            .student(s).subjectOffering(slot.getSubjectOffering())
                            .classDate(date).period(slot.getPeriod())
                            .status(status).markedBy(slot.getSubjectOffering().getFaculty())
                            .build());
                }
                if (batch.size() >= 2000) { flushBatch(batch); }
            }
        }
        if (!batch.isEmpty()) flushBatch(batch);
    }

    /**
     * Write the batch, then detach it. Without the clear() the persistence
     * context would hold every one of the ~64,000 records at once.
     */
    private void flushBatch(List<AttendanceRecord> batch) {
        attendanceRepo.saveAll(batch);
        entityManager.flush();
        entityManager.clear();
        batch.clear();
    }

    private void generateMarks(List<SubjectOffering> offerings, List<Student> students) {
        for (SubjectOffering off : offerings) {
            for (AssessmentType type : new AssessmentType[]{AssessmentType.IA1, AssessmentType.IA2}) {
                Assessment a = assessmentRepo.save(Assessment.builder()
                        .subjectOffering(off).type(type).maxMarks(30)
                        .published(true).publishedAt(java.time.Instant.now())
                        .createdAt(java.time.Instant.now()).build());

                List<Mark> marks = new ArrayList<>();
                for (Student s : students) {
                    // IA2 trends slightly above IA1 — students improve across a semester.
                    int floor = type == AssessmentType.IA1 ? 15 : 17;
                    double score = floor + RNG.nextInt(30 - floor + 1);
                    marks.add(Mark.builder().assessment(a).student(s).score(score).build());
                }
                markRepo.saveAll(marks);
            }
        }
    }

    private void seedSkills(Student s) {
        String[] skills = {"CODING", "APTITUDE", "COMMUNICATION", "TECHNICAL", "PROJECTS", "INTERVIEW"};
        for (String skill : skills) {
            skillRepo.save(SkillScore.builder()
                    .student(s).skill(skill).score(45 + RNG.nextInt(50)).build());
        }
    }

    private void createPlacementPipeline() {
        companyRepo.saveAll(List.of(
                Company.builder().name("InfyNova Systems").jobRole("Software Engineer Intern").ctc("₹8.5 LPA")
                        .minCgpa(7.5).minAttendance(75).eligibleDepartments("CSE,IT").maxStandingArrears(0)
                        .applicationDeadline(LocalDate.of(2026, 8, 20)).driveDate(LocalDate.of(2026, 9, 2))
                        .description("Campus hiring for the platform engineering group.").build(),
                Company.builder().name("Quantum Byte Labs").jobRole("Backend Developer").ctc("₹12 LPA")
                        .minCgpa(8.0).minAttendance(80).eligibleDepartments("CSE,IT")
                        .applicationDeadline(LocalDate.of(2026, 8, 24)).build(),
                Company.builder().name("Northwind Analytics").jobRole("Data Analyst").ctc("₹7.2 LPA")
                        .minCgpa(7.0).minAttendance(75).eligibleDepartments("ALL")
                        .applicationDeadline(LocalDate.of(2026, 8, 28)).build(),
                Company.builder().name("Vertex Cloud Co.").jobRole("Cloud Support Engineer").ctc("₹6.8 LPA")
                        .minCgpa(6.5).minAttendance(85).eligibleDepartments("ALL")
                        .applicationDeadline(LocalDate.of(2026, 9, 2)).build(),
                Company.builder().name("Meridian Semiconductors").jobRole("VLSI Design Trainee").ctc("₹9.4 LPA")
                        .minCgpa(7.5).minAttendance(78).eligibleDepartments("ECE")
                        .applicationDeadline(LocalDate.of(2026, 9, 8)).build()));

        internshipRepo.saveAll(List.of(
                Internship.builder().title("Summer Software Internship").organisation("InfyNova Systems")
                        .duration("8 weeks").stipend("₹25,000/mo").mode("On-site · Bengaluru")
                        .eligibleDepartments("CSE,IT").applicationDeadline(LocalDate.of(2026, 8, 20)).build(),
                Internship.builder().title("Data Analytics Internship").organisation("Northwind Analytics")
                        .duration("10 weeks").stipend("₹20,000/mo").mode("Hybrid · Chennai")
                        .eligibleDepartments("ALL").applicationDeadline(LocalDate.of(2026, 8, 28)).build(),
                Internship.builder().title("Cloud Infrastructure Internship").organisation("Vertex Cloud Co.")
                        .duration("6 weeks").stipend("₹18,000/mo").mode("Remote")
                        .eligibleDepartments("ALL").applicationDeadline(LocalDate.of(2026, 9, 5)).build(),
                Internship.builder().title("RF Systems Internship").organisation("Meridian Semiconductors")
                        .duration("8 weeks").stipend("₹22,000/mo").mode("On-site · Hyderabad")
                        .eligibleDepartments("ECE").applicationDeadline(LocalDate.of(2026, 9, 12)).build()));
    }
}
