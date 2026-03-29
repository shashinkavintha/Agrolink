package com.agrolink.backend.controller;

import com.agrolink.backend.model.Review;
import com.agrolink.backend.service.ReviewService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")

public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    public ResponseEntity<Review> createReview(@RequestBody ReviewRequest request) {
        Review review = reviewService.createReview(
                request.getOrderId(),
                request.getReviewerId(),
                request.getRevieweeId(),
                request.getProductId(),
                request.getRating(),
                request.getComment());
        return ResponseEntity.ok(review);
    }

    @GetMapping("/profile/{profileId}")
    public ResponseEntity<List<Review>> getReviewsForProfile(@PathVariable UUID profileId) {
        return ResponseEntity.ok(reviewService.getReviewsForProfile(profileId));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<Review>> getReviewsForProduct(@PathVariable UUID productId) {
        return ResponseEntity.ok(reviewService.getReviewsForProduct(productId));
    }

    @PutMapping
    public ResponseEntity<Review> updateReview(@RequestBody ReviewRequest request) {
        Review review = reviewService.updateReview(
                request.getOrderId(),
                request.getReviewerId(),
                request.getRevieweeId(),
                request.getProductId(),
                request.getRating(),
                request.getComment());
        return ResponseEntity.ok(review);
    }

    @GetMapping
    public ResponseEntity<Review> getReview(
            @RequestParam UUID orderId,
            @RequestParam UUID reviewerId,
            @RequestParam(required = false) UUID revieweeId,
            @RequestParam(required = false) UUID productId) {
        return ResponseEntity.ok(reviewService.getReview(orderId, reviewerId, revieweeId, productId));
    }

    @PutMapping("/{reviewId}/reply")
    public ResponseEntity<Review> replyToReview(@PathVariable UUID reviewId, @RequestBody java.util.Map<String, String> payload) {
        String reply = payload.get("reply");
        if (reply == null || reply.trim().isEmpty()) {
            throw new IllegalArgumentException("Reply text cannot be empty");
        }
        Review review = reviewService.replyToReview(reviewId, reply);
        return ResponseEntity.ok(review);
    }

    public static class ReviewRequest {
        private UUID orderId;
        private UUID reviewerId;
        private UUID revieweeId;
        private UUID productId;
        private Integer rating; // 1-5
        private String comment;

        public UUID getOrderId() {
            return orderId;
        }

        public void setOrderId(UUID orderId) {
            this.orderId = orderId;
        }

        public UUID getReviewerId() {
            return reviewerId;
        }

        public void setReviewerId(UUID reviewerId) {
            this.reviewerId = reviewerId;
        }

        public UUID getRevieweeId() {
            return revieweeId;
        }

        public void setRevieweeId(UUID revieweeId) {
            this.revieweeId = revieweeId;
        }

        public Integer getRating() {
            return rating;
        }

        public void setRating(Integer rating) {
            this.rating = rating;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }

        public UUID getProductId() {
            return productId;
        }

        public void setProductId(UUID productId) {
            this.productId = productId;
        }
    }
}
