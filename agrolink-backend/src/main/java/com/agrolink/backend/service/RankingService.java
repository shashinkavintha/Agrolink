package com.agrolink.backend.service;

import com.agrolink.backend.model.Order;
import com.agrolink.backend.model.OrderStatus;
import com.agrolink.backend.model.Profile;
import com.agrolink.backend.model.Review;
import com.agrolink.backend.repository.OrderRepository;
import com.agrolink.backend.repository.ProfileRepository;
import com.agrolink.backend.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RankingService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final ProfileRepository profileRepository;

    public RankingService(ReviewRepository reviewRepository, 
                          OrderRepository orderRepository,
                          ProfileRepository profileRepository) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.profileRepository = profileRepository;
    }

    @Transactional
    public void updateAllRanksAndKPIs() {
        List<Profile> farmers = profileRepository.findByRole(com.agrolink.backend.model.UserRole.farmer);
        for (Profile farmer : farmers) {
            updateFarmerRanksAndKPIs(farmer.getId());
        }
    }

    @Transactional
    public void updateFarmerRanksAndKPIs(UUID farmerId) {
        Profile farmer = profileRepository.findById(farmerId)
                .orElseThrow(() -> new IllegalArgumentException("Farmer not found"));

        updateRanking(farmer);
        updateKPIs(farmer);

        // Determine Top Seller Status
        boolean isTop = false;
        if (farmer.getWilsonScore() != null && farmer.getOrderDefectRate() != null && 
            farmer.getLateShipmentRate() != null && farmer.getPreFulfillmentCancellationRate() != null) {
            isTop = farmer.getWilsonScore() >= 0.5 && 
                    farmer.getOrderDefectRate() <= 1.0 && 
                    farmer.getLateShipmentRate() <= 4.0 && 
                    farmer.getPreFulfillmentCancellationRate() <= 2.5;
        }
        farmer.setIsTopSeller(isTop);

        profileRepository.save(farmer);
    }

    private void updateRanking(Profile farmer) {
        List<Review> reviews = reviewRepository.findByRevieweeId(farmer.getId());
        if (reviews.isEmpty()) {
            farmer.setRating(0.0);
            farmer.setWilsonScore(0.0);
            farmer.setBayesianAverage(0.0);
            return;
        }

        double sum = reviews.stream().mapToInt(Review::getRating).sum();
        double average = sum / reviews.size();
        farmer.setRating(Math.round(average * 10.0) / 10.0);

        // Wilson Score (Lower bound of 95% confidence interval)
        // Positive: 4 or 5 stars. Negative: 1, 2, 3 stars.
        long positive = reviews.stream().filter(r -> r.getRating() >= 4).count();
        long total = reviews.size();
        farmer.setWilsonScore(calculateWilsonScore(positive, total));

        // Bayesian Average
        // Formula: (v*R + m*C) / (v + m)
        // v = number of reviews for the farmer
        // R = average rating for the farmer
        // m = minimum reviews required (e.g., 5)
        // C = global average rating (e.g., 3.0)
        double globalAverage = 3.0;
        long minReviews = 5;
        farmer.setBayesianAverage(calculateBayesianAverage(average, (long) reviews.size(), globalAverage, minReviews));
    }

    private double calculateWilsonScore(long positive, long total) {
        if (total == 0) return 0.0;
        double z = 1.96; // 95% confidence
        double phat = (double) positive / total;
        double score = (phat + z * z / (2 * total) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * total)) / total)) / (1 + z * z / total);
        return Math.round(score * 1000.0) / 1000.0;
    }

    private double calculateBayesianAverage(double average, long count, double globalAverage, long minReviews) {
        double score = (count * average + minReviews * globalAverage) / (count + minReviews);
        return Math.round(score * 10.0) / 10.0;
    }

    private void updateKPIs(Profile farmer) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<Order> recentOrders = orderRepository.findByFarmerIdAndCreatedAtAfter(farmer.getId(), thirtyDaysAgo);

        if (recentOrders.isEmpty()) {
            farmer.setOrderDefectRate(0.0);
            farmer.setLateShipmentRate(0.0);
            farmer.setPreFulfillmentCancellationRate(0.0);
            return;
        }

        long totalCount = recentOrders.size();

        // 1. Order Defect Rate (ODR) < 1%
        // Track returns, disputes, and negative reviews (1, 2 stars)
        long defects = recentOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.disputed || hasNegativeReview(o, farmer.getId()))
                .count();
        farmer.setOrderDefectRate((double) defects / totalCount * 100);

        // 2. Late Shipment Rate < 4%
        // Expected dispatch: within 24 hours of creation (SLA)
        long lateShipments = recentOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.shipped || o.getStatus() == OrderStatus.delivered)
                .filter(o -> o.getDispatchedAt() != null && o.getDispatchedAt().isAfter(o.getCreatedAt().plusHours(24)))
                .count();
        farmer.setLateShipmentRate((double) lateShipments / totalCount * 100);

        // 3. Pre-Fulfillment Cancellation Rate < 2.5%
        // Canceled by seller before shipment
        long cancellations = recentOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.cancelled && "SELLER".equals(o.getCancellationReason()))
                .count();
        farmer.setPreFulfillmentCancellationRate((double) cancellations / totalCount * 100);
    }

    private boolean hasNegativeReview(Order order, UUID farmerId) {
        return reviewRepository.findByOrderIdAndReviewerIdAndRevieweeId(order.getId(), order.getBuyer().getId(), farmerId)
                .map(r -> r.getRating() <= 2)
                .orElse(false);
    }
}
