package com.agrolink.backend.repository;

import com.agrolink.backend.model.CustomOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CustomOfferRepository extends JpaRepository<CustomOffer, UUID> {
    List<CustomOffer> findBySellerId(UUID sellerId);
    List<CustomOffer> findByBuyerId(UUID buyerId);
    List<CustomOffer> findByConversationId(UUID conversationId);
}
