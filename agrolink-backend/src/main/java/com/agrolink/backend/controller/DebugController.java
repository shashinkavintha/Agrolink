package com.agrolink.backend.controller;

import com.agrolink.backend.model.Profile;
import com.agrolink.backend.model.Order;
import com.agrolink.backend.model.OrderStatus;
import com.agrolink.backend.model.EscrowStatus;
import com.agrolink.backend.repository.ProfileRepository;
import com.agrolink.backend.repository.OrderRepository;
import com.agrolink.backend.service.EscrowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/debug")
@CrossOrigin(origins = "http://localhost:5173")
public class DebugController {

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EscrowService escrowService;

    @Autowired
    private com.agrolink.backend.repository.LedgerTransactionRepository ledgerRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProfiles", profileRepository.count());
        stats.put("totalOrders", orderRepository.count());
        stats.put("totalLedgerEntries", ledgerRepository.count());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/profiles")
    public ResponseEntity<List<Profile>> getAllProfiles() {
        return ResponseEntity.ok(profileRepository.findAll());
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAll());
    }

    @PostMapping("/sync-escrow/{id}")
    public ResponseEntity<String> forceSyncEscrow(@PathVariable UUID id, @RequestParam String action) {
        try {
            if ("hold".equalsIgnoreCase(action)) {
                escrowService.holdFunds(id);
                return ResponseEntity.ok("Escrow HELD forced for order " + id);
            } else if ("release".equalsIgnoreCase(action)) {
                escrowService.releaseFunds(id);
                return ResponseEntity.ok("Escrow RELEASE forced for order " + id);
            }
            return ResponseEntity.badRequest().body("Invalid action. Use 'hold' or 'release'.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/reset-balance/{profileId}")
    public ResponseEntity<Profile> resetBalance(@PathVariable UUID profileId) {
        return profileRepository.findById(profileId).map(p -> {
            p.setPendingBalance(java.math.BigDecimal.ZERO);
            p.setAvailableBalance(java.math.BigDecimal.ZERO);
            return ResponseEntity.ok(profileRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/check-sync")
    public ResponseEntity<List<Map<String, Object>>> checkSyncIssues() {
        List<Order> orders = orderRepository.findAll();
        List<Map<String, Object>> issues = new ArrayList<>();

        for (Order o : orders) {
            if (o.getStatus() == OrderStatus.delivered && (o.getEscrowStatus() == null || o.getEscrowStatus() == EscrowStatus.PENDING)) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("orderId", o.getId());
                issue.put("status", o.getStatus());
                issue.put("escrowStatus", o.getEscrowStatus());
                issue.put("reason", "Delivered but funds not released");
                issues.add(issue);
            }
            if (o.getStatus() == OrderStatus.accepted && (o.getEscrowStatus() == null || o.getEscrowStatus() == EscrowStatus.PENDING)) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("orderId", o.getId());
                issue.put("status", o.getStatus());
                issue.put("escrowStatus", o.getEscrowStatus());
                issue.put("reason", "Accepted but funds not held");
                issues.add(issue);
            }
        }
        return ResponseEntity.ok(issues);
    }
}
