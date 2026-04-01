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
            
            // Automated Review Reply bot logic for Product reviews
            String reply = "";
            String lowerComment = comment != null ? comment.toLowerCase() : "";

            if (rating == 1) {
                if (lowerComment.contains("rot") || lowerComment.contains("bad") || lowerComment.contains("spoil") || lowerComment.contains("terrible")) {
                    reply = "We are incredibly sorry to hear that the product arrived in bad condition! Please contact support so we can make this right.";
                } else if (lowerComment.contains("late") || lowerComment.contains("delay") || lowerComment.contains("slow")) {
                    reply = "We sincerely apologize for the delayed delivery. We are working with our logistics team to ensure this doesn't happen again.";
                } else {
                    reply = "We are so sorry for your disappointing experience. We take your 1-star review very seriously and will use this to improve.";
                }
            } else if (rating == 2 || rating == 3) {
                if (lowerComment.contains("price") || lowerComment.contains("expensive")) {
                    reply = "Thank you for the feedback. We try our best to keep prices competitive while ensuring fair pay for our hardworking farmers.";
                } else {
                    reply = "We appreciate your honest feedback. We're sorry the product didn't fully meet your expectations, and we will strive to do better.";
                }
            } else if (rating == 4) {
                if (lowerComment.contains("good") || lowerComment.contains("nice")) {
                    reply = "Thank you for the 4-star review! We're glad you had a good experience. Let us know how we can earn that 5th star next time!";
                } else {
                    reply = "Thank you for your positive feedback! Your support means a lot to us.";
                }
            } else {
                if (lowerComment.contains("best") || lowerComment.contains("amazing") || lowerComment.contains("perfect") || lowerComment.contains("tasty") || lowerComment.contains("delicious")) {
                    reply = "Wow! Hearing such amazing feedback makes our day. Thank you so much for your support!";
                } else {
                    reply = "Thank you so much for your fantastic 5-star review! We are thrilled you loved the product.";
                }
            }
            review.setSellerReply(reply);
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

    @Transactional
    public Review replyToReview(UUID reviewId, String reply) {
        Review review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> new IllegalArgumentException("Review not found"));
        review.setSellerReply(reply);
        return reviewRepository.save(review);
    }

    @Transactional
    public void deleteReview(UUID reviewId, UUID reviewerId) {
        Review review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> new IllegalArgumentException("Review not found"));
            
        if (!review.getReviewer().getId().equals(reviewerId)) {
            throw new IllegalStateException("Only the creator can delete this review");
        }

        UUID revieweeId = review.getReviewee() != null ? review.getReviewee().getId() : null;
        UUID productId = review.getProduct() != null ? review.getProduct().getId() : null;

        reviewRepository.delete(review);

        if (revieweeId != null) updateProfileRating(revieweeId);
        if (productId != null) updateProductRating(productId);
    }

    private void updateProductRating(UUID productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);
        Product product = productRepository.findById(productId).orElseThrow();
        
        if (reviews.isEmpty()) {
            product.setRating(0.0);
            productRepository.save(product);
            return;
        }
        
        double sum = reviews.stream().mapToInt(Review::getRating).sum();
        double average = sum / (double) reviews.size();
        average = Math.round(average * 10.0) / 10.0;

        product.setRating(average);
        productRepository.save(product);
    }
}
