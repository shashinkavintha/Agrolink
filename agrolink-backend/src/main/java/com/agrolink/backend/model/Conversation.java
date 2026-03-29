package com.agrolink.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conversations")
public class Conversation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "farmer_id")
    private Profile farmer;

    @ManyToOne
    @JoinColumn(name = "buyer_id")
    private Profile buyer;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public Profile getFarmer() { return farmer; }
    public void setFarmer(Profile farmer) { this.farmer = farmer; }
    
    public Profile getBuyer() { return buyer; }
    public void setBuyer(Profile buyer) { this.buyer = buyer; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
