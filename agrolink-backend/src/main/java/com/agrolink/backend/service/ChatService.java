package com.agrolink.backend.service;

import com.agrolink.backend.model.*;
import com.agrolink.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ChatService {

    @Autowired
    private ConversationRepository conversationRepository;
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    @Autowired
    private CustomOfferRepository customOfferRepository;

    @Autowired
    private ProfileRepository profileRepository;

    // A simple regex to catch phone numbers or emails (for platform circumvention prevention)
    private static final Pattern PHONE_REGEX = Pattern.compile(".*\\d{10}.*|.*(?:\\+?\\d{1,3})?[-. (]*\\d{3}[-. )]*\\d{3}[-. ]*\\d{4}.*");
    private static final Pattern EMAIL_REGEX = Pattern.compile(".*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}.*");

    public Conversation getOrCreateConversation(UUID farmerId, UUID buyerId) {
        Optional<Conversation> existing = conversationRepository.findByFarmerIdAndBuyerId(farmerId, buyerId);
        if (existing.isPresent()) {
            return existing.get();
        }
        
        // Also check reverse if role is not strict, but let's assume they are strict
        Conversation conv = new Conversation();
        conv.setFarmer(profileRepository.findById(farmerId).orElseThrow(() -> new RuntimeException("Farmer not found")));
        conv.setBuyer(profileRepository.findById(buyerId).orElseThrow(() -> new RuntimeException("Buyer not found")));
        return conversationRepository.save(conv);
    }

    public List<Conversation> getUserConversations(UUID userId) {
        return conversationRepository.findByFarmerIdOrBuyerId(userId, userId);
    }

    public List<ChatMessage> getConversationHistory(UUID conversationId) {
        return chatMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    public ChatMessage saveMessage(UUID conversationId, UUID senderId, String content, String type, UUID relatedOfferId) {
        Conversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new RuntimeException("Conversation not found"));
            
        Profile sender = profileRepository.findById(senderId)
            .orElseThrow(() -> new RuntimeException("Sender not found"));

        // Content filtering
        String filteredContent = content;
        if(content != null) {
            if(PHONE_REGEX.matcher(content).matches() || EMAIL_REGEX.matcher(content).matches()) {
                filteredContent = "[System Message]: Warning! Sharing contact details is not allowed on Agrolink.";
            }
        }

        ChatMessage msg = new ChatMessage();
        msg.setConversation(conv);
        msg.setSender(sender);
        msg.setContent(filteredContent);
        msg.setType(type);
        msg.setRelatedOfferId(relatedOfferId);
        msg.setCreatedAt(LocalDateTime.now());
        
        conv.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conv);

        return chatMessageRepository.save(msg);
    }

    public CustomOffer createCustomOffer(UUID conversationId, UUID sellerId, UUID buyerId, Double price, String delivery, String metadata) {
        Conversation conv = conversationRepository.findById(conversationId).orElseThrow();
        Profile seller = profileRepository.findById(sellerId).orElseThrow();
        Profile buyer = profileRepository.findById(buyerId).orElseThrow();
        
        CustomOffer offer = new CustomOffer();
        offer.setConversation(conv);
        offer.setSeller(seller);
        offer.setBuyer(buyer);
        offer.setTotalPrice(price);
        offer.setDeliveryTime(delivery);
        offer.setOfferMetadata(metadata);
        offer.setStatus("PENDING");
        
        return customOfferRepository.save(offer);
    }
    
    public CustomOffer updateOfferStatus(UUID offerId, String status) {
        CustomOffer offer = customOfferRepository.findById(offerId).orElseThrow();
        offer.setStatus(status);
        return customOfferRepository.save(offer);
    }

    public CustomOffer getCustomOffer(UUID offerId) {
        return customOfferRepository.findById(offerId).orElseThrow();
    }
}
