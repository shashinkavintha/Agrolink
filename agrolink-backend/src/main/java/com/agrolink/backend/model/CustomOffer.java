package com.agrolink.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "custom_offers")
public class CustomOffer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @ManyToOne
    @JoinColumn(name = "seller_id")
    private Profile seller;

    @ManyToOne
    @JoinColumn(name = "buyer_id")
    private Profile buyer;

    private Double totalPrice;
    private String deliveryTime; // e.g. "3 Days"
    
    private String status = "PENDING"; // PENDING, ACCEPTED, DECLINED, PAID

    @Column(columnDefinition = "TEXT")
    private String offerMetadata; // JSON string payload

    private UUID relatedOrderId;

    private LocalDateTime createdAt = LocalDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }

    public Profile getSeller() { return seller; }
    public void setSeller(Profile seller) { this.seller = seller; }

    public Profile getBuyer() { return buyer; }
    public void setBuyer(Profile buyer) { this.buyer = buyer; }

    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) { this.totalPrice = totalPrice; }

    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOfferMetadata() { return offerMetadata; }
    public void setOfferMetadata(String offerMetadata) { this.offerMetadata = offerMetadata; }

    public UUID getRelatedOrderId() { return relatedOrderId; }
    public void setRelatedOrderId(UUID relatedOrderId) { this.relatedOrderId = relatedOrderId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
