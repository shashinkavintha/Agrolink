package com.agrolink.backend.service;

import com.agrolink.backend.model.FarmershopOrder;
import com.agrolink.backend.model.FarmershopOrderItem;
import com.agrolink.backend.model.FarmershopProduct;
import com.agrolink.backend.model.OrderStatus;
import com.agrolink.backend.repository.FarmershopOrderRepository;
import com.agrolink.backend.repository.FarmershopProductRepository;
import com.agrolink.backend.repository.ProfileRepository;
import com.agrolink.backend.dto.CheckoutRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashMap;

@Service
public class FarmershopOrderService {

    @Autowired
    private FarmershopOrderRepository orderRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private FarmershopProductRepository productRepository;

    public List<FarmershopOrder> getAllOrders() {
        return orderRepository.findAll();
    }

    public List<FarmershopOrder> getOrdersByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status);
    }

    public List<FarmershopOrder> getOrdersByBuyer(UUID buyerId) {
        return orderRepository.findByBuyerId(buyerId);
    }

    public List<FarmershopOrder> getOrdersByFarmer(UUID farmerId) {
        return orderRepository.findByFarmerId(farmerId);
    }

    public List<FarmershopOrder> getOrdersByDriver(UUID driverId) {
        return orderRepository.findByDriverId(driverId);
    }

    public FarmershopOrder createOrder(FarmershopOrder order) {
        return orderRepository.save(order);
    }

    public FarmershopOrder updateStatus(UUID id, OrderStatus status) {
        System.out.println("🔄 updateStatus called for Farmershop Order: " + id + " -> " + status);
        return orderRepository.findById(id).map(order -> {
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(status);

            // Sync Pickup Location on ACCEPT
            if (status == OrderStatus.accepted) {
                if (order.getFarmer() != null) {
                    com.agrolink.backend.model.Profile farmer = profileRepository.findById(order.getFarmer().getId())
                            .orElse(order.getFarmer());

                    if (farmer.getLatitude() != null && farmer.getLongitude() != null) {
                        order.setPickupLatitude(farmer.getLatitude());
                        order.setPickupLongitude(farmer.getLongitude());
                    }
                }
            }

            FarmershopOrder savedOrder = orderRepository.save(order);

            // If status changed to delivered
            if (status == OrderStatus.delivered && oldStatus != OrderStatus.delivered) {
                com.agrolink.backend.model.Profile farmer = order.getFarmer();
                if (farmer != null) {
                    Integer currentOrders = farmer.getTotalOrders() != null ? farmer.getTotalOrders() : 0;
                    farmer.setTotalOrders(currentOrders + 1);

                    java.math.BigDecimal currentEarnings = farmer.getTotalEarnings() != null ? farmer.getTotalEarnings()
                            : java.math.BigDecimal.ZERO;
                    farmer.setTotalEarnings(currentEarnings.add(order.getTotalAmount()));

                    updateTopSellerStatus(farmer);
                    profileRepository.save(farmer);
                }
            }
            return savedOrder;
        }).orElse(null);
    }

    private void updateTopSellerStatus(com.agrolink.backend.model.Profile farmer) {
        int orders = farmer.getTotalOrders() != null ? farmer.getTotalOrders() : 0;
        double rating = farmer.getRating() != null ? farmer.getRating() : 0.0;
        java.math.BigDecimal earnings = farmer.getTotalEarnings() != null ? farmer.getTotalEarnings()
                : java.math.BigDecimal.ZERO;

        boolean isTopSeller = orders >= 100 && rating >= 4.8
                && earnings.compareTo(new java.math.BigDecimal("100000")) >= 0;
        farmer.setIsTopSeller(isTopSeller);
    }

    public FarmershopOrder farmerAcceptOrder(UUID orderId, Double lat, Double lon) {
        return orderRepository.findById(orderId).map(order -> {
            order.setStatus(OrderStatus.accepted);
            if (lat != null && lon != null) {
                order.setPickupLatitude(lat);
                order.setPickupLongitude(lon);
            }
            return orderRepository.save(order);
        }).orElse(null);
    }

    public List<FarmershopOrder> getNearbyAvailableJobs(double driverLat, double driverLon) {
        List<FarmershopOrder> orders = orderRepository.findByStatus(OrderStatus.accepted);
        List<FarmershopOrder> pendingOrders = orderRepository.findByStatus(OrderStatus.pending);
        orders.addAll(pendingOrders);

        for (FarmershopOrder o : orders) {
            if (o.getPickupLatitude() == null && o.getFarmer() != null) {
                com.agrolink.backend.model.Profile farmer = profileRepository.findById(o.getFarmer().getId())
                        .orElse(o.getFarmer());
                if (farmer != null && farmer.getLatitude() != null) {
                    o.setPickupLatitude(farmer.getLatitude());
                    o.setPickupLongitude(farmer.getLongitude());
                }
            }
        }
        return orders;
    }

    @org.springframework.transaction.annotation.Transactional
    public List<FarmershopOrder> placeOrder(CheckoutRequest request) {
        List<FarmershopOrder> createdOrders = new ArrayList<>();

        List<UUID> productIds = request.getItems().stream()
                .map(CheckoutRequest.CheckoutItem::getProductId)
                .collect(java.util.stream.Collectors.toList());
        List<FarmershopProduct> products = productRepository.findAllById(productIds);

        Map<UUID, FarmershopProduct> productMap = products.stream()
                .collect(java.util.stream.Collectors.toMap(FarmershopProduct::getId, p -> p));

        Map<UUID, List<CheckoutRequest.CheckoutItem>> itemsByFarmer = new HashMap<>();

        for (CheckoutRequest.CheckoutItem item : request.getItems()) {
            FarmershopProduct product = productMap.get(item.getProductId());
            if (product != null) {
                UUID fId = product.getFarmerId();
                if (fId != null) {
                    itemsByFarmer.computeIfAbsent(fId, k -> new ArrayList<>()).add(item);
                }
            }
        }

        com.agrolink.backend.model.Profile buyer = profileRepository.findById(request.getBuyerId())
                .orElseThrow(() -> new RuntimeException("Buyer not found"));

        for (Map.Entry<UUID, List<CheckoutRequest.CheckoutItem>> entry : itemsByFarmer.entrySet()) {
            UUID farmerId = entry.getKey();
            List<CheckoutRequest.CheckoutItem> farmerItems = entry.getValue();

            FarmershopOrder order = new FarmershopOrder();
            order.setBuyer(buyer);
            order.setContactNumber(request.getContactNumber());

            com.agrolink.backend.model.Profile farmer = profileRepository.findById(farmerId).orElse(null);

            if (farmer == null) {
                throw new RuntimeException("Farmer profile not found for ID: " + farmerId);
            }

            order.setFarmer(farmer);

            order.setPickupLatitude(farmer.getLatitude());
            order.setPickupLongitude(farmer.getLongitude());

            order.setDeliveryAddress(request.getDeliveryAddress());
            order.setDeliveryLatitude(request.getDeliveryLatitude());
            order.setDeliveryLongitude(request.getDeliveryLongitude());
            order.setStatus(OrderStatus.pending);

            java.math.BigDecimal orderTotal = java.math.BigDecimal.ZERO;
            List<FarmershopOrderItem> orderItems = new ArrayList<>();

            for (CheckoutRequest.CheckoutItem itemDTO : farmerItems) {
                FarmershopProduct product = productMap.get(itemDTO.getProductId());
                FarmershopOrderItem orderItem = new FarmershopOrderItem();
                orderItem.setProduct(product);
                orderItem.setQuantity(java.math.BigDecimal.valueOf(itemDTO.getQuantity()));
                orderItem.setPriceAtTime(product.getPrice());
                orderItem.setOrder(order); 

                orderItems.add(orderItem);

                java.math.BigDecimal itemTotal = product.getPrice()
                        .multiply(java.math.BigDecimal.valueOf(itemDTO.getQuantity()));
                orderTotal = orderTotal.add(itemTotal);
            }

            order.setItems(orderItems);
            order.setTotalAmount(orderTotal);

            FarmershopOrder savedOrder = orderRepository.save(order);
            createdOrders.add(savedOrder);
        }

        return createdOrders;
    }

    public FarmershopOrder driverAcceptJob(UUID orderId, UUID driverId) {
        return orderRepository.findById(orderId).map(order -> {
            if (order.getStatus() != OrderStatus.accepted && order.getStatus() != OrderStatus.pending) {
                if (order.getStatus() != OrderStatus.accepted) {
                    throw new RuntimeException("Order is not available for pickup");
                }
            }

            order.setDriver(
                    profileRepository.findById(driverId).orElseThrow(() -> new RuntimeException("Driver not found")));

            if (order.getFarmer() != null) {
                Double latestLat = order.getFarmer().getLatitude();
                Double latestLng = order.getFarmer().getLongitude();

                if (latestLat != null && latestLng != null) {
                    order.setPickupLatitude(latestLat);
                    order.setPickupLongitude(latestLng);
                }
            }

            order.setStatus(OrderStatus.ready_to_ship); 
            return orderRepository.save(order);
        }).orElseThrow(() -> new RuntimeException("Order not found"));
    }
}
