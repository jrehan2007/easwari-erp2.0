package edu.easwari.erp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.easwari.erp.domain.*;
import edu.easwari.erp.repo.*;
import edu.easwari.erp.service.Dtos.*;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service @RequiredArgsConstructor
public class CmsService {

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.systemDefault());

    private static final List<String> VALID_SERVICES = List.of(
            "FEE", "HOSTEL", "TRANSPORT", "ID_CARD", "EXAM_CELL", "LIBRARY");

    private final CmsRequestRepo repo;
    private final StudentRepo studentRepo;
    private final ObjectMapper mapper;

    @SneakyThrows
    @Transactional
    public CmsRequestView create(Long studentId, CmsRequestCreate req) {
        String type = req.serviceType().toUpperCase();
        if (!VALID_SERVICES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown service. Choose one of: " + String.join(", ", VALID_SERVICES));
        }
        Student student = studentRepo.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        Map<String, String> fields = req.fields() == null ? Map.of() : req.fields();
        String ticket = "EEC-" + ThreadLocalRandom.current().nextInt(10000, 99999);

        CmsRequest saved = repo.save(CmsRequest.builder()
                .student(student)
                .serviceType(type)
                .ticketNo(ticket)
                .payloadJson(mapper.writeValueAsString(fields))
                .status(RequestStatus.OPEN)
                .build());
        return toView(saved);
    }

    @Transactional(readOnly = true)
    public List<CmsRequestView> listFor(Long studentId) {
        return repo.findByStudentIdOrderByCreatedAtDesc(studentId).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<CmsRequestView> listOpen() {
        return repo.findByStatusOrderByCreatedAtDesc(RequestStatus.OPEN).stream().map(this::toView).toList();
    }

    @Transactional
    public CmsRequestView updateStatus(Long requestId, String status, String note) {
        CmsRequest r = repo.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        r.setStatus(RequestStatus.valueOf(status.toUpperCase()));
        r.setResolutionNote(note);
        if (r.getStatus() == RequestStatus.RESOLVED || r.getStatus() == RequestStatus.REJECTED) {
            r.setResolvedAt(Instant.now());
        }
        return toView(repo.save(r));
    }

    private CmsRequestView toView(CmsRequest r) {
        return new CmsRequestView(r.getId(), r.getTicketNo(), r.getServiceType(),
                r.getStatus().name(), FMT.format(r.getCreatedAt()), r.getResolutionNote());
    }
}
