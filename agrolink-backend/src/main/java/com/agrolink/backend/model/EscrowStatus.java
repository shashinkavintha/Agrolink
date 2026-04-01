package com.agrolink.backend.model;

public enum EscrowStatus {
    PENDING,    // Order created but not paid
    HELD,       // Funds captured, held in escrow
    RELEASED,   // Funds released to seller
    REFUNDED,   // Funds refunded to buyer
    DISPUTED    // Funds frozen due to dispute
}
