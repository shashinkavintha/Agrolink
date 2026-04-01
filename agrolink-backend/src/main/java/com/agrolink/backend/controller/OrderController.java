package com.agrolink.backend.controller;

import com.agrolink.backend.model.Order;
import com.agrolink.backend.model.OrderStatus;
import com.agrolink.backend.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping
    public List<Order> getAllOrders(@RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) UUID buyerId,
            @RequestParam(required = false) UUID farmerId,
            @RequestParam(required = false) UUID driverId) {
        System.out.println("GET /api/orders hit");
        if (buyerId != null) {
            System.out.println("Fetching orders for Buyer ID: " + buyerId);
            return orderService.getOrdersByBuyer(buyerId);
        }
        if (farmerId != null) {
            System.out.println("Fetching orders for Farmer ID: " + farmerId);
            return orderService.getOrdersByFarmer(farmerId);
        }
        if (driverId != null) {
            System.out.println("Fetching orders for Driver ID: " + driverId);
            return orderService.getOrdersByDriver(driverId);
        }
        if (status != null) {
            return orderService.getOrdersByStatus(status);
        }
        return orderService.getAllOrders();
    }

    @PostMapping
    public Order createOrder(@RequestBody Order order) {
        return orderService.createOrder(order);
    }

    @PostMapping("/checkout")
    public ResponseEntity<List<Order>> checkout(@RequestBody com.agrolink.backend.dto.CheckoutRequest request) {
        try {
            List<Order> orders = orderService.placeOrder(request);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(@PathVariable UUID id, @RequestParam OrderStatus status) {
        if (status == OrderStatus.delivered) {
            try {
                // Auto-release funds in Escrow when order is marked as delivered
                escrowService.releaseFunds(id); 
                return ResponseEntity.ok(orderService.getOrdersByStatus(OrderStatus.delivered).stream().filter(o -> o.getId().equals(id)).findFirst().orElse(null));
            } catch (Exception e) {
                System.err.println("Escrow Release bypassed/failed during status update: " + e.getMessage());
                // Fallback to normal status update if escrow wasn't held or failed
            }
        }

        Order updated = orderService.updateStatus(id, status);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/farmer-accept")
    public ResponseEntity<Order> farmerAccept(@PathVariable UUID id,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        Order updated = orderService.farmerAcceptOrder(id, lat, lon);
        if (updated != null) {
            // Updated to use centralized acceptance logic in EscrowService
            try {
                escrowService.confirmFarmerAcceptance(id);
            } catch (Exception e) {
                System.err.println("Fallback Escrow Acceptance failed: " + e.getMessage());
            }
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/driver-accept")
    public ResponseEntity<?> driverAccept(@PathVariable UUID id, @RequestParam UUID driverId) {
        try {
            Order updated = orderService.driverAcceptJob(id, driverId);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/nearby")
    public List<Order> getNearbyJobs(@RequestParam double lat, @RequestParam double lon) {
        System.out.println("Endpoint /nearby hit with lat: " + lat + ", lon: " + lon);
        return orderService.getNearbyAvailableJobs(lat, lon);
    }

    @Autowired
    private com.agrolink.backend.service.EscrowService escrowService;

    @PostMapping("/{id}/accept-delivery")
    public ResponseEntity<String> acceptDelivery(@PathVariable UUID id) {
        try {
            escrowService.releaseFunds(id);
            return ResponseEntity.ok("Delivery accepted and funds released to seller.");
        } catch (Exception e) {
            System.err.println("Accept Delivery Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/dispute")
    public ResponseEntity<String> disputeOrder(@PathVariable UUID id) {
        try {
            escrowService.disputeFunds(id);
            return ResponseEntity.ok("Order is now under dispute. Funds frozen.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
