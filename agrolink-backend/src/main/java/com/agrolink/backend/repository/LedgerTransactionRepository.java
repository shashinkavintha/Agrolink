package com.agrolink.backend.repository;

import com.agrolink.backend.model.LedgerTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, UUID> {
    List<LedgerTransaction> findByProfileIdOrderByCreatedAtDesc(UUID profileId);
    List<LedgerTransaction> findByOrderId(UUID orderId);
}
