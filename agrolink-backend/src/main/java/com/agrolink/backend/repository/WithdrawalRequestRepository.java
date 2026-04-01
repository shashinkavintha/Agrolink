package com.agrolink.backend.repository;

import com.agrolink.backend.model.WithdrawalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, UUID> {
    List<WithdrawalRequest> findByProfileIdOrderByRequestedAtDesc(UUID profileId);
}
