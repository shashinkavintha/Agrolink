package com.agrolink.backend.model;

import jakarta.persistence.*;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Entity
@Table(name = "orders", schema = "public")

public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "buyer_id", nullable = false)
    private Profile buyer;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "order_status")
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "escrow_status")
    private EscrowStatus escrowStatus;

    @Column(name = "platform_commission", precision = 12, scale = 2)
    private BigDecimal platformCommission;

    @Column(name = "vendor_earning", precision = 12, scale = 2)
    private BigDecimal vendorEarning;

    @ManyToOne
    @JoinColumn(name = "farmer_id")
    private Profile farmer;

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private Profile driver;

    @Column(name = "delivery_address")
    private String deliveryAddress;

    @Column(name = "delivery_latitude")
    private Double deliveryLatitude;

    @Column(name = "delivery_longitude")
    private Double deliveryLongitude;

    @Column(name = "pickup_latitude")
    private Double pickupLatitude;

    @Column(name = "pickup_longitude")
    private Double pickupLongitude;

    @Column(name = "pickup_address")
    private String pickupAddress;

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "city")
    private String city;

    @Column(name = "province")
    private String province;

    @Column(name = "zip_code")
    private String zipCode;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "vat_amount", precision = 12, scale = 2)
    private BigDecimal vatAmount;

    @Column(name = "subtotal", precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    @com.fasterxml.jackson.annotation.JsonManagedReference
    private List<OrderItem> items;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = OrderStatus.pending;
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Profile getBuyer() {
        return buyer;
    }

    public void setBuyer(Profile buyer) {
        this.buyer = buyer;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public Profile getFarmer() {
        return farmer;
    }

    public void setFarmer(Profile farmer) {
        this.farmer = farmer;
    }

    public Profile getDriver() {
        return driver;
    }

    public void setDriver(Profile driver) {
        this.driver = driver;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public Double getDeliveryLatitude() {
        return deliveryLatitude;
    }

    public void setDeliveryLatitude(Double deliveryLatitude) {
        this.deliveryLatitude = deliveryLatitude;
    }

    public Double getDeliveryLongitude() {
        return deliveryLongitude;
    }

    public void setDeliveryLongitude(Double deliveryLongitude) {
        this.deliveryLongitude = deliveryLongitude;
    }

    public Double getPickupLatitude() {
        return pickupLatitude;
    }

    public void setPickupLatitude(Double pickupLatitude) {
        this.pickupLatitude = pickupLatitude;
    }

    public Double getPickupLongitude() {
        return pickupLongitude;
    }

    public void setPickupLongitude(Double pickupLongitude) {
        this.pickupLongitude = pickupLongitude;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
    }

    public String getZipCode() {
        return zipCode;
    }

    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public BigDecimal getVatAmount() {
        return vatAmount;
    }

    public void setVatAmount(BigDecimal vatAmount) {
        this.vatAmount = vatAmount;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
    }

    public LocalDateTime getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(LocalDateTime dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public EscrowStatus getEscrowStatus() {
        return escrowStatus;
    }

    public void setEscrowStatus(EscrowStatus escrowStatus) {
        this.escrowStatus = escrowStatus;
    }

    public BigDecimal getPlatformCommission() {
        return platformCommission;
    }

    public void setPlatformCommission(BigDecimal platformCommission) {
        this.platformCommission = platformCommission;
    }

    public BigDecimal getVendorEarning() {
        return vendorEarning;
    }

    public void setVendorEarning(BigDecimal vendorEarning) {
        this.vendorEarning = vendorEarning;
    }
}
