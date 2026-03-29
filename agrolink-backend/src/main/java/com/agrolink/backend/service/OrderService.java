package com.agrolink.backend.service;

import com.agrolink.backend.model.Order;
import com.agrolink.backend.model.OrderStatus;
import com.agrolink.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.math.BigDecimal;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private RankingService rankingService;

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getOrdersByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status);
    }

    public List<Order> getOrdersByBuyer(UUID buyerId) {
        return orderRepository.findByBuyerId(buyerId);
    }

    public List<Order> getOrdersByFarmer(UUID farmerId) {
        return orderRepository.findByFarmerId(farmerId);
    }

    public List<Order> getOrdersByDriver(UUID driverId) {
        return orderRepository.findByDriverId(driverId);
    }

    public Order createOrder(Order order) {
        return orderRepository.save(order);
    }

    public Order updateStatus(UUID id, OrderStatus status) {
        return updateStatus(id, status, null);
    }

    @Transactional
    public Order updateStatus(UUID id, OrderStatus status, String cancellationReason) {
        System.out.println("🔄 updateStatus called for Order: " + id + " -> " + status);
        return orderRepository.findById(id).map(order -> {
            OrderStatus oldStatus = order.getStatus();
            System.out.println("   Current Status: " + oldStatus);
            order.setStatus(status);

            // Detailed Status Tracking
            if (status == OrderStatus.shipped && oldStatus != OrderStatus.shipped) {
                order.setDispatchedAt(java.time.LocalDateTime.now());
            } else if (status == OrderStatus.delivered && oldStatus != OrderStatus.delivered) {
                order.setDeliveredAt(java.time.LocalDateTime.now());
            } else if (status == OrderStatus.cancelled && oldStatus != OrderStatus.cancelled) {
                order.setCancelledAt(java.time.LocalDateTime.now());
                order.setCancellationReason(cancellationReason != null ? cancellationReason : "BUYER"); // Default to BUYER
            }

            // Sync Pickup Location on ACCEPT
            if (status == OrderStatus.accepted) {
                if (order.getFarmer() != null) {
                    // Refresh farmer from DB to get latest location
                    com.agrolink.backend.model.Profile farmer = profileRepository.findById(order.getFarmer().getId())
                            .orElse(order.getFarmer());

                    if (farmer.getLatitude() != null && farmer.getLongitude() != null) {
                        order.setPickupLatitude(farmer.getLatitude());
                        order.setPickupLongitude(farmer.getLongitude());
                        System.out.println("📍 Synced Order " + id + " pickup loc to Farmer loc: "
                                + farmer.getLatitude() + ", " + farmer.getLongitude());
                    } else {
                        System.out.println("⚠️ Farmer has no location to sync for Order " + id);
                    }
                }
            }

            Order savedOrder = orderRepository.save(order);
            System.out.println("✅ Order saved with status: " + savedOrder.getStatus());

            // Update Farmer Stats
            com.agrolink.backend.model.Profile farmer = order.getFarmer();
            if (farmer != null) {
                if (status == OrderStatus.delivered && oldStatus != OrderStatus.delivered) {
                    Integer currentOrders = farmer.getTotalOrders() != null ? farmer.getTotalOrders() : 0;
                    farmer.setTotalOrders(currentOrders + 1);

                    java.math.BigDecimal currentEarnings = farmer.getTotalEarnings() != null ? farmer.getTotalEarnings()
                            : java.math.BigDecimal.ZERO;
                    farmer.setTotalEarnings(currentEarnings.add(order.getTotalAmount()));
                    profileRepository.save(farmer);
                }
                
                // Recalculate Ranks & KPIs
                rankingService.updateFarmerRanksAndKPIs(farmer.getId());
            }
            return savedOrder;
        }).orElse(null);
    }


    @Transactional
    public Order farmerAcceptOrder(UUID orderId, Double lat, Double lon) {
        return orderRepository.findById(orderId).map(order -> {
            order.setStatus(OrderStatus.accepted);
            if (lat != null && lon != null) {
                order.setPickupLatitude(lat);
                order.setPickupLongitude(lon);
            }
            return orderRepository.save(order);
        }).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Order> getNearbyAvailableJobs(double driverLat, double driverLon) {
        System.out.println("🔍 getNearbyAvailableJobs called. Driver Lat/Lon: " + driverLat + ", " + driverLon);

        // Explicitly requested by user: Only show orders accepted by the farmer
        List<Order> orders = orderRepository.findByStatus(OrderStatus.accepted);

        System.out.println("   Found " + orders.size() + " available (accepted) orders.");
        return orders;
    }

    @Autowired
    private com.agrolink.backend.repository.ProfileRepository profileRepository;

    @Autowired
    private com.agrolink.backend.repository.ProductRepository productRepository;

    @Autowired
    private com.agrolink.backend.repository.FarmerShopProductRepository farmerShopProductRepository;

    @org.springframework.transaction.annotation.Transactional
    public List<Order> placeOrder(com.agrolink.backend.dto.CheckoutRequest request) {
        System.out.println("📦 Placing order for buyer: " + request.getBuyerId());
        List<Order> createdOrders = new java.util.ArrayList<>();

        // 1. Fetch relevant products (both regular and farmer shop products)
        List<UUID> productIds = request.getItems().stream()
                .map(com.agrolink.backend.dto.CheckoutRequest.CheckoutItem::getProductId)
                .collect(java.util.stream.Collectors.toList());
        
        List<com.agrolink.backend.model.Product> regularProducts = productRepository.findAllById(productIds);
        List<com.agrolink.backend.model.FarmerShopProduct> shopProducts = farmerShopProductRepository.findAllById(productIds);

        // Create a map to track which IDs we found
        Map<UUID, Object> productMap = new java.util.HashMap<>();
        regularProducts.forEach(p -> productMap.put(p.getId(), p));
        shopProducts.forEach(p -> productMap.put(p.getId(), p));

        System.out.println("Found " + regularProducts.size() + " regular products and " + shopProducts.size() + " shop products");

        // 2. Group items by Farmer ID / Admin ID
        Map<UUID, List<com.agrolink.backend.dto.CheckoutRequest.CheckoutItem>> itemsByFarmer = new java.util.HashMap<>();

        for (com.agrolink.backend.dto.CheckoutRequest.CheckoutItem item : request.getItems()) {
            Object productObj = productMap.get(item.getProductId());
            
            if (productObj instanceof com.agrolink.backend.model.Product) {
                com.agrolink.backend.model.Product product = (com.agrolink.backend.model.Product) productObj;
                UUID fId = product.getFarmerId();
                if (fId != null) {
                    itemsByFarmer.computeIfAbsent(fId, k -> new java.util.ArrayList<>()).add(item);
                } else {
                    System.err.println("⚠️ Warning: Product " + product.getId() + " has no farmerId!");
                }
            } else if (productObj instanceof com.agrolink.backend.model.FarmerShopProduct) {
                com.agrolink.backend.model.FarmerShopProduct product = (com.agrolink.backend.model.FarmerShopProduct) productObj;
                UUID adminId = product.getAdminId();
                if (adminId != null) {
                    itemsByFarmer.computeIfAbsent(adminId, k -> new java.util.ArrayList<>()).add(item);
                    System.out.println("   Grouped FarmerShopProduct " + product.getId() + " under admin " + adminId);
                } else {
                    System.err.println("⚠️ Warning: FarmerShopProduct " + product.getId() + " has no adminId!");
                }
            } else if (productObj != null) {
                System.err.println("⚠️ Unknown product type for ID: " + item.getProductId());
            } else {
                System.err.println("❌ Product not found: " + item.getProductId());
            }
        }

        // 3. Create Order per Farmer
        com.agrolink.backend.model.Profile buyer = profileRepository.findById(request.getBuyerId())
                .orElseThrow(() -> new RuntimeException("Buyer not found"));

        for (Map.Entry<UUID, List<com.agrolink.backend.dto.CheckoutRequest.CheckoutItem>> entry : itemsByFarmer
                .entrySet()) {
            UUID sellerId = entry.getKey(); // Could be farmerId or adminId
            List<com.agrolink.backend.dto.CheckoutRequest.CheckoutItem> sellerItems = entry.getValue();

            System.out.println("🚜 Creating order for sellerId: " + sellerId);

            Order order = new Order();
            order.setBuyer(buyer);
            order.setContactNumber(request.getContactNumber()); // Save contact number

            com.agrolink.backend.model.Profile seller = profileRepository.findById(sellerId).orElse(null);

            if (seller == null) {
                // For farmer shop products, the seller might be an admin without a profile
                // Try to create a minimal profile or skip location sync
                System.err.println("⚠️ Warning: Seller profile " + sellerId + " not found in DB! Using defaults for order.");
                // Continue without seller profile - it's optional for admin products
            } else {
                order.setFarmer(seller); // Set as Farmer/Seller

                if (seller.getLatitude() != null && seller.getLongitude() != null) {
                    order.setPickupLatitude(seller.getLatitude());
                    order.setPickupLongitude(seller.getLongitude());
                }
            }

            order.setDeliveryAddress(request.getDeliveryAddress());
            order.setDeliveryLatitude(request.getDeliveryLatitude());
            order.setDeliveryLongitude(request.getDeliveryLongitude());
            order.setStatus(OrderStatus.pending);

            // Calculate Total & Build Items
            java.math.BigDecimal orderTotal = java.math.BigDecimal.ZERO;
            List<com.agrolink.backend.model.OrderItem> orderItems = new java.util.ArrayList<>();

            for (com.agrolink.backend.dto.CheckoutRequest.CheckoutItem itemDTO : sellerItems) {
                Object productObj = productMap.get(itemDTO.getProductId());
                com.agrolink.backend.model.OrderItem orderItem = new com.agrolink.backend.model.OrderItem();
                
                BigDecimal itemPrice = java.math.BigDecimal.ZERO;
                
                if (productObj instanceof com.agrolink.backend.model.Product) {
                    com.agrolink.backend.model.Product product = (com.agrolink.backend.model.Product) productObj;
                    orderItem.setProduct(product);
                    itemPrice = product.getPrice();
                } else if (productObj instanceof com.agrolink.backend.model.FarmerShopProduct) {
                    com.agrolink.backend.model.FarmerShopProduct shopProduct = (com.agrolink.backend.model.FarmerShopProduct) productObj;
                    // For farmer shop products, store the name as custom item name and leave product_id null
                    orderItem.setCustomItemName(shopProduct.getName());
                    itemPrice = shopProduct.getPrice();
                    System.out.println("   Added FarmerShopProduct to order: " + shopProduct.getName() + " @ " + itemPrice);
                }
                
                orderItem.setQuantity(java.math.BigDecimal.valueOf(itemDTO.getQuantity()));
                orderItem.setPriceAtTime(itemPrice);
                orderItem.setOrder(order); // Link back

                orderItems.add(orderItem);

                java.math.BigDecimal itemTotal = itemPrice
                        .multiply(java.math.BigDecimal.valueOf(itemDTO.getQuantity()));
                orderTotal = orderTotal.add(itemTotal);
            }

            order.setItems(orderItems);
            order.setTotalAmount(orderTotal);

            Order savedOrder = orderRepository.save(order);
            createdOrders.add(savedOrder);
            System.out.println("✅ Order created: " + savedOrder.getId() + " for seller: " + sellerId);
        }

        return createdOrders;
    }

    @Transactional
    public Order driverAcceptJob(UUID orderId, UUID driverId) {
        return orderRepository.findById(orderId).map(order -> {
            if (order.getStatus() != OrderStatus.accepted) {
                throw new RuntimeException("Order is not available for pickup (Status must be ACCEPTED by farmer)");
            }

            // Assign Driver
            order.setDriver(
                    profileRepository.findById(driverId).orElseThrow(() -> new RuntimeException("Driver not found")));

            // UPDATE PICKUP LOCATION TO LATEST FARMER LOCATION
            if (order.getFarmer() != null) {
                // Determine latest location
                Double latestLat = order.getFarmer().getLatitude();
                Double latestLng = order.getFarmer().getLongitude();

                if (latestLat != null && latestLng != null) {
                    order.setPickupLatitude(latestLat);
                    order.setPickupLongitude(latestLng);
                }
            }

            order.setStatus(OrderStatus.ready_to_ship); // Driver assigned
            return orderRepository.save(order);
        }).orElseThrow(() -> new RuntimeException("Order not found"));
    }

}
