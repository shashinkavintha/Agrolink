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
    public Review createReview(UUID orderId, UUID reviewerId, UUID revieweeId, UUID productId, UUID shopProductId, Integer rating, String comment, String sellerReply) {
        if (revieweeId == null && productId == null && shopProductId == null) {
            throw new IllegalArgumentException("Either reviewee, product, or shop product must be specified");
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
        review.setSellerReply(sellerReply);
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

        if (shopProductId != null) {
            if (reviewRepository.existsByOrderIdAndReviewerIdAndShopProductId(orderId, reviewerId, shopProductId)) {
                throw new IllegalStateException("Review already exists for this order and shop product");
            }
            review.setShopProductId(shopProductId);
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

    public List<Review> getReviewsForShopProduct(UUID shopProductId) {
        return reviewRepository.findByShopProductId(shopProductId);
    }

    private void updateProfileRating(UUID profileId) {
        rankingService.updateFarmerRanksAndKPIs(profileId);
    }

    @Transactional
    public Review updateReview(UUID orderId, UUID reviewerId, UUID revieweeId, UUID productId, UUID shopProductId, Integer rating, String comment, String sellerReply) {
        Review review;
        if (revieweeId != null) {
            review = reviewRepository.findByOrderIdAndReviewerIdAndRevieweeId(orderId, reviewerId, revieweeId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found for this order and user"));
        } else if (productId != null) {
            review = reviewRepository.findByOrderIdAndReviewerIdAndProductId(orderId, reviewerId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found for this order and product"));
        } else if (shopProductId != null) {
            review = reviewRepository.findByOrderIdAndReviewerIdAndShopProductId(orderId, reviewerId, shopProductId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found for this order and shop product"));
        } else {
            throw new IllegalArgumentException("Must provide revieweeId, productId, or shopProductId");
        }

        review.setRating(rating);
        review.setComment(comment);
        if (sellerReply != null) {
            review.setSellerReply(sellerReply);
        }
        review.setCreatedAt(LocalDateTime.now());

        Review savedReview = reviewRepository.save(review);
        if (revieweeId != null) updateProfileRating(revieweeId);
        if (productId != null) updateProductRating(productId);
        return savedReview;
    }

    public Review getReview(UUID orderId, UUID reviewerId, UUID revieweeId, UUID productId, UUID shopProductId) {
        if (revieweeId != null) {
            return reviewRepository.findByOrderIdAndReviewerIdAndRevieweeId(orderId, reviewerId, revieweeId).orElse(null);
        } else if (productId != null) {
            return reviewRepository.findByOrderIdAndReviewerIdAndProductId(orderId, reviewerId, productId).orElse(null);
        } else if (shopProductId != null) {
            return reviewRepository.findByOrderIdAndReviewerIdAndShopProductId(orderId, reviewerId, shopProductId).orElse(null);
        }
        return null;
    }

    private void updateProductRating(UUID productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);
        if (reviews.isEmpty()) {
            Product product = productRepository.findById(productId).orElseThrow();
            product.setRating(0.0);
            productRepository.save(product);
            return;
        }
        double sum = reviews.stream().mapToInt(Review::getRating).sum();
        double average = sum / reviews.size();
        average = Math.round(average * 10.0) / 10.0;

        Product product = productRepository.findById(productId).orElseThrow();
        product.setRating(average);
        productRepository.save(product);
    }

    @Transactional
    public void deleteReview(UUID reviewId, UUID reviewerId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        if (!review.getReviewer().getId().equals(reviewerId)) {
            throw new IllegalStateException("You can only delete your own reviews");
        }

        UUID revieweeId = review.getReviewee() != null ? review.getReviewee().getId() : null;
        UUID productId = review.getProduct() != null ? review.getProduct().getId() : null;

        reviewRepository.delete(review);

        // Recalculate ratings after deletion
        if (revieweeId != null) updateProfileRating(revieweeId);
        if (productId != null) updateProductRating(productId);
    }
}
