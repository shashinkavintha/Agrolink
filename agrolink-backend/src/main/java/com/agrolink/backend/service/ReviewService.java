package com.agrolink.backend.service;

import com.agrolink.backend.model.Order;
import com.agrolink.backend.model.Profile;
import com.agrolink.backend.model.Review;
import com.agrolink.backend.model.Product;
import com.agrolink.backend.repository.OrderRepository;
import com.agrolink.backend.repository.ProfileRepository;
import com.agrolink.backend.repository.ReviewRepository;
import com.agrolink.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProfileRepository profileRepository;
    private final OrderRepository orderRepository;
    private final RankingService rankingService;
    private final ProductRepository productRepository;

    public ReviewService(ReviewRepository reviewRepository, ProfileRepository profileRepository,
            OrderRepository orderRepository, RankingService rankingService, ProductRepository productRepository) {
        this.reviewRepository = reviewRepository;
        this.profileRepository = profileRepository;
        this.orderRepository = orderRepository;
        this.rankingService = rankingService;
        this.productRepository = productRepository;
    }

    @Transactional
    public Review createReview(UUID orderId, UUID reviewerId, UUID revieweeId, UUID productId, Integer rating, String comment) {
        if (revieweeId == null && productId == null) {
            throw new IllegalArgumentException("Either reviewee or product must be specified");
        }

        if (revieweeId != null && reviewRepository.existsByOrderIdAndReviewerIdAndRevieweeId(orderId, reviewerId, revieweeId)) {
            throw new IllegalStateException("Review already exists for this order and user");
        }

        if (productId != null && reviewRepository.existsByOrderIdAndReviewerIdAndProductId(orderId, reviewerId, productId)) {
            throw new IllegalStateException("Review already exists for this order and product");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (order.getStatus() != com.agrolink.backend.model.OrderStatus.delivered) {
            throw new IllegalStateException("Order must be delivered to leave a review");
        }

        Profile reviewer = profileRepository.findById(reviewerId)
                .orElseThrow(() -> new IllegalArgumentException("Reviewer profile not found"));

        Review review = new Review();
        review.setOrder(order);
        review.setReviewer(reviewer);
        review.setRating(rating);
        review.setComment(comment);
        review.setCreatedAt(LocalDateTime.now());

        // Verified Purchase status
        boolean isVerified = order.getStatus() == com.agrolink.backend.model.OrderStatus.delivered;
        review.setIsVerifiedPurchase(isVerified);

        if (revieweeId != null) {
            Profile reviewee = profileRepository.findById(revieweeId)
                    .orElseThrow(() -> new IllegalArgumentException("Reviewee profile not found"));
            review.setReviewee(reviewee);

            // Fake Review Detection Heuristic: Rating Deviation
            double currentAvg = reviewee.getBayesianAverage() != null ? reviewee.getBayesianAverage() : 3.0;
            double deviation = Math.abs(rating - currentAvg);
            if (deviation >= 2.5) {
                review.setIsFlagged(true);
                review.setDetectionScore(0.85); 
                review.setFlagReason("High rating deviation (outlier)");
            }
        }

        if (productId != null) {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found"));
            boolean inOrder = order.getItems().stream().anyMatch(i -> i.getProduct() != null && i.getProduct().getId().equals(productId));
            if (!inOrder) {
                throw new IllegalStateException("Product not found in this order");
            }
            review.setProduct(product);
        }

        Review savedReview = reviewRepository.save(review);

        if (revieweeId != null) updateProfileRating(revieweeId);
        if (productId != null) updateProductRating(productId);

        return savedReview;
    }

    public List<Review> getReviewsForProfile(UUID profileId) {
        return reviewRepository.findByRevieweeId(profileId);
    }
    
    public List<Review> getReviewsForProduct(UUID productId) {
        return reviewRepository.findByProductId(productId);
    }

    private void updateProfileRating(UUID profileId) {
        rankingService.updateFarmerRanksAndKPIs(profileId);
    }

    @Transactional
    public Review updateReview(UUID orderId, UUID reviewerId, UUID revieweeId, UUID productId, Integer rating, String comment) {
        Review review;
        if (revieweeId != null) {
            review = reviewRepository.findByOrderIdAndReviewerIdAndRevieweeId(orderId, reviewerId, revieweeId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found for this order and user"));
        } else if (productId != null) {
            review = reviewRepository.findByOrderIdAndReviewerIdAndProductId(orderId, reviewerId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found for this order and product"));
        } else {
            throw new IllegalArgumentException("Must provide revieweeId or productId");
        }

        review.setRating(rating);
        review.setComment(comment);
        review.setCreatedAt(LocalDateTime.now());

        Review savedReview = reviewRepository.save(review);
        if (revieweeId != null) updateProfileRating(revieweeId);
        if (productId != null) updateProductRating(productId);
        return savedReview;
    }

    public Review getReview(UUID orderId, UUID reviewerId, UUID revieweeId, UUID productId) {
        if (revieweeId != null) {
            return reviewRepository.findByOrderIdAndReviewerIdAndRevieweeId(orderId, reviewerId, revieweeId).orElse(null);
        } else if (productId != null) {
            return reviewRepository.findByOrderIdAndReviewerIdAndProductId(orderId, reviewerId, productId).orElse(null);
        }
        return null;
    }

    private void updateProductRating(UUID productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);
        if (reviews.isEmpty()) return;
        double sum = reviews.stream().mapToInt(Review::getRating).sum();
        double average = sum / reviews.size();
        average = Math.round(average * 10.0) / 10.0;

        Product product = productRepository.findById(productId).orElseThrow();
        product.setRating(average);
        productRepository.save(product);
    }
}
