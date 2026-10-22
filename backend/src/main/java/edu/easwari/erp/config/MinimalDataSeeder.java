package edu.easwari.erp.config;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Real-data mode: the only thing seeded is the administrator account, so the
 * college can be built from the Admin portal (departments, programmes, classes,
 * faculty, students, courses). No demo students, staff or marks are created.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnExpression("'${app.seed.enabled:true}' == 'true' and '${app.seed.mode:full}' == 'minimal'")
public class MinimalDataSeeder implements CommandLineRunner {

    private final UserRepo userRepo;
    private final PasswordEncoder encoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepo.count() > 0) {
            log.info("Database already populated — skipping admin seed.");
            return;
        }
        userRepo.save(User.builder()
                .username("admin")
                .passwordHash(encoder.encode("Admin@123"))
                .role(Role.ADMIN)
                .active(true)
                .build());
        log.info("Seeded the administrator account only. Sign in with — admin / Admin@123");
        log.info("Create departments, programmes, classes, faculty and students from the Admin portal.");
    }
}
