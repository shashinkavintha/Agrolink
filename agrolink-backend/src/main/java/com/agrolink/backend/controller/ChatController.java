package com.agrolink.backend.controller;

import com.agrolink.backend.model.*;
import com.agrolink.backend.service.ChatService;
import com.agrolink.backend.service.NotificationService;
import com.agrolink.backend.repository.ConversationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // --- REST Endpoints ---

    @PostMapping("/conversations")
    public ResponseEntity<Conversation> getOrCreateConversation(@RequestBody Map<String, String> payload) {
        UUID farmerId = UUID.fromString(payload.get("farmerId"));
        UUID buyerId = UUID.fromString(payload.get("buyerId"));
        return ResponseEntity.ok(chatService.getOrCreateConversation(farmerId, buyerId));
    }

    @GetMapping("/conversations/user/{userId}")
    public ResponseEntity<List<Conversation>> getUserConversations(@PathVariable UUID userId) {
        return ResponseEntity.ok(chatService.getUserConversations(userId));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<ChatMessage>> getConversationHistory(@PathVariable UUID conversationId) {
        return ResponseEntity.ok(chatService.getConversationHistory(conversationId));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ChatMessage> sendRESTMessage(@PathVariable UUID conversationId, @RequestBody MessagePayload payload) {
        UUID senderId = UUID.fromString(payload.getSenderId());
        
        ChatMessage msg = chatService.saveMessage(
            conversationId,
            senderId,
            payload.getContent(),
            payload.getType(),
            null
        );

        // Fetch conversation to determine the receiver
        Conversation conv = conversationRepository.findById(conversationId).orElse(null);
        if (conv != null) {
            UUID receiverId = conv.getFarmer().getId().equals(senderId) ? conv.getBuyer().getId() : conv.getFarmer().getId();
            // Send Notification
            notificationService.createNotification(
                receiverId,
                "New Chat Message",
                "You have a new message: " + payload.getContent(),
                "CHAT_MESSAGE",
                conversationId
            );
        }

        // Broadcast to WebSocket clients
        messagingTemplate.convertAndSend("/topic/conversation." + conversationId, msg);
        
        return ResponseEntity.ok(msg);
    }

    @PostMapping("/offers")
    public ResponseEntity<CustomOffer> createCustomOffer(@RequestBody Map<String, String> payload) {
        UUID conversationId = UUID.fromString(payload.get("conversationId"));
        UUID sellerId = UUID.fromString(payload.get("sellerId"));
        UUID buyerId = UUID.fromString(payload.get("buyerId"));
        Double price = Double.parseDouble(payload.get("price"));
        String delivery = payload.get("deliveryTime");
        String metadata = payload.get("metadata"); // any extra json details

        CustomOffer offer = chatService.createCustomOffer(conversationId, sellerId, buyerId, price, delivery, metadata);

        // Also broadcast the offer as a chat message
        ChatMessage msg = chatService.saveMessage(conversationId, sellerId, "System: A new custom offer has been sent.", "OFFER", offer.getId());
        
        // Broadcast over STOMP
        messagingTemplate.convertAndSend("/topic/conversation." + conversationId.toString(), msg);

        // Notify Buyer
        notificationService.createNotification(
            buyerId,
            "New Custom Offer",
            "You received a new custom offer for Rs. " + price,
            "CUSTOM_OFFER",
            offer.getId()
        );

        return ResponseEntity.ok(offer);
    }
    
    @PostMapping("/offers/{offerId}/accept")
    public ResponseEntity<CustomOffer> acceptOffer(@PathVariable UUID offerId) {
        // Technically this should be after Payment Success webhook according to DSR,
        // but adding here for direct test flows if needed.
        CustomOffer offer = chatService.updateOfferStatus(offerId, "ACCEPTED");
        return ResponseEntity.ok(offer);
    }

    @GetMapping("/offers/{offerId}")
    public ResponseEntity<CustomOffer> getOfferDetails(@PathVariable UUID offerId) {
        return ResponseEntity.ok(chatService.getCustomOffer(offerId));
    }

    // --- WebSocket Endpoints ---

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload MessagePayload payload) {
        UUID convId = UUID.fromString(payload.getConversationId());
        UUID senderId = UUID.fromString(payload.getSenderId());
        
        ChatMessage msg = chatService.saveMessage(
            convId,
            senderId,
            payload.getContent(),
            payload.getType(),
            null
        );

        // Broadcast to specific conversation
        messagingTemplate.convertAndSend("/topic/conversation." + payload.getConversationId(), msg);
    }

    public static class MessagePayload {
        private String conversationId;
        private String senderId;
        private String content;
        private String type; // TEXT
        
        // Getters and Setters
        public String getConversationId() { return conversationId; }
        public void setConversationId(String conversationId) { this.conversationId = conversationId; }
        public String getSenderId() { return senderId; }
        public void setSenderId(String senderId) { this.senderId = senderId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }
}
