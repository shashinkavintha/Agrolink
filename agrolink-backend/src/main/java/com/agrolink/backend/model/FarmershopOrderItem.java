package com.agrolink.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "farmershop_order_items", schema = "public")
public class FarmershopOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonBackReference
    private FarmershopOrder order;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = true)
    private FarmershopProduct product;

    @Column(name = "custom_item_name")
    private String customItemName;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(name = "price_at_time", nullable = false)
    private BigDecimal priceAtTime;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public FarmershopOrder getOrder() { return order; }
    public void setOrder(FarmershopOrder order) { this.order = order; }
    public FarmershopProduct getProduct() { return product; }
    public void setProduct(FarmershopProduct product) { this.product = product; }
    public String getCustomItemName() { return customItemName; }
    public void setCustomItemName(String customItemName) { this.customItemName = customItemName; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public BigDecimal getPriceAtTime() { return priceAtTime; }
    public void setPriceAtTime(BigDecimal priceAtTime) { this.priceAtTime = priceAtTime; }
}
