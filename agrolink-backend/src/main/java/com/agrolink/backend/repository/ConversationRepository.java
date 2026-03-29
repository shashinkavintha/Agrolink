package com.agrolink.backend.repository;

import com.agrolink.backend.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    List<Conversation> findByFarmerIdOrBuyerId(UUID farmerId, UUID buyerId);
    Optional<Conversation> findByFarmerIdAndBuyerId(UUID farmerId, UUID buyerId);
}
