package com.agrolink.backend.service;

import com.agrolink.backend.model.*;
import com.agrolink.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;
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

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private NotificationService notificationService;

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
    
    @Transactional
    public CustomOffer updateOfferStatus(UUID offerId, String status) {
        CustomOffer offer = customOfferRepository.findById(offerId).orElseThrow();
        offer.setStatus(status);

        if ("ACCEPTED".equals(status)) {
            // Create a formal Order in the system
            Order order = new Order();
            order.setBuyer(offer.getBuyer());
            order.setFarmer(offer.getSeller());
            order.setTotalAmount(BigDecimal.valueOf(offer.getTotalPrice()));
            order.setStatus(OrderStatus.pending);
            order.setCreatedAt(LocalDateTime.now());
            
            // Sync initial coordinates from profiles if available
            if (offer.getSeller().getLatitude() != null) {
                order.setPickupLatitude(offer.getSeller().getLatitude());
                order.setPickupLongitude(offer.getSeller().getLongitude());
            }
            if (offer.getBuyer().getLatitude() != null) {
                order.setDeliveryLatitude(offer.getBuyer().getLatitude());
                order.setDeliveryLongitude(offer.getBuyer().getLongitude());
            }

            // Create a single order item representing the custom offer
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setCustomItemName("Custom Offer: " + offer.getOfferMetadata());
            item.setQuantity(BigDecimal.ONE);
            item.setPriceAtTime(BigDecimal.valueOf(offer.getTotalPrice()));

            order.setItems(List.of(item));
            
            orderRepository.save(order);
            offer.setRelatedOrderId(order.getId());
            System.out.println("✅ Custom Offer " + offerId + " converted to Order: " + order.getId());

            // Add System Message to Chat
            saveMessage(
                offer.getConversation().getId(),
                offer.getBuyer().getId(), // Buyer is the one accepting
                "System: Custom offer has been accepted. A formal order #" + order.getId().toString().substring(0, 8) + " has been created.",
                "SYSTEM",
                null
            );

            // Notify Farmer about the new Order
            notificationService.createNotification(
                offer.getSeller().getId(),
                "New Custom Order",
                "Buyer accepted your offer for Rs. " + offer.getTotalPrice() + ". Please accept the order to start delivery.",
                "ORDER_PENDING",
                order.getId()
            );
        }

        return customOfferRepository.save(offer);
    }

    public CustomOffer getCustomOffer(UUID offerId) {
        return customOfferRepository.findById(offerId).orElseThrow();
    }
}
