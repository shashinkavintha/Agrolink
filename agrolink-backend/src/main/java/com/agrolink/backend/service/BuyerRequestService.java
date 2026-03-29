package com.agrolink.backend.service;

import java.math.BigDecimal;
import com.agrolink.backend.model.*;
import com.agrolink.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class BuyerRequestService {

    @Autowired
    private BuyerRequestRepository requestRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private OrderRepository orderRepository;

    public BuyerRequest createRequest(BuyerRequest request) {
        request.setStatus("OPEN");
        BuyerRequest savedRequest = requestRepository.save(request);

        // Notify Top Seller Farmers (Rating >= 4.5)
        // Notify Top Seller Farmers (Rating >= 4.5) -> Temporarily changed to 0.0 for
        // testing
        // Notify Top Seller Farmers (Rating >= 4.5) -> Temporarily changed to 0.0 for
        // testing
        // Fetch all farmers and filter in memory to handle NULL ratings safely
        System.out.println("DEBUG: Starting notification logic");
        List<Profile> allFarmers = profileRepository.findByStatus(UserStatus.approved).stream()
                .filter(p -> p.getRole() == UserRole.farmer)
                .toList();
        System.out.println("DEBUG: Total approved farmers found: " + allFarmers.size());

        List<Profile> topSellers = allFarmers.stream()
                .filter(p -> {
                    boolean isTop = Boolean.TRUE.equals(p.getIsTopSeller());
                    System.out.println("DEBUG: Checking farmer: " + p.getEmail() + " | Top Seller: " + isTop);
                    return isTop;
                })
                .toList();

        System.out.println("DEBUG: Found " + topSellers.size() + " farmers to notify out of " + allFarmers.size());

        for (Profile farmer : topSellers) {
            Notification notification = new Notification();
            notification.setRecipient(farmer);
            notification.setTitle("New Buyer Request!");
            notification
                    .setMessage("A new request for " + request.getCategory() + " matches your profile. Check it out!");
            notification.setType("REQUEST_ALERT");
            notification.setRelatedId(savedRequest.getId());
            notificationRepository.save(notification);
        }

        return savedRequest;
    }

    public List<BuyerRequest> getAllRequests() {
        return requestRepository.findAll();
    }

    public BuyerRequest getRequestById(UUID id) {
        return requestRepository.findById(id).orElseThrow(() -> new RuntimeException("Request not found"));
    }

    public List<BuyerRequest> getRequestsByBuyer(UUID buyerId) {
        return requestRepository.findByBuyerId(buyerId);
    }

    public void deleteRequest(UUID id) {
        requestRepository.deleteById(id);
    }

    public BuyerRequest updateRequest(UUID id, BuyerRequest updatedRequest) {
        return requestRepository.findById(id).map(request -> {
            request.setCategory(updatedRequest.getCategory());
            request.setDescription(updatedRequest.getDescription());
            request.setBudget(updatedRequest.getBudget());
            request.setQuantity(updatedRequest.getQuantity());
            request.setUnit(updatedRequest.getUnit());
            return requestRepository.save(request);
        }).orElseThrow(() -> new RuntimeException("Request not found"));
    }

    public com.agrolink.backend.model.Order acceptRequest(UUID requestId, UUID farmerId) {
        BuyerRequest request = getRequestById(requestId);
        Profile farmer = profileRepository.findById(farmerId)
                .orElseThrow(() -> new RuntimeException("Farmer not found"));

        // Create Order
        com.agrolink.backend.model.Order order = new com.agrolink.backend.model.Order();

        // Explicitly fetch fresh buyer profile to ensure we have location data
        Profile buyer = profileRepository.findById(request.getBuyer().getId())
                .orElseThrow(() -> new RuntimeException("Buyer profile not found"));

        order.setBuyer(buyer);
        order.setFarmer(farmer);
        order.setStatus(OrderStatus.accepted); // Directly accepted by farmer

        if (farmer.getLatitude() != null && farmer.getLongitude() != null) {
            order.setPickupLatitude(farmer.getLatitude());
            order.setPickupLongitude(farmer.getLongitude());
        }

        // Set Delivery Location from Fresh Buyer Profile
        Double lat = buyer.getLatitude();
        Double lng = buyer.getLongitude();
        System.out.println("DEBUG: Buyer ID: " + buyer.getId());
        System.out.println("DEBUG: Fresh Buyer Location: Lat=" + lat + ", Lng=" + lng);

        if (lat != null && lng != null) {
            order.setDeliveryLatitude(lat);
            order.setDeliveryLongitude(lng);
            System.out.println("DEBUG: Order Delivery Location SET.");
        } else {
            System.out.println("DEBUG: Buyer Profile has NULL location. Order Delivery Location will be NULL.");
        }

        order.setTotalAmount(java.math.BigDecimal.ZERO); // Temporary, will be updated below
        order.setDeliveryAddress("Buyer Location");

        // Create Order Item
        com.agrolink.backend.model.OrderItem item = new com.agrolink.backend.model.OrderItem();
        item.setOrder(order);
        item.setCustomItemName(
                request.getCategory() + " - " + request.getDescription() + " (" + request.getUnit() + ")");

        BigDecimal quantity = request.getQuantity() != null ? BigDecimal.valueOf(request.getQuantity())
                : BigDecimal.ONE;

        // FIXED: Budget is TOTAL amount, not unit price
        BigDecimal totalBudget = request.getBudget() != null ? BigDecimal.valueOf(request.getBudget())
                : BigDecimal.ZERO;
        BigDecimal unitPrice = quantity.compareTo(BigDecimal.ZERO) > 0
                ? totalBudget.divide(quantity, 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        item.setQuantity(quantity);
        item.setPriceAtTime(unitPrice);

        // Also update total amount
        order.setTotalAmount(totalBudget); // Total is the Budget

        order.setItems(java.util.List.of(item));

        com.agrolink.backend.model.Order savedOrder = orderRepository.save(order);

        // Update Request Status
        request.setStatus("ACCEPTED");
        requestRepository.save(request);

        // Notify Buyer
        Notification notification = new Notification();
        notification.setRecipient(request.getBuyer());
        notification.setTitle("Request Accepted!");
        notification.setMessage(
                "Farmer " + farmer.getFullName() + " has accepted your request for " + request.getCategory());
        notification.setType("ORDER_UPDATE");
        notification.setRelatedId(savedOrder.getId());
        notificationRepository.save(notification);

        return savedOrder;
    }
}
