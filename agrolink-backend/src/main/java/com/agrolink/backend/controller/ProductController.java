package com.agrolink.backend.controller;

import com.agrolink.backend.model.Product;
import com.agrolink.backend.model.ProductStatus;
import com.agrolink.backend.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    @PostMapping
    public Product createProduct(@RequestBody Product product) {
        return productService.createProduct(product);
    }

    @GetMapping("/farmer/{farmerId}")
    public List<Product> getFarmerProducts(@PathVariable UUID farmerId) {
        return productService.getProductsByFarmer(farmerId);
    }

    @GetMapping("/pending")
    public List<Product> getPendingProducts() {
        return productService.getPendingProducts();
    }

    @GetMapping("/approved")
    public List<Product> getApprovedProducts() {
        return productService.getApprovedProducts();
    }

    @GetMapping("/all")
    public List<Product> getAllProductsList() {
        return productService.getAllProducts();
    }

    @GetMapping
    public List<Product> getAllProducts(@RequestParam(required = false) String categoryType) {
        if (categoryType != null) {
            return productService.getProductsByCategoryType(categoryType);
        }
        // If no filter, maybe return all approved? Or all products?
        // Ideally admin sees all including pending, but for now let's return approved
        // if no type,
        // OR better yet, let's keep it simple. If no type, return all/approved not
        // strictly defined here,
        // but let's assume getApprovedProducts handles the default view for users.
        // For admin management, they might want to see everything.
        // Let's defer to getApprovedProducts for public view.
        // For this endpoint:
        return productService.getApprovedProducts();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable UUID id, @RequestBody Product product) {
        Product updated = productService.updateProduct(id, product);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Product> updateStatus(@PathVariable UUID id, @RequestParam ProductStatus status) {
        Product updated = productService.updateStatus(id, status);
        if (updated != null)
            return ResponseEntity.ok(updated);
        return ResponseEntity.notFound().build();
    }
}
