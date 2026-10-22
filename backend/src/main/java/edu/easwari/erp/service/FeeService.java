package edu.easwari.erp.service;

import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Fee statement and a simulated payment. No money moves: paying marks the
 * lines settled and issues a receipt number, which is what the portal shows.
 */
@Service @RequiredArgsConstructor
public class FeeService {

    private static final Set<String> MODES = Set.of("UPI", "NET_BANKING", "CARD");
    private static final DateTimeFormatter AT = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm").withZone(ZoneId.of("Asia/Kolkata"));

    private final FeeItemRepo feeRepo;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public FeeStatement statement(Long studentId) {
        List<FeeItem> items = feeRepo.findByStudentIdOrderByDueDateAscIdAsc(studentId);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        long billed = 0, paid = 0, overdue = 0;
        List<FeeLine> lines = new ArrayList<>();
        for (FeeItem f : items) {
            billed += f.getAmount();
            boolean late = !f.isPaid() && f.getDueDate() != null && f.getDueDate().isBefore(today);
            if (f.isPaid()) paid += f.getAmount();
            if (late) overdue += f.getAmount();
            lines.add(new FeeLine(f.getId(), f.getCategory(), f.getDescription(), f.getTerm(), f.getAmount(),
                    f.getDueDate() == null ? null : f.getDueDate().toString(), f.isPaid(),
                    f.getPaidAt() == null ? null : AT.format(f.getPaidAt()), f.getReceiptNo(), f.getPaymentMode(), late));
        }
        return new FeeStatement(billed, paid, billed - paid, overdue, lines);
    }

    @Transactional
    public FeeStatement pay(User actor, Student student, PayFeesRequest req) {
        String mode = req.mode().trim().toUpperCase(Locale.ROOT);
        if (!MODES.contains(mode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose UPI, net banking or card.");
        }
        List<FeeItem> chosen = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(req.feeIds())) {
            FeeItem f = feeRepo.findByIdAndStudentId(id, student.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That fee isn't on your statement."));
            if (f.isPaid()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, f.getDescription() + " is already paid.");
            }
            chosen.add(f);
        }
        String receipt = "EEC" + Year.now().getValue() + String.format("%06d", Math.abs(UUID.randomUUID().getMostSignificantBits()) % 1_000_000);
        Instant now = Instant.now();
        long total = 0;
        for (FeeItem f : chosen) {
            f.setPaid(true); f.setPaidAt(now); f.setReceiptNo(receipt); f.setPaymentMode(mode);
            total += f.getAmount();
        }
        feeRepo.saveAll(chosen);
        audit.record(actor, "FEE_PAID", "Student", student.getId(),
                "Receipt " + receipt + " · ₹" + total + " · " + mode + " (simulated)");
        return statement(student.getId());
    }
}
