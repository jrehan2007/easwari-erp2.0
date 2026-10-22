package edu.easwari.erp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * HTTP client for the Python scoring service. If the service is down the
 * portal degrades rather than breaks — dashboards still render, intelligence
 * panels show as unavailable.
 */
@Service @RequiredArgsConstructor @Slf4j
public class MlClient {

    private final RestTemplate mlRestTemplate;

    @Value("${app.ml.base-url}")
    private String baseUrl;

    @SuppressWarnings("unchecked")
    public Map<String, Object> post(String path, Object body, Map<String, Object> fallback) {
        try {
            Map<String, Object> res = mlRestTemplate.postForObject(baseUrl + path, body, Map.class);
            return res != null ? res : fallback;
        } catch (Exception ex) {
            log.warn("Scoring service unavailable at {}{} — {}", baseUrl, path, ex.getMessage());
            Map<String, Object> degraded = new HashMap<>(fallback);
            degraded.put("degraded", true);
            return degraded;
        }
    }

    public boolean healthy() {
        try {
            mlRestTemplate.getForObject(baseUrl + "/health", Map.class);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }
}
