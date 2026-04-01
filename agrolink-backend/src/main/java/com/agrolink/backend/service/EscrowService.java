package com.agrolink.backend.service;

import com.agrolink.backend.model.*;
import com.agrolink.backend.repository.LedgerTransactionRepository;
import com.agrolink.backend.repository.OrderRepository;
import com.agrolink.backend.repository.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class EscrowService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private LedgerTransactionRepository ledgerTransactionRepository;

    /**
     * Step 1: Payment Capture (Webhook OR Farmer Acceptance Fallback)
     * Funds are captured and locked to the Seller's Pending Balance.
     * Guards against double-processing.
     */
    @Transactional
    public void holdFunds(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getEscrowStatus() == EscrowStatus.HELD || order.getEscrowStatus() == EscrowStatus.RELEASED) {
            System.out.println("⏭️ holdFunds skipped — already processed for Order: " + orderId + " (escrow=" + order.getEscrowStatus() + ")");
            return;
        }

        order.setEscrowStatus(EscrowStatus.HELD);
        
        Profile seller = order.getFarmer();
        if (seller != null) {
            // Always reload seller fresh from DB to avoid stale entity / L1 cache issues
            Profile freshSeller = profileRepository.findById(seller.getId())
                    .orElseThrow(() -> new RuntimeException("Seller profile not found"));

            BigDecimal amount = order.getTotalAmount();
            BigDecimal currentPending = freshSeller.getPendingBalance() != null ? freshSeller.getPendingBalance() : BigDecimal.ZERO;
            freshSeller.setPendingBalance(currentPending.add(amount));
            profileRepository.save(freshSeller);

            System.out.println("💰 ESCROW HOLD: Seller " + freshSeller.getId() 
                    + " pendingBalance updated to: Rs." + freshSeller.getPendingBalance());

            createLedgerEntry(freshSeller, order, amount, "ESCROW_HOLD", 
                    "Funds locked in escrow for Order " + orderId);
        } else {
            System.err.println("⚠️ WARNING: Order " + orderId + " has no farmer assigned. Cannot hold funds.");
        }

        orderRepository.save(order);
        System.out.println("✅ Escrow HELD for Order: " + orderId);
    }

    /**
     * Step 2: Farmer Acceptance Confirmation
     * Called by OrderController when farmer clicks 'Accept'.
     * Ensures order is marked accepted and escrow hold is triggered.
     */
    @Transactional
    public void confirmFarmerAcceptance(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        System.out.println("🔔 confirmFarmerAcceptance: orderId=" + orderId 
                + " | status=" + order.getStatus() 
                + " | escrow=" + order.getEscrowStatus());

        // Ensure order is in accepted state
        if (order.getStatus() != OrderStatus.accepted) {
            order.setStatus(OrderStatus.accepted);
            orderRepository.save(order);
        }

        // ALWAYS call holdFunds — it's idempotent.
        // We do this unconditionally because farmerAcceptOrder() already saved the
        // order as 'accepted' before this method is called, so status=accepted check
        // alone would always skip holdFunds incorrectly.
        holdFunds(orderId);
    }

    /**
     * Step 3 & 4: Delivery Approval & Settlement
     * 10% Platform Commission
     * 90% Released to cleared vendor balance
     */
    @Transactional
    public void releaseFunds(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getEscrowStatus() == EscrowStatus.RELEASED) {
            throw new RuntimeException("Funds already released.");
        }

        if (order.getEscrowStatus() != EscrowStatus.HELD) {
            throw new RuntimeException("Cannot release funds. Order is not in HELD state.");
        }

        Profile seller = order.getFarmer();
        if (seller != null) {
            BigDecimal totalAmount = order.getTotalAmount();
            
            // Commission calculation (10%)
            BigDecimal commission = totalAmount.multiply(new BigDecimal("0.10"));
            BigDecimal payout = totalAmount.subtract(commission);

            order.setPlatformCommission(commission);
            order.setVendorEarning(payout);

            // Update Vendor Wallet
            BigDecimal currentPending = seller.getPendingBalance() != null ? seller.getPendingBalance() : BigDecimal.ZERO;
            BigDecimal currentAvailable = seller.getAvailableBalance() != null ? seller.getAvailableBalance() : BigDecimal.ZERO;

            // Subtract from pending, add 90% to available
            seller.setPendingBalance(currentPending.subtract(totalAmount));
            seller.setAvailableBalance(currentAvailable.add(payout));
            profileRepository.save(seller);

            // Add Ledger Entries
            createLedgerEntry(seller, order, payout, "ESCROW_RELEASE", "Funds released to available balance (90%)");
            createLedgerEntry(seller, order, commission.negate(), "COMMISSION_FEE", "Agrolink 10% platform fee deducted");
        }

        order.setStatus(OrderStatus.delivered);
        order.setEscrowStatus(EscrowStatus.RELEASED);
        order.setDeliveredAt(java.time.LocalDateTime.now());
        
        // Let's also increment total earnings as per old logic
        if (seller != null) {
            BigDecimal totalEarned = seller.getTotalEarnings() != null ? seller.getTotalEarnings() : BigDecimal.ZERO;
            seller.setTotalEarnings(totalEarned.add(order.getVendorEarning()));
            profileRepository.save(seller);
        }

        orderRepository.save(order);
        System.out.println("💰 Escrow RELEASED for Order: " + orderId);
    }

    /**
     * Step 5: Dispute Resolution
     */
    @Transactional
    public void disputeFunds(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getEscrowStatus() == EscrowStatus.RELEASED) {
            throw new RuntimeException("Cannot dispute. Funds already released.");
        }

        order.setEscrowStatus(EscrowStatus.DISPUTED);
        orderRepository.save(order);
        
        // Log it conceptually, although actual money didn't move
        Profile seller = order.getFarmer();
        if (seller != null) {
            createLedgerEntry(seller, order, BigDecimal.ZERO, "DISPUTE_FROZEN", "Escrow funds locked due to dispute");
        }
    }

    private void createLedgerEntry(Profile profile, Order order, BigDecimal amount, String type, String desc) {
        LedgerTransaction tx = new LedgerTransaction();
        tx.setProfile(profile);
        tx.setOrder(order);
        tx.setAmount(amount);
        tx.setType(type);
        tx.setDescription(desc);
        ledgerTransactionRepository.save(tx);
    }
}
