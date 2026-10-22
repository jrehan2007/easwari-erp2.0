package edu.easwari.erp.config;

import edu.easwari.erp.domain.User;
import edu.easwari.erp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Resolves the authenticated principal to a User row. */
@Component @RequiredArgsConstructor
public class CurrentUser {

    private final UserRepo userRepo;

    public User get() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not signed in");
        }
        return userRepo.findByUsernameIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account no longer exists"));
    }

    public Long id() { return get().getId(); }
}
