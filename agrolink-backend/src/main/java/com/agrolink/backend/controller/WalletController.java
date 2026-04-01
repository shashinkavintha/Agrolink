package com.agrolink.backend.controller;

import com.agrolink.backend.model.LedgerTransaction;
import com.agrolink.backend.model.Profile;
import com.agrolink.backend.model.WithdrawalRequest;
import com.agrolink.backend.model.WithdrawalStatus;
import com.agrolink.backend.repository.LedgerTransactionRepository;
import com.agrolink.backend.repository.ProfileRepository;
import com.agrolink.backend.repository.WithdrawalRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = "http://localhost:5173")
public class WalletController {

    @Autowired
    private LedgerTransactionRepository ledgerTransactionRepository;

    @Autowired
    private WithdrawalRequestRepository withdrawalRequestRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @GetMapping("/transactions")
    public ResponseEntity<List<LedgerTransaction>> getTransactions(@RequestParam UUID profileId) {
        List<LedgerTransaction> txs = ledgerTransactionRepository.findByProfileIdOrderByCreatedAtDesc(profileId);
        return ResponseEntity.ok(txs);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<String> requestWithdrawal(@RequestBody Map<String, Object> payload) {
        try {
            UUID profileId = UUID.fromString((String) payload.get("profileId"));
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());
            String bankName = (String) payload.get("bankName");
            String accountNumber = (String) payload.get("accountNumber");

            Profile profile = profileRepository.findById(profileId)
                    .orElseThrow(() -> new RuntimeException("Profile not found"));

            if (profile.getAvailableBalance() == null || profile.getAvailableBalance().compareTo(amount) < 0) {
                return ResponseEntity.badRequest().body("Insufficient available balance.");
            }

            // Deduct immediately from available
            profile.setAvailableBalance(profile.getAvailableBalance().subtract(amount));
            profileRepository.save(profile);

            // Record Request
            WithdrawalRequest req = new WithdrawalRequest();
            req.setProfile(profile);
            req.setAmount(amount);
            req.setBankName(bankName);
            req.setAccountNumber(accountNumber);
            req.setStatus(WithdrawalStatus.PENDING);
            withdrawalRequestRepository.save(req);

            // Record Ledger
            LedgerTransaction tx = new LedgerTransaction();
            tx.setProfile(profile);
            tx.setAmount(amount.negate());
            tx.setType("WITHDRAWAL_REQUEST");
            tx.setDescription("Bank withdrawal request to " + bankName + " ending in " + accountNumber.substring(Math.max(0, accountNumber.length() - 4)));
            ledgerTransactionRepository.save(tx);

            return ResponseEntity.ok("Success");
        } catch (Exception e) {
            System.err.println("Withdrawal failure: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
