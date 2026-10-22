package edu.easwari.erp.service;

import edu.easwari.erp.domain.AuditLog;
import edu.easwari.erp.domain.User;
import edu.easwari.erp.repo.AuditLogRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepo auditRepo;

    public void record(User actor, String action, String targetType, Long targetId, String detail) {
        auditRepo.save(AuditLog.builder()
                .actorUserId(actor != null ? actor.getId() : null)
                .actorUsername(actor != null ? actor.getUsername() : "system")
                .action(action).targetType(targetType).targetId(targetId).detail(detail)
                .build());
    }
}
