package com.agrolink.backend.repository;

import com.agrolink.backend.model.Order;
import com.agrolink.backend.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
        List<Order> findByBuyerId(UUID buyerId);

        List<Order> findByFarmerId(UUID farmerId);

        List<Order> findByDriverId(UUID driverId);

        List<Order> findByStatus(OrderStatus status);

        @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM orders o WHERE o.status = :status AND " +
                        "(6371 * acos(cos(radians(:driverLat)) * cos(radians(o.pickup_latitude)) * " +
                        "cos(radians(o.pickup_longitude) - radians(:driverLon)) + " +
                        "sin(radians(:driverLat)) * sin(radians(o.pickup_latitude)))) < :radiusKm", nativeQuery = true)
        List<Order> findNearbyOrders(@org.springframework.data.repository.query.Param("status") String status,
                        @org.springframework.data.repository.query.Param("driverLat") double driverLat,
                        @org.springframework.data.repository.query.Param("driverLon") double driverLon,
                        @org.springframework.data.repository.query.Param("radiusKm") double radiusKm);

        List<Order> findByFarmerIdAndCreatedAtAfter(UUID farmerId, java.time.LocalDateTime createdAt);
}
