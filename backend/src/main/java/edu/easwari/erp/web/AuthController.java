package edu.easwari.erp.web;

import edu.easwari.erp.config.CurrentUser;
import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.AuthService;
import edu.easwari.erp.service.Dtos.*;
import edu.easwari.erp.service.MlClient;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;
    private final StudentRepo studentRepo;
    private final FacultyRepo facultyRepo;
    private final MlClient mlClient;

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", "UP");
        m.put("scoringService", mlClient.healthy() ? "UP" : "DOWN");
        return m;
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/auth/login-code")
    public LoginResponse loginWithCode(@Valid @RequestBody CodeLoginRequest req) {
        return authService.loginWithCode(req);
    }

    @PostMapping("/auth/quick-code")
    public Map<String, String> setQuickCode(@Valid @RequestBody SetCodeRequest req) {
        authService.setQuickCode(currentUser.get(), req);
        return Map.of("message", "Quick code saved");
    }

    @DeleteMapping("/auth/quick-code")
    public Map<String, String> removeQuickCode() {
        authService.removeQuickCode(currentUser.get());
        return Map.of("message", "Quick code removed");
    }

    @GetMapping("/auth/me")
    public Map<String, Object> me() {
        User user = currentUser.get();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("username", user.getUsername());
        m.put("role", user.getRole().name());
        m.put("mustChangePassword", user.isMustChangePassword());
        m.put("hasQuickCode", user.getQuickCodeHash() != null);
        if (user.getRole() == Role.STUDENT) {
            studentRepo.findByUserId(user.getId()).ifPresent(s -> {
                m.put("displayName", s.getName());
                m.put("profileId", s.getId());
            });
        } else if (user.getRole() == Role.FACULTY) {
            facultyRepo.findByUserId(user.getId()).ifPresent(f -> {
                m.put("displayName", f.getName());
                m.put("profileId", f.getId());
            });
        } else {
            m.put("displayName", "Administrator");
        }
        return m;
    }

    @PostMapping("/auth/change-password")
    public Map<String, String> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(currentUser.get(), req);
        return Map.of("message", "Password updated");
    }
}
