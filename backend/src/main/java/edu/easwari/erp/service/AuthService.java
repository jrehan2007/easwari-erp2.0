package edu.easwari.erp.service;

import edu.easwari.erp.config.JwtService;
import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service @RequiredArgsConstructor
public class AuthService {

    private final UserRepo userRepo;
    private final StudentRepo studentRepo;
    private final FacultyRepo facultyRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final AuditService audit;

    @Transactional
    public LoginResponse login(LoginRequest req) {
        User user = userRepo.findByUsernameIgnoreCase(req.username().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "That username and password combination isn't recognised"));

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This account is deactivated. Contact the administration office.");
        }
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "That username and password combination isn't recognised");
        }

        user.setLastLoginAt(Instant.now());
        userRepo.save(user);

        String displayName = user.getUsername();
        Long profileId = null;
        if (user.getRole() == Role.STUDENT) {
            var s = studentRepo.findByUserId(user.getId()).orElse(null);
            if (s != null) { displayName = s.getName(); profileId = s.getId(); }
        } else if (user.getRole() == Role.FACULTY) {
            var f = facultyRepo.findByUserId(user.getId()).orElse(null);
            if (f != null) { displayName = f.getName(); profileId = f.getId(); }
        } else {
            displayName = "Administrator";
        }

        return new LoginResponse(jwtService.issue(user), user.getUsername(),
                user.getRole().name(), displayName, user.isMustChangePassword(), profileId,
                user.getQuickCodeHash() != null);
    }

    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final long LOCK_MINUTES = 15;

    /**
     * Sign in with the 6-digit quick code. Five wrong codes lock the code for
     * fifteen minutes (the password still works), because six digits are only
     * a million combinations.
     */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public LoginResponse loginWithCode(CodeLoginRequest req) {
        final String generic = "That code isn't right";
        User user = userRepo.findByUsernameIgnoreCase(req.username().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, generic));
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This account is deactivated. Contact the administration office.");
        }
        if (user.getRole() != Role.STUDENT || user.getQuickCodeHash() == null || user.isMustChangePassword()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, generic);
        }
        if (user.getQuickCodeLockedUntil() != null && user.getQuickCodeLockedUntil().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many wrong codes. Sign in with your password instead, or try again in a few minutes.");
        }
        if (!encoder.matches(req.code(), user.getQuickCodeHash())) {
            int failures = user.getQuickCodeFailures() + 1;
            user.setQuickCodeFailures(failures);
            if (failures >= MAX_CODE_ATTEMPTS) {
                user.setQuickCodeLockedUntil(Instant.now().plusSeconds(LOCK_MINUTES * 60));
                user.setQuickCodeFailures(0);
            }
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, generic);
        }
        user.setQuickCodeFailures(0);
        user.setQuickCodeLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        userRepo.save(user);
        return buildResponse(user);
    }

    @Transactional
    public void setQuickCode(User user, SetCodeRequest req) {
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Your password is incorrect");
        }
        applyQuickCode(user, req.code());
        audit.record(user, "QUICK_CODE_SET", "User", user.getId(), "Quick code created or changed");
    }

    /** Used right after a password change, when the user has just proved the password. */
    @Transactional
    public void setQuickCodeTrusted(User user, String code) {
        applyQuickCode(user, code);
        audit.record(user, "QUICK_CODE_SET", "User", user.getId(), "Quick code created or changed");
    }

    @Transactional
    public void removeQuickCode(User user) {
        user.setQuickCodeHash(null);
        user.setQuickCodeFailures(0);
        user.setQuickCodeLockedUntil(null);
        userRepo.save(user);
        audit.record(user, "QUICK_CODE_REMOVED", "User", user.getId(), "Quick code removed");
    }

    private void applyQuickCode(User user, String code) {
        if (code == null || !code.matches("\\d{6}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The code must be exactly 6 digits");
        }
        if (user.getRole() != Role.STUDENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The quick code is available for student accounts only");
        }
        if (user.isMustChangePassword()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Set your own password first");
        }
        user.setQuickCodeHash(encoder.encode(code));
        user.setQuickCodeFailures(0);
        user.setQuickCodeLockedUntil(null);
        userRepo.save(user);
    }

    private LoginResponse buildResponse(User user) {
        String displayName = user.getUsername();
        Long profileId = null;
        if (user.getRole() == Role.STUDENT) {
            var s = studentRepo.findByUserId(user.getId()).orElse(null);
            if (s != null) { displayName = s.getName(); profileId = s.getId(); }
        } else if (user.getRole() == Role.FACULTY) {
            var f = facultyRepo.findByUserId(user.getId()).orElse(null);
            if (f != null) { displayName = f.getName(); profileId = f.getId(); }
        } else {
            displayName = "Administrator";
        }
        return new LoginResponse(jwtService.issue(user), user.getUsername(),
                user.getRole().name(), displayName, user.isMustChangePassword(), profileId,
                user.getQuickCodeHash() != null);
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest req) {
        if (!encoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        user.setPasswordHash(encoder.encode(req.newPassword()));
        user.setMustChangePassword(false);
        userRepo.save(user);
        audit.record(user, "PASSWORD_CHANGED", "User", user.getId(), "Self-service change");
    }
}
