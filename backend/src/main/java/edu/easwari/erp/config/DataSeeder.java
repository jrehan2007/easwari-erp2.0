package edu.easwari.erp.config;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.MarksService;
import edu.easwari.erp.service.TempPasswords;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.*;
import java.time.*;
import java.util.*;

/**
 * Seeds a complete, populated college for presentations (SEED_MODE=full on an
 * empty database): five departments, each with an HOD and four faculty, two
 * second-year classes per department with a coordinator, timetable and
 * subject teachers, 5–7 students per class, a semester of period-level
 * attendance, published internal and practical marks, two semesters of
 * university results, fee statements, leave and campus-service requests.
 *
 * A fixed RNG seed makes every run produce the same college. Each account gets
 * a random password; all of them are written to data/seed-credentials.csv.
 */
@Component @RequiredArgsConstructor @Slf4j
@ConditionalOnExpression("'${app.seed.enabled:true}' == 'true' and '${app.seed.mode:full}' == 'full'")
public class DataSeeder implements CommandLineRunner {

    private static final Random RNG = new Random(20261022L);
    private static final String[] PERIOD_TIMES = {"08:45", "09:40", "10:45", "11:40", "13:30", "14:25", "15:20"};
    private static final String ACADEMIC_YEAR = "2026-27";
    private static final LocalDate TERM_START = LocalDate.of(2026, 7, 13);
    private static final Set<LocalDate> HOLIDAYS = Set.of(
            LocalDate.of(2026, 9, 14), LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 19), LocalDate.of(2026, 10, 20));

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
    private final FeeItemRepo feeRepo;
    private final UniversityResultRepo resultRepo;
    private final LeaveApplicationRepo leaveRepo;
    private final CmsRequestRepo cmsRepo;
    private final PasswordEncoder encoder;
    private final MarksService marksService;

    @PersistenceContext
    private EntityManager entityManager;

    private final List<String[]> credentials = new ArrayList<>();

    /* ─────────────── The college, as data ─────────────── */

    /** code, name, programme code, programme name, HOD + four faculty, sections. */
    private record DeptSpec(String code, String name, String programCode, String programName,
                            String[][] faculty, String[] sections, String[][] subjects) {}

    // Faculty rows: name, designation. Row 0 is the HOD.
    // Subject rows: code, name, credits, kind (T theory, L lab, C coding practice, M mentoring), teacher index.
    private static final List<DeptSpec> DEPARTMENTS = List.of(
            new DeptSpec("CSE", "Computer Science and Engineering", "BECSE", "B.E. Computer Science and Engineering",
                    new String[][]{{"Dr. R. Lakshmi Priya", "Professor & Head"}, {"Mr. Arun Prakash", "Assistant Professor"},
                            {"Dr. Meena Sundaram", "Associate Professor"}, {"Ms. Kavitha Rajan", "Assistant Professor"},
                            {"Mr. Vignesh Kumar", "Assistant Professor"}},
                    new String[]{"D", "E"},
                    new String[][]{{"CS3301", "Advanced Data Structures and Algorithms", "3", "T", "2"},
                            {"CS3591", "Computer Networks", "3", "T", "1"},
                            {"CS3391", "Object Oriented Programming", "3", "T", "3"},
                            {"MA3354", "Discrete Mathematics", "4", "T", "0"},
                            {"CS3351", "Digital Principles and Computer Organization", "4", "T", "4"},
                            {"CS3311", "Data Structures Laboratory", "2", "L", "2"},
                            {"CS3381", "Object Oriented Programming Laboratory", "2", "L", "3"},
                            {"CS3010", "Coding Practice (LeetCode)", "0", "C", "4"},
                            {"CS3020", "Counselling and Mentoring", "0", "M", "3"}}),
            new DeptSpec("IT", "Information Technology", "BTIT", "B.Tech. Information Technology",
                    new String[][]{{"Dr. Hukum", "Professor & Head"}, {"Ms. Divya Bharathi", "Assistant Professor"},
                            {"Mr. Karthik Raja", "Assistant Professor"}, {"Dr. Nandhini Selvam", "Associate Professor"},
                            {"Mr. Pradeep Anand", "Assistant Professor"}},
                    new String[]{"A", "B"},
                    new String[][]{{"IT3301", "Data Structures and Algorithms", "3", "T", "3"},
                            {"IT3352", "Database Management Systems", "3", "T", "1"},
                            {"IT3353", "Computer Networks", "3", "T", "2"},
                            {"MA3355", "Discrete Mathematics", "4", "T", "0"},
                            {"IT3354", "Web Essentials", "3", "T", "4"},
                            {"IT3311", "Database Management Systems Laboratory", "2", "L", "1"},
                            {"IT3312", "Web Essentials Laboratory", "2", "L", "4"},
                            {"IT3010", "Coding Practice (LeetCode)", "0", "C", "2"},
                            {"IT3020", "Counselling and Mentoring", "0", "M", "3"}}),
            new DeptSpec("AIDS", "Artificial Intelligence and Data Science", "BTAIDS", "B.Tech. Artificial Intelligence and Data Science",
                    new String[][]{{"Dr. S. Meenakshi", "Professor & Head"}, {"Mr. Harish Babu", "Assistant Professor"},
                            {"Ms. Swetha Ramesh", "Assistant Professor"}, {"Dr. Ashok Kumar", "Associate Professor"},
                            {"Ms. Janani Murali", "Assistant Professor"}},
                    new String[]{"A", "B"},
                    new String[][]{{"AD3351", "Design and Analysis of Algorithms", "4", "T", "3"},
                            {"AD3391", "Database Design and Management", "3", "T", "1"},
                            {"AD3301", "Data Exploration and Visualization", "4", "T", "2"},
                            {"MA3351", "Probability and Statistics", "4", "T", "0"},
                            {"AL3391", "Artificial Intelligence", "3", "T", "4"},
                            {"AD3381", "Database Design and Management Laboratory", "2", "L", "1"},
                            {"AD3311", "Artificial Intelligence Laboratory", "2", "L", "4"},
                            {"AD3010", "Coding Practice (LeetCode)", "0", "C", "2"},
                            {"AD3020", "Counselling and Mentoring", "0", "M", "3"}}),
            new DeptSpec("ECE", "Electronics and Communication Engineering", "BEECE", "B.E. Electronics and Communication Engineering",
                    new String[][]{{"Dr. V. Ganesan", "Professor & Head"}, {"Ms. Revathi Sekar", "Assistant Professor"},
                            {"Mr. Sathish Kumar", "Assistant Professor"}, {"Dr. Padma Venkat", "Associate Professor"},
                            {"Mr. Dinesh Babu", "Assistant Professor"}},
                    new String[]{"A", "B"},
                    new String[][]{{"EC3354", "Signals and Systems", "4", "T", "3"},
                            {"EC3353", "Electronic Devices and Circuits", "3", "T", "1"},
                            {"EC3352", "Digital Systems Design", "4", "T", "2"},
                            {"MA3357", "Random Processes and Linear Algebra", "4", "T", "0"},
                            {"EC3351", "Control Systems", "3", "T", "4"},
                            {"EC3361", "Electronic Devices and Circuits Laboratory", "2", "L", "1"},
                            {"EC3311", "Digital Systems Laboratory", "2", "L", "2"},
                            {"EC3010", "Technical Skill Practice", "0", "C", "4"},
                            {"EC3020", "Counselling and Mentoring", "0", "M", "3"}}),
            new DeptSpec("MECH", "Mechanical Engineering", "BEMECH", "B.E. Mechanical Engineering",
                    new String[][]{{"Dr. K. Senthil Kumar", "Professor & Head"}, {"Mr. Ramesh Babu", "Assistant Professor"},
                            {"Mr. Gokul Nath", "Assistant Professor"}, {"Dr. Uma Maheswari", "Associate Professor"},
                            {"Mr. Saravanan Mani", "Assistant Professor"}},
                    new String[]{"A", "B"},
                    new String[][]{{"ME3351", "Engineering Mechanics", "3", "T", "3"},
                            {"ME3391", "Engineering Thermodynamics", "3", "T", "1"},
                            {"ME3392", "Engineering Materials and Metallurgy", "3", "T", "2"},
                            {"MA3358", "Transforms and Partial Differential Equations", "4", "T", "0"},
                            {"ME3393", "Manufacturing Processes", "3", "T", "4"},
                            {"ME3381", "Computer Aided Machine Drawing Laboratory", "2", "L", "1"},
                            {"ME3382", "Manufacturing Technology Laboratory", "2", "L", "4"},
                            {"ME3010", "Design Skill Practice", "0", "C", "2"},
                            {"ME3020", "Counselling and Mentoring", "0", "M", "3"}}));

    /** Students per class: roll, full name. CSE E holds exactly five, Rehan first. */
    private static final Map<String, String[][]> STUDENTS = Map.of(
            "CSE-D", new String[][]{{"CSE201", "Aadhithya Krishnan"}, {"CSE202", "Bhavya Srinivasan"}, {"CSE203", "Charan Raj"},
                    {"CSE204", "Deepika Narayanan"}, {"CSE205", "Ezhilarasan M"}, {"CSE206", "Fathima Zahra"}},
            "CSE-E", new String[][]{{"CSE288", "Rehan J"}, {"CSE289", "Sanjay R"}, {"CSE290", "Aishwarya M"},
                    {"CSE291", "Harini Sundar"}, {"CSE292", "Mohammed Irfan"}},
            "IT-A", new String[][]{{"IT101", "Gayathri Devi"}, {"IT102", "Hariharan S"}, {"IT103", "Ishwarya K"},
                    {"IT104", "Jeevan Kumar"}, {"IT105", "Keerthana Ravi"}, {"IT106", "Lokesh Babu"}},
            "IT-B", new String[][]{{"IT151", "Madhumitha P"}, {"IT152", "Naveen Raj"}, {"IT153", "Oviya Shankar"},
                    {"IT154", "Prakash V"}, {"IT155", "Rithika Anand"}, {"IT156", "Santhosh Kumar"}, {"IT157", "Tharun Vel"}},
            "AIDS-A", new String[][]{{"AD101", "Akshaya Lakshmi"}, {"AD102", "Barath Kumar"}, {"AD103", "Dharshini R"},
                    {"AD104", "Gowtham S"}, {"AD105", "Janani Priya"}, {"AD106", "Kishore Kumar"}},
            "AIDS-B", new String[][]{{"AD151", "Monika Ravi"}, {"AD152", "Nithish Kumar"}, {"AD153", "Pavithra S"},
                    {"AD154", "Raghul M"}, {"AD155", "Sowmya Venkat"}},
            "ECE-A", new String[][]{{"EC101", "Abinaya Mohan"}, {"EC102", "Bharath Raj"}, {"EC103", "Divya Shree"},
                    {"EC104", "Ganesh Kumar"}, {"EC105", "Kavya Lakshmi"}, {"EC106", "Manikandan R"}, {"EC107", "Nandhini V"}},
            "ECE-B", new String[][]{{"EC151", "Pooja Sri"}, {"EC152", "Rahul Krishna"}, {"EC153", "Sangeetha M"},
                    {"EC154", "Tamilselvan K"}, {"EC155", "Vaishnavi R"}, {"EC156", "Yogesh Babu"}},
            "MECH-A", new String[][]{{"ME101", "Arjun Pandian"}, {"ME102", "Dhanush Kumar"}, {"ME103", "Hemanth Raj"},
                    {"ME104", "Karthikeyan S"}, {"ME105", "Mugilan V"}, {"ME106", "Praveen Kumar"}},
            "MECH-B", new String[][]{{"ME151", "Rajesh Kannan"}, {"ME152", "Sabarish M"}, {"ME153", "Surya Prakash"},
                    {"ME154", "Vasanth Kumar"}, {"ME155", "Vishnu Priya"}});

    /** Weekly grid for one class: index into [theory0..4, lab0, lab1, coding, mentoring]. */
    private static final int[][] WEEK = {
            {0, 1, 2, 3, 5, 5, 5},
            {1, 2, 4, 0, 3, 7, 7},
            {2, 3, 0, 4, 6, 6, 6},
            {3, 4, 1, 2, 0, 4, 8},
            {4, 0, 2, 1, 3, 4, 1}};

    private static final String[][] SEM1 = {
            {"HS3152", "Professional English - I", "3", "T"}, {"MA3151", "Matrices and Calculus", "4", "T"},
            {"PH3151", "Engineering Physics", "3", "T"}, {"CY3151", "Engineering Chemistry", "3", "T"},
            {"GE3151", "Problem Solving and Python Programming", "3", "T"}, {"GE3152", "Heritage of Tamils", "1", "T"},
            {"GE3171", "Problem Solving and Python Programming Laboratory", "2", "L"},
            {"BS3171", "Physics and Chemistry Laboratory", "2", "L"}, {"GE3172", "English Laboratory", "1", "L"}};
    private static final String[][] SEM2 = {
            {"HS3252", "Professional English - II", "2", "T"}, {"MA3251", "Statistics and Numerical Methods", "4", "T"},
            {"PH3256", "Physics for Information Science", "3", "T"}, {"BE3251", "Basic Electrical and Electronics Engineering", "3", "T"},
            {"GE3251", "Engineering Graphics", "4", "T"}, {"CS3251", "Programming in C", "3", "T"},
            {"GE3252", "Tamils and Technology", "1", "T"}, {"GE3271", "Engineering Practices Laboratory", "2", "L"},
            {"CS3271", "Programming in C Laboratory", "2", "L"}, {"GE3272", "Communication Laboratory - Foreign Language", "2", "L"}};

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepo.count() > 0) {
            log.info("Database already populated — skipping seed.");
            return;
        }
        log.info("Seeding Easwari Engineering College: departments, staff, classes and students...");

        userRepo.save(User.builder().username("admin").passwordHash(encoder.encode("Admin@123"))
                .role(Role.ADMIN).active(true).build());
        credentials.add(new String[]{"ADMIN", "admin", "Administrator", "", "Admin@123"});

        int studentCount = 0, sectionCount = 0;
        for (DeptSpec spec : DEPARTMENTS) {
            Department dept = departmentRepo.save(Department.builder().code(spec.code()).name(spec.name())
                    .hodName(spec.faculty()[0][0]).build());
            Program program = programRepo.save(Program.builder().code(spec.programCode()).name(spec.programName())
                    .department(dept).durationYears(4).semestersPerYear(2).totalCreditsRequired(165).build());
            List<Faculty> staff = createFaculty(dept, spec);
            List<Subject> subjects = createSubjects(dept, spec);

            for (int s = 0; s < spec.sections().length; s++) {
                String sec = spec.sections()[s];
                ClassSection section = sectionRepo.save(ClassSection.builder().program(program).year(2).semester(3)
                        .section(sec).academicYear(ACADEMIC_YEAR)
                        .coordinator(staff.get(s == 0 ? 1 : 3)).build());   // CSE-E: Ms. Kavitha Rajan
                sectionCount++;
                List<SubjectOffering> offerings = new ArrayList<>();
                for (int i = 0; i < subjects.size(); i++) {
                    offerings.add(offeringRepo.save(SubjectOffering.builder().subject(subjects.get(i))
                            .classSection(section).faculty(staff.get(Integer.parseInt(spec.subjects()[i][4])))
                            .academicYear(ACADEMIC_YEAR).build()));
                }
                createTimetable(offerings, s);
                List<Student> students = createStudents(spec, section, program, staff);
                studentCount += students.size();
                Map<Long, Double> ability = new HashMap<>();
                for (Student st : students) ability.put(st.getId(), abilityOf(st));
                generateAttendance(section, students, ability);
                generateMarks(offerings, students, ability);
                for (Student st : students) {
                    generateUniversityResults(st, ability.get(st.getId()));
                    generateFees(st);
                    seedSkills(st, ability.get(st.getId()));
                }
                generateRequests(section, students, staff);
                entityManager.flush();
                for (Student st : students) marksService.recomputeCgpa(studentRepo.findById(st.getId()).orElseThrow());
            }
        }
        createPlacementPipeline();
        writeCredentials();
        log.info("Seed complete: {} departments, {} classes, {} students, {} attendance records.",
                DEPARTMENTS.size(), sectionCount, studentCount, attendanceRepo.count());
    }

    /* ─────────────── people ─────────────── */

    private String newPassword(String role, String username, String name, String dept) {
        String pw = TempPasswords.generate();
        credentials.add(new String[]{role, username, name, dept, pw});
        return encoder.encode(pw);
    }

    private List<Faculty> createFaculty(Department dept, DeptSpec spec) {
        List<Faculty> list = new ArrayList<>();
        for (int i = 0; i < spec.faculty().length; i++) {
            String name = spec.faculty()[i][0];
            String code = "EEC-" + spec.code() + String.format("%02d", i + 1);
            User u = userRepo.save(User.builder().username(code)
                    .passwordHash(newPassword("FACULTY", code, name, spec.code()))
                    .role(Role.FACULTY).active(true).build());
            String mail = name.replaceAll("^(Dr|Mr|Ms|Mrs)\\.\\s*", "").replaceAll("[^A-Za-z ]", "").trim()
                    .toLowerCase(Locale.ROOT).replace(' ', '.') + "@easwari.edu.in";
            list.add(facultyRepo.save(Faculty.builder().user(u).staffCode(code).name(name).email(mail)
                    .designation(spec.faculty()[i][1]).department(dept).build()));
        }
        return list;
    }

    private List<Subject> createSubjects(Department dept, DeptSpec spec) {
        List<Subject> list = new ArrayList<>();
        for (String[] row : spec.subjects()) {
            list.add(subjectRepo.save(Subject.builder().code(row[0]).name(row[1]).credits(Integer.parseInt(row[2]))
                    .semester(3).department(dept).laboratory("L".equals(row[3])).build()));
        }
        return list;
    }

    private void createTimetable(List<SubjectOffering> offerings, int sectionIndex) {
        for (int day = 1; day <= 5; day++) {
            // The second class runs the same grid on a rotated week so labs don't collide.
            int[] row = WEEK[(day - 1 + sectionIndex * 2) % 5];
            for (int period = 1; period <= 7; period++) {
                SubjectOffering off = offerings.get(row[period - 1]);
                slotRepo.save(TimetableSlot.builder().subjectOffering(off).dayOfWeek(day).period(period)
                        .startTime(PERIOD_TIMES[period - 1])
                        .room(off.getSubject().isLaboratory() ? "Lab " + (300 + sectionIndex * 10 + day)
                                : "LH " + (200 + sectionIndex * 10 + day))
                        .build());
            }
        }
    }

    private static final String[] BLOOD = {"O+", "B+", "A+", "AB+", "O-", "B-"};
    private static final String[] BUS_ROUTES = {"Route 7 · Porur", "Route 12 · Tambaram", "Route 3 · Vadapalani",
            "Route 18 · Avadi", "Route 9 · Velachery"};

    private List<Student> createStudents(DeptSpec spec, ClassSection section, Program program, List<Faculty> staff) {
        String[][] rows = STUDENTS.get(spec.code() + "-" + section.getSection());
        List<Student> students = new ArrayList<>();
        for (int i = 0; i < rows.length; i++) {
            String roll = rows[i][0], name = rows[i][1];
            boolean rehan = "CSE288".equals(roll);
            User u = userRepo.save(User.builder().username(roll)
                    .passwordHash(newPassword("STUDENT", roll, name, spec.code() + " II-" + section.getSection()))
                    .role(Role.STUDENT).active(true).build());
            String first = name.split(" ")[0].toLowerCase(Locale.ROOT);
            boolean hosteller = !rehan && RNG.nextInt(3) == 0;
            students.add(studentRepo.save(Student.builder()
                    .user(u).rollNo(roll)
                    .regNo("3106251" + deptDigits(spec.code()) + roll.replaceAll("\\D", ""))
                    .name(name)
                    .email(first + "." + roll.toLowerCase(Locale.ROOT) + "@student.easwari.edu.in")
                    .phone(rehan ? "+91 98400 28828" : "+91 9" + String.format("%04d %05d", RNG.nextInt(10000), RNG.nextInt(100000)))
                    .program(program).classSection(section)
                    .batchStartYear(2025).currentYear(2).currentSemester(3)
                    .mentor(staff.get(1 + i % 4))
                    .hostelBlock(hosteller ? (i % 2 == 0 ? "Kaveri Block · Room " : "Vaigai Block · Room ") + (110 + RNG.nextInt(90)) : null)
                    .bloodGroup(rehan ? "B+" : BLOOD[RNG.nextInt(BLOOD.length)])
                    .build()));
        }
        return students;
    }

    private static String deptDigits(String code) {
        return switch (code) { case "CSE" -> "04"; case "IT" -> "05"; case "AIDS" -> "24"; case "ECE" -> "06"; default -> "14"; };
    }

    /** 0.55..0.97, fixed for a few people so the presentation has a clear top performer and a student at risk. */
    private double abilityOf(Student s) {
        return switch (s.getRollNo()) {
            case "CSE288" -> 0.89;           // Rehan: strong all-rounder
            case "CSE289" -> 0.80;           // Sanjay
            case "CSE292", "IT154", "EC154" -> 0.50;   // attendance and marks at risk
            default -> 0.64 + RNG.nextDouble() * 0.22;
        };
    }

    /* ─────────────── attendance ─────────────── */

    private void generateAttendance(ClassSection section, List<Student> students, Map<Long, Double> ability) {
        Map<Integer, List<TimetableSlot>> slotsByDay = new HashMap<>();
        for (int day = 1; day <= 5; day++) {
            slotsByDay.put(day, slotRepo.findBySubjectOfferingClassSectionIdAndDayOfWeekOrderByPeriodAsc(section.getId(), day));
        }
        LocalDate end = LocalDate.now(ZoneId.of("Asia/Kolkata")).minusDays(1);
        List<AttendanceRecord> batch = new ArrayList<>();
        for (LocalDate date = TERM_START; !date.isAfter(end); date = date.plusDays(1)) {
            int dow = date.getDayOfWeek().getValue();
            if (dow > 5 || HOLIDAYS.contains(date)) continue;
            for (Student s : students) {
                // A whole-day absence is likelier than scattered periods.
                double a = ability.get(s.getId());
                double presence = 0.45 + a * 0.5;
                boolean dayOff = RNG.nextDouble() > presence;
                for (TimetableSlot slot : slotsByDay.get(dow)) {
                    AttendanceStatus status;
                    if (dayOff) status = RNG.nextDouble() < 0.18 ? AttendanceStatus.MEDICAL : AttendanceStatus.ABSENT;
                    else {
                        double r = RNG.nextDouble();
                        status = r < 0.975 ? AttendanceStatus.PRESENT : r < 0.99 ? AttendanceStatus.OD : AttendanceStatus.ABSENT;
                    }
                    batch.add(AttendanceRecord.builder().student(s).subjectOffering(slot.getSubjectOffering())
                            .classDate(date).period(slot.getPeriod()).status(status)
                            .markedBy(slot.getSubjectOffering().getFaculty())
                            .markedAt(date.atTime(9 + slot.getPeriod(), 5).atZone(ZoneId.of("Asia/Kolkata")).toInstant())
                            .build());
                }
            }
            if (batch.size() >= 2000) flushBatch(batch);
        }
        if (!batch.isEmpty()) flushBatch(batch);
    }

    private void flushBatch(List<AttendanceRecord> batch) {
        attendanceRepo.saveAll(batch);
        entityManager.flush();
        entityManager.clear();
        batch.clear();
    }

    /* ─────────────── marks ─────────────── */

    private void generateMarks(List<SubjectOffering> offerings, List<Student> students, Map<Long, Double> ability) {
        for (SubjectOffering off : offerings) {
            Subject subj = off.getSubject();
            if (subj.getCredits() == 0) continue;                    // coding practice, mentoring
            Object[][] parts = subj.isLaboratory()
                    ? new Object[][]{{AssessmentType.LAB_OBSERVATION, 20}, {AssessmentType.LAB_RECORD, 20},
                                     {AssessmentType.LAB_MODEL_EXAM, 50}, {AssessmentType.LAB_VIVA, 10}}
                    : new Object[][]{{AssessmentType.IA1, 50}, {AssessmentType.IA2, 50},
                                     {AssessmentType.UNIT_TEST, 25}, {AssessmentType.ASSIGNMENT, 10}};
            double difficulty = 0.9 + RNG.nextDouble() * 0.12;
            for (Object[] p : parts) {
                AssessmentType type = (AssessmentType) p[0];
                int max = (Integer) p[1];
                Instant published = Instant.parse(type == AssessmentType.IA1 ? "2026-08-28T10:00:00Z" : "2026-10-09T10:00:00Z");
                Assessment a = assessmentRepo.save(Assessment.builder().subjectOffering(off).type(type).maxMarks(max)
                        .published(true).publishedAt(published).createdAt(published).build());
                List<Mark> marks = new ArrayList<>();
                for (Student s : students) {
                    double base = ability.get(s.getId()) * difficulty + (RNG.nextDouble() - 0.5) * 0.16
                            + (type == AssessmentType.IA2 ? 0.03 : 0) + (type.isPractical() ? 0.05 : 0);
                    double score = Math.round(Math.max(0.25, Math.min(1.0, base)) * max * 2) / 2.0;
                    marks.add(Mark.builder().assessment(a).student(s).score(score).build());
                }
                markRepo.saveAll(marks);
            }
        }
        // The model examination is written but not yet released: shows the publish gate.
        for (SubjectOffering off : offerings) {
            if (off.getSubject().getCredits() == 0 || off.getSubject().isLaboratory()) continue;
            Assessment draft = assessmentRepo.save(Assessment.builder().subjectOffering(off).type(AssessmentType.MODEL_EXAM)
                    .maxMarks(100).published(false).createdAt(Instant.now()).build());
            for (Student s : students) {
                double score = Math.round(Math.min(1.0, ability.get(s.getId()) * 0.95 + RNG.nextDouble() * 0.08) * 100);
                markRepo.save(Mark.builder().assessment(draft).student(s).score(score).build());
            }
            break;   // one drafted paper per class is enough to see the gate
        }
    }

    /* ─────────────── university results (semesters 1 and 2) ─────────────── */

    private void generateUniversityResults(Student s, double ability) {
        boolean arrearCandidate = ability < 0.55;
        int arrearsGiven = 0;
        for (int sem = 1; sem <= 2; sem++) {
            String[][] courses = sem == 1 ? SEM1 : SEM2;
            String session = sem == 1 ? "Nov/Dec 2025" : "Apr/May 2026";
            for (String[] c : courses) {
                boolean lab = "L".equals(c[3]);
                int internalMax = lab ? 60 : 40, externalMax = lab ? 40 : 60;
                double perf = Math.min(0.99, ability + (RNG.nextDouble() - 0.45) * 0.14 + (lab ? 0.06 : 0));
                int internal = (int) Math.round(Math.min(1.0, perf + 0.04) * internalMax);
                int external = (int) Math.round(perf * externalMax);
                if (arrearCandidate && !lab && sem == 2 && arrearsGiven == 0 && c[0].startsWith("MA")) {
                    external = 19; arrearsGiven++;              // one standing arrear, cleared marks under 50
                }
                int total = internal + external;
                String grade = externalMax == 60 && external < 27 ? "RA" : gradeFor(total);
                resultRepo.save(UniversityResult.builder().student(s).semester(sem).examSession(session)
                        .subjectCode(c[0]).subjectName(c[1]).credits(Integer.parseInt(c[2])).laboratory(lab)
                        .internalMarks(internal).externalMarks(external).grade(grade).gradePoint(pointsFor(grade)).build());
            }
        }
    }

    private static String gradeFor(int total) {
        if (total >= 91) return "O";
        if (total >= 81) return "A+";
        if (total >= 71) return "A";
        if (total >= 61) return "B+";
        if (total >= 56) return "B";
        if (total >= 50) return "C";
        return "RA";
    }

    private static int pointsFor(String g) {
        return switch (g) { case "O" -> 10; case "A+" -> 9; case "A" -> 8; case "B+" -> 7; case "B" -> 6; case "C" -> 5; default -> 0; };
    }

    /* ─────────────── fees ─────────────── */

    private void generateFees(Student s) {
        boolean rehan = "CSE288".equals(s.getRollNo());
        boolean hosteller = s.getHostelBlock() != null;
        String prev = "2025-26", cur = "2026-27";
        List<FeeItem> items = new ArrayList<>();
        // Last year: all settled.
        items.add(paid(s, "TUITION", "Tuition fee · Year 1", prev, 85000, LocalDate.of(2025, 8, 20), LocalDate.of(2025, 8, 12)));
        items.add(paid(s, "EXAM", "University examination fee · Nov/Dec 2025", prev, 2150, LocalDate.of(2025, 11, 5), LocalDate.of(2025, 10, 30)));
        items.add(paid(s, "EXAM", "University examination fee · Apr/May 2026", prev, 2350, LocalDate.of(2026, 3, 28), LocalDate.of(2026, 3, 20)));
        // This year.
        items.add(paid(s, "TUITION", "Tuition fee · Year 2", cur, 85000, LocalDate.of(2026, 7, 31), LocalDate.of(2026, 7, 22)));
        items.add(paid(s, "DEVELOPMENT", "Development and special fee", cur, 10000, LocalDate.of(2026, 7, 31), LocalDate.of(2026, 7, 22)));
        items.add(paid(s, "LIBRARY", "Library and laboratory fee", cur, 3500, LocalDate.of(2026, 7, 31), LocalDate.of(2026, 7, 22)));
        if (hosteller) {
            items.add(paid(s, "HOSTEL", "Hostel rent · Odd semester", cur, 27500, LocalDate.of(2026, 7, 31), LocalDate.of(2026, 7, 25)));
            items.add(due(s, "MESS", "Mess charges · Oct to Dec", cur, 21000, LocalDate.of(2026, 10, 10)));
        } else {
            String route = rehan ? BUS_ROUTES[0] : BUS_ROUTES[RNG.nextInt(BUS_ROUTES.length)];
            items.add(paid(s, "TRANSPORT", "College bus · " + route + " · Instalment 1", cur, 16000, LocalDate.of(2026, 7, 31), LocalDate.of(2026, 7, 24)));
            items.add(due(s, "TRANSPORT", "College bus · " + route + " · Instalment 2", cur, 16000, LocalDate.of(2026, 10, 10)));
        }
        items.add(due(s, "TRAINING", "Placement training and soft skills", cur, 5000, LocalDate.of(2026, 11, 15)));
        items.add(due(s, "EXAM", "University examination fee · Nov/Dec 2026", cur, 2450, LocalDate.of(2026, 11, 5)));
        if (rehan) items.add(due(s, "ASSOCIATION", "CSE association and symposium fee", cur, 750, LocalDate.of(2026, 11, 20)));
        feeRepo.saveAll(items);
    }

    private FeeItem paid(Student s, String cat, String desc, String term, long amount, LocalDate due, LocalDate on) {
        return FeeItem.builder().student(s).category(cat).description(desc).term(term).amount(amount).dueDate(due)
                .paid(true).paidAt(on.atTime(11, 20).atZone(ZoneId.of("Asia/Kolkata")).toInstant())
                .receiptNo("EEC" + on.getYear() + String.format("%06d", RNG.nextInt(1_000_000)))
                .paymentMode(new String[]{"UPI", "NET_BANKING", "CARD"}[RNG.nextInt(3)]).build();
    }

    private FeeItem due(Student s, String cat, String desc, String term, long amount, LocalDate due) {
        return FeeItem.builder().student(s).category(cat).description(desc).term(term).amount(amount).dueDate(due).build();
    }

    /* ─────────────── leave, campus services, skills ─────────────── */

    private void generateRequests(ClassSection section, List<Student> students, List<Faculty> staff) {
        Faculty coordinator = section.getCoordinator();
        for (Student s : students) {
            boolean rehan = "CSE288".equals(s.getRollNo());
            if (rehan) {
                leaveRepo.save(LeaveApplication.builder().student(s).classSection(section)
                        .fromDate(LocalDate.of(2026, 8, 18)).toDate(LocalDate.of(2026, 8, 19)).type(LeaveApplicationType.LEAVE)
                        .reason("Viral fever; doctor advised two days of rest.").status(LeaveApplicationStatus.APPROVED)
                        .appliedAt(Instant.parse("2026-08-17T15:10:00Z")).reviewedBy(coordinator)
                        .reviewedAt(Instant.parse("2026-08-18T04:30:00Z")).reviewNote("Get well soon. Approved.").build());
                leaveRepo.save(LeaveApplication.builder().student(s).classSection(section)
                        .fromDate(LocalDate.of(2026, 9, 25)).toDate(LocalDate.of(2026, 9, 25)).type(LeaveApplicationType.OD)
                        .reason("Representing the college at the IIT Madras Shaastra coding contest.").status(LeaveApplicationStatus.APPROVED)
                        .appliedAt(Instant.parse("2026-09-20T09:00:00Z")).reviewedBy(coordinator)
                        .reviewedAt(Instant.parse("2026-09-21T05:00:00Z")).reviewNote("All the best.").build());
                leaveRepo.save(LeaveApplication.builder().student(s).classSection(section)
                        .fromDate(LocalDate.of(2026, 10, 29)).toDate(LocalDate.of(2026, 10, 30)).type(LeaveApplicationType.OD)
                        .reason("Smart India Hackathon internal round at Anna University, Guindy.")
                        .appliedAt(Instant.parse("2026-10-21T10:15:00Z")).build());
                cms(s, "ID_CARD", "{\"Request type\":\"Replacement\",\"Details\":\"Card damaged\"}", RequestStatus.RESOLVED,
                        "Collect the new card from the admin office.", "2026-08-03T06:00:00Z");
                cms(s, "EXAM_CELL", "{\"Request type\":\"Bonafide certificate\",\"Details\":\"For passport application\"}",
                        RequestStatus.IN_PROGRESS, null, "2026-10-15T07:30:00Z");
                cms(s, "LIBRARY", "{\"Request type\":\"Book request\",\"Details\":\"Introduction to Algorithms, CLRS\"}",
                        RequestStatus.OPEN, null, "2026-10-20T08:45:00Z");
            } else if (RNG.nextInt(3) == 0) {
                LocalDate from = TERM_START.plusDays(14 + RNG.nextInt(70));
                boolean pending = RNG.nextInt(4) == 0;
                leaveRepo.save(LeaveApplication.builder().student(s).classSection(section)
                        .fromDate(from).toDate(from.plusDays(RNG.nextInt(2)))
                        .type(RNG.nextBoolean() ? LeaveApplicationType.LEAVE : LeaveApplicationType.OD)
                        .reason(RNG.nextBoolean() ? "Family function in my native place." : "Inter-college symposium participation.")
                        .status(pending ? LeaveApplicationStatus.PENDING : LeaveApplicationStatus.APPROVED)
                        .appliedAt(from.minusDays(2).atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant())
                        .reviewedBy(pending ? null : coordinator)
                        .reviewedAt(pending ? null : from.minusDays(1).atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant())
                        .build());
            }
        }
    }

    private int ticketSeq = 10000;

    private void cms(Student s, String type, String payload, RequestStatus status, String note, String at) {
        cmsRepo.save(CmsRequest.builder().student(s).serviceType(type).ticketNo("EEC-" + (ticketSeq += 37))
                .payloadJson(payload).status(status).resolutionNote(note).createdAt(Instant.parse(at))
                .resolvedAt(status == RequestStatus.RESOLVED ? Instant.parse(at).plusSeconds(86400) : null).build());
    }

    private void seedSkills(Student s, double ability) {
        for (String skill : new String[]{"CODING", "APTITUDE", "COMMUNICATION", "TECHNICAL", "PROJECTS", "INTERVIEW"}) {
            int score = (int) Math.round(Math.min(98, 35 + ability * 55 + RNG.nextInt(14)));
            skillRepo.save(SkillScore.builder().student(s).skill(skill).score(score).build());
        }
    }

    private void createPlacementPipeline() {
        companyRepo.saveAll(List.of(
                Company.builder().name("Zoho Corporation").jobRole("Software Developer Intern").ctc("₹30,000/month stipend")
                        .minCgpa(7.5).minAttendance(75).eligibleDepartments("CSE,IT,AIDS").maxStandingArrears(0)
                        .applicationDeadline(LocalDate.of(2026, 11, 20)).driveDate(LocalDate.of(2026, 12, 3))
                        .description("Summer internship with a pre-placement offer track.").build(),
                Company.builder().name("Freshworks").jobRole("Product Engineering Intern").ctc("₹40,000/month stipend")
                        .minCgpa(8.0).minAttendance(80).eligibleDepartments("CSE,IT,AIDS")
                        .applicationDeadline(LocalDate.of(2026, 11, 28)).build(),
                Company.builder().name("TCS Digital").jobRole("Associate Trainee").ctc("₹7 LPA")
                        .minCgpa(7.0).minAttendance(75).eligibleDepartments("ALL")
                        .applicationDeadline(LocalDate.of(2026, 12, 5)).build(),
                Company.builder().name("Texas Instruments").jobRole("Analog Design Intern").ctc("₹50,000/month stipend")
                        .minCgpa(8.0).minAttendance(80).eligibleDepartments("ECE")
                        .applicationDeadline(LocalDate.of(2026, 12, 10)).build(),
                Company.builder().name("Ashok Leyland").jobRole("Graduate Engineer Trainee").ctc("₹6.5 LPA")
                        .minCgpa(6.5).minAttendance(75).eligibleDepartments("MECH")
                        .applicationDeadline(LocalDate.of(2026, 12, 12)).build()));
        internshipRepo.saveAll(List.of(
                Internship.builder().title("Summer Software Internship").organisation("Zoho Corporation")
                        .duration("8 weeks").stipend("₹30,000/mo").mode("On-site · Chennai")
                        .eligibleDepartments("CSE,IT,AIDS").applicationDeadline(LocalDate.of(2026, 11, 20)).build(),
                Internship.builder().title("Machine Learning Internship").organisation("Sify Technologies")
                        .duration("10 weeks").stipend("₹20,000/mo").mode("Hybrid · Chennai")
                        .eligibleDepartments("AIDS,CSE").applicationDeadline(LocalDate.of(2026, 11, 30)).build(),
                Internship.builder().title("Embedded Systems Internship").organisation("Bosch Global Software")
                        .duration("8 weeks").stipend("₹25,000/mo").mode("On-site · Coimbatore")
                        .eligibleDepartments("ECE").applicationDeadline(LocalDate.of(2026, 12, 6)).build(),
                Internship.builder().title("Plant Operations Internship").organisation("Hyundai Motor India")
                        .duration("6 weeks").stipend("₹15,000/mo").mode("On-site · Sriperumbudur")
                        .eligibleDepartments("MECH").applicationDeadline(LocalDate.of(2026, 12, 8)).build()));
    }

    /** Every seeded login, written once beside the database (git-ignored). */
    private void writeCredentials() {
        StringBuilder csv = new StringBuilder("role,username,name,department,password\n");
        for (String[] c : credentials) csv.append(String.join(",", c)).append('\n');
        try {
            Path out = Paths.get("data", "seed-credentials.csv");
            Files.createDirectories(out.getParent());
            Files.writeString(out, csv.toString());
            log.info("Sign-in details for every seeded account: {}", out.toAbsolutePath());
        } catch (IOException e) {
            log.warn("Couldn't write seed-credentials.csv: {}", e.getMessage());
        }
    }
}
