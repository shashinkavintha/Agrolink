package com.agrolink.backend.model;

import jakarta.persistence.*;


import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "profiles", schema = "public")

public class Profile {

    @Id
    private UUID id;

    @Column(name = "full_name")
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private UserStatus status;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "nic_front_url")
    private String nicFrontUrl;

    @Column(name = "nic_back_url")
    private String nicBackUrl;

    @Column(name = "buyer_type")
    private String buyerType;

    @Column(name = "proof_photo_url")
    private String proofPhotoUrl;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "vehicle_model")
    private String vehicleModel;

    @Column(name = "vehicle_plate_number")
    private String vehiclePlateNumber;

    @Column(name = "vehicle_photo_url")
    private String vehiclePhotoUrl;

    @Column(name = "vehicle_plate_photo_url")
    private String vehiclePlatePhotoUrl;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "rating")
    private Double rating = 0.0;

    @Column(name = "total_orders")
    private Integer totalOrders = 0;

    @Column(name = "wilson_score")
    private Double wilsonScore = 0.0;

    @Column(name = "bayesian_average")
    private Double bayesianAverage = 0.0;

    @Column(name = "order_defect_rate")
    private Double orderDefectRate = 0.0;

    @Column(name = "late_shipment_rate")
    private Double lateShipmentRate = 0.0;

    @Column(name = "pre_fulfillment_cancellation_rate")
    private Double preFulfillmentCancellationRate = 0.0;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = UserStatus.pending;
        }
    }

    // Manual getters and setters to ensure Jackson serializes them
    public String getVehiclePhotoUrl() {
        return vehiclePhotoUrl;
    }

    public void setVehiclePhotoUrl(String vehiclePhotoUrl) {
        this.vehiclePhotoUrl = vehiclePhotoUrl;
    }

    @Column(name = "total_earnings")
    private java.math.BigDecimal totalEarnings = java.math.BigDecimal.ZERO;

    @Column(name = "is_top_seller")
    private Boolean isTopSeller = false;

    public String getVehiclePlatePhotoUrl() {
        return vehiclePlatePhotoUrl;
    }

    public void setVehiclePlatePhotoUrl(String vehiclePlatePhotoUrl) {
        this.vehiclePlatePhotoUrl = vehiclePlatePhotoUrl;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getNicFrontUrl() {
        return nicFrontUrl;
    }

    public void setNicFrontUrl(String nicFrontUrl) {
        this.nicFrontUrl = nicFrontUrl;
    }

    public String getNicBackUrl() {
        return nicBackUrl;
    }

    public void setNicBackUrl(String nicBackUrl) {
        this.nicBackUrl = nicBackUrl;
    }

    public String getBuyerType() {
        return buyerType;
    }

    public void setBuyerType(String buyerType) {
        this.buyerType = buyerType;
    }

    public String getProofPhotoUrl() {
        return proofPhotoUrl;
    }

    public void setProofPhotoUrl(String proofPhotoUrl) {
        this.proofPhotoUrl = proofPhotoUrl;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehicleModel() {
        return vehicleModel;
    }

    public void setVehicleModel(String vehicleModel) {
        this.vehicleModel = vehicleModel;
    }

    public String getVehiclePlateNumber() {
        return vehiclePlateNumber;
    }

    public void setVehiclePlateNumber(String vehiclePlateNumber) {
        this.vehiclePlateNumber = vehiclePlateNumber;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Integer getTotalOrders() {
        return totalOrders;
    }

    public void setTotalOrders(Integer totalOrders) {
        this.totalOrders = totalOrders;
    }

    public java.math.BigDecimal getTotalEarnings() {
        return totalEarnings;
    }

    public void setTotalEarnings(java.math.BigDecimal totalEarnings) {
        this.totalEarnings = totalEarnings;
    }

    public Boolean getIsTopSeller() {
        return isTopSeller;
    }

    public void setIsTopSeller(Boolean isTopSeller) {
        this.isTopSeller = isTopSeller;
    }

    public Double getWilsonScore() {
        return wilsonScore;
    }

    public void setWilsonScore(Double wilsonScore) {
        this.wilsonScore = wilsonScore;
    }

    public Double getBayesianAverage() {
        return bayesianAverage;
    }

    public void setBayesianAverage(Double bayesianAverage) {
        this.bayesianAverage = bayesianAverage;
    }

    public Double getOrderDefectRate() {
        return orderDefectRate;
    }

    public void setOrderDefectRate(Double orderDefectRate) {
        this.orderDefectRate = orderDefectRate;
    }

    public Double getLateShipmentRate() {
        return lateShipmentRate;
    }

    public void setLateShipmentRate(Double lateShipmentRate) {
        this.lateShipmentRate = lateShipmentRate;
    }

    public Double getPreFulfillmentCancellationRate() {
        return preFulfillmentCancellationRate;
    }

    public void setPreFulfillmentCancellationRate(Double preFulfillmentCancellationRate) {
        this.preFulfillmentCancellationRate = preFulfillmentCancellationRate;
    }
}
