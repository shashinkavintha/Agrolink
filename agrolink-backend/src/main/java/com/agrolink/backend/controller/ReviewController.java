package com.agrolink.backend.controller;

import com.agrolink.backend.model.Review;
import com.agrolink.backend.service.ReviewService;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
    public ResponseEntity<?> createReview(@RequestBody ReviewRequest request) {
        try {
            Review review = reviewService.createReview(
                    request.getOrderId(),
                    request.getReviewerId(),
                    request.getRevieweeId(),
                    request.getProductId(),
                    request.getRating(),
                    request.getComment());
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException | IllegalStateException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse("A server error occurred: " + e.getMessage() + " | Cause: " + (e.getCause() != null ? e.getCause().getMessage() : "null")));
        }
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
        try {
            Review review = reviewService.updateReview(
                    request.getOrderId(),
                    request.getReviewerId(),
                    request.getRevieweeId(),
                    request.getProductId(),
                    request.getRating(),
                    request.getComment());
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "A server error occurred: " + e.getMessage(), e);
        }
    }

    @GetMapping
    public ResponseEntity<Review> getReview(
            @RequestParam UUID orderId,
            @RequestParam UUID reviewerId,
            @RequestParam(required = false) UUID revieweeId,
            @RequestParam(required = false) UUID productId) {
        Review review = reviewService.getReview(orderId, reviewerId, revieweeId, productId);
        return ResponseEntity.ok(review);
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<?> deleteReview(
            @PathVariable UUID reviewId,
            @RequestParam UUID reviewerId) {
        try {
            reviewService.deleteReview(reviewId, reviewerId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "A server error occurred: " + e.getMessage(), e);
        }
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

    public static class ErrorResponse {
        private String message;
        public ErrorResponse(String message) { this.message = message; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
