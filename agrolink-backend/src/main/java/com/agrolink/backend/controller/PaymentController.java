package com.agrolink.backend.controller;

import com.agrolink.backend.service.PayHereService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "http://localhost:5173")
public class PaymentController {

    @Autowired
    private PayHereService payHereService;

    @GetMapping("/hash/{orderId}")
    public ResponseEntity<Map<String, String>> getPaymentHash(@PathVariable UUID orderId) {
        try {
            Map<String, String> result = payHereService.generateHash(orderId);
            System.out.println("=== PAYMENT HASH RETURNED TO FRONTEND ===");
            result.forEach((key, value) -> {
                if ("hash".equals(key)) {
                    System.out.println(key + ": " + value);
                } else {
                    System.out.println(key + ": " + value);
                }
            });
            System.out.println("==========================================");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("ERROR generating payment hash: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/notify")
    public ResponseEntity<Void> handleNotification(@RequestParam Map<String, String> params) {
        // Implement notification handling (updating order status) in Service
        // For now, logging the parameters for debugging
        System.out.println("PayHere Notification Received: " + params);

        // TODO: Validate MD5 signature and update order status to PAID

        return ResponseEntity.ok().build();
    }
}
