package edu.easwari.erp.repo;

import edu.easwari.erp.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepo extends JpaRepository<User, Long> {
    Optional<User> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
    List<User> findByRole(Role role);
    long countByRole(Role role);

    long countByRoleAndActiveTrue(Role role);
}
