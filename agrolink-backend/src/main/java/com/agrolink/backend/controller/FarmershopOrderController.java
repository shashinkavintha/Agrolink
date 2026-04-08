package com.agrolink.backend.controller;

import com.agrolink.backend.model.FarmershopOrder;
import com.agrolink.backend.model.OrderStatus;
import com.agrolink.backend.service.FarmershopOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/farmershop-orders")
public class FarmershopOrderController {

    @Autowired
    private FarmershopOrderService orderService;

    @GetMapping
    public List<FarmershopOrder> getAllOrders(@RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) UUID buyerId,
            @RequestParam(required = false) UUID farmerId,
            @RequestParam(required = false) UUID driverId) {
        if (buyerId != null) {
            return orderService.getOrdersByBuyer(buyerId);
        }
        if (farmerId != null) {
            return orderService.getOrdersByFarmer(farmerId);
        }
        if (driverId != null) {
            return orderService.getOrdersByDriver(driverId);
        }
        if (status != null) {
            return orderService.getOrdersByStatus(status);
        }
        return orderService.getAllOrders();
    }

    @PostMapping
    public FarmershopOrder createOrder(@RequestBody FarmershopOrder order) {
        return orderService.createOrder(order);
    }

    @PostMapping("/checkout")
    public ResponseEntity<List<FarmershopOrder>> checkout(@RequestBody com.agrolink.backend.dto.CheckoutRequest request) {
        try {
            List<FarmershopOrder> orders = orderService.placeOrder(request);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<FarmershopOrder> updateStatus(@PathVariable UUID id, @RequestParam OrderStatus status) {
        FarmershopOrder updated = orderService.updateStatus(id, status);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/farmer-accept")
    public ResponseEntity<FarmershopOrder> farmerAccept(@PathVariable UUID id,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        FarmershopOrder updated = orderService.farmerAcceptOrder(id, lat, lon);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/driver-accept")
    public ResponseEntity<?> driverAccept(@PathVariable UUID id, @RequestParam UUID driverId) {
        try {
            FarmershopOrder updated = orderService.driverAcceptJob(id, driverId);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/nearby")
    public List<FarmershopOrder> getNearbyJobs(@RequestParam double lat, @RequestParam double lon) {
        return orderService.getNearbyAvailableJobs(lat, lon);
    }
}
