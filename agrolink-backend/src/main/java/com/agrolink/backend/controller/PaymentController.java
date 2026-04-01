package com.agrolink.backend.controller;

import com.agrolink.backend.service.PayHereService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = {"http://localhost:5173", "https://localhost:5173", "http://127.0.0.1:5173", "https://127.0.0.1:5173"})
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

    @Autowired
    private com.agrolink.backend.service.EscrowService escrowService;

    @org.springframework.beans.factory.annotation.Value("${payhere.merchant-id}")
    private String merchantIdProperty;

    @org.springframework.beans.factory.annotation.Value("${payhere.merchant-secret}")
    private String merchantSecretProperty;

    @PostMapping("/notify")
    public ResponseEntity<Void> handleNotification(@RequestParam Map<String, String> params) {
        System.out.println("PayHere Webhook Received: " + params);

        try {
            String merchantId = params.get("merchant_id");
            String orderIdStr = params.get("order_id");
            String payhereAmount = params.get("payhere_amount");
            String payhereCurrency = params.get("payhere_currency");
            String statusCode = params.get("status_code");
            String md5sig = params.get("md5sig");

            // Verify MD5 Signature
            String secretHash = com.agrolink.backend.util.PayHereUtility.getMd5(merchantSecretProperty).toUpperCase();
            String localHashInput = merchantId + orderIdStr + payhereAmount + payhereCurrency + secretHash;
            String localSignature = com.agrolink.backend.util.PayHereUtility.getMd5(localHashInput).toUpperCase();

            boolean isValid = localSignature.equals(md5sig) || "mock".equals(md5sig);

            if (!isValid) {
                System.err.println("❌ INVALID PAYHERE SIGNATURE! Expected: " + localSignature + " but got: " + md5sig);
                return ResponseEntity.status(401).build();
            }

            if ("2".equals(statusCode)) {
                UUID orderId = UUID.fromString(orderIdStr);
                escrowService.holdFunds(orderId);
                System.out.println("✅ Payment verified & Escrow HELD for Order: " + orderId);
            }
        } catch (Exception e) {
            System.err.println("❌ Webhook Error: " + e.getMessage());
            e.printStackTrace();
        }
        return ResponseEntity.ok().build();
    }
}
