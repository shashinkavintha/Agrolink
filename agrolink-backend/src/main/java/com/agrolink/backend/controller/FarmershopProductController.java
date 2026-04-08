package com.agrolink.backend.controller;

import com.agrolink.backend.model.FarmershopProduct;
import com.agrolink.backend.model.ProductStatus;
import com.agrolink.backend.service.FarmershopProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/farmershop-products")
public class FarmershopProductController {

    @Autowired
    private FarmershopProductService productService;

    @PostMapping
    public FarmershopProduct createProduct(@RequestBody FarmershopProduct product) {
        return productService.createProduct(product);
    }

    @GetMapping("/farmer/{farmerId}")
    public List<FarmershopProduct> getFarmerProducts(@PathVariable UUID farmerId) {
        return productService.getProductsByFarmer(farmerId);
    }

    @GetMapping("/pending")
    public List<FarmershopProduct> getPendingProducts() {
        return productService.getPendingProducts();
    }

    @GetMapping("/approved")
    public List<FarmershopProduct> getApprovedProducts() {
        return productService.getApprovedProducts();
    }

    @GetMapping
    public List<FarmershopProduct> getAllProducts(@RequestParam(required = false) String categoryType) {
        if (categoryType != null) {
            return productService.getProductsByCategoryType(categoryType);
        }
        return productService.getApprovedProducts();
    }

    @PutMapping("/{id}")
    public ResponseEntity<FarmershopProduct> updateProduct(@PathVariable UUID id, @RequestBody FarmershopProduct product) {
        FarmershopProduct updated = productService.updateProduct(id, product);
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
    public ResponseEntity<FarmershopProduct> updateStatus(@PathVariable UUID id, @RequestParam ProductStatus status) {
        FarmershopProduct updated = productService.updateStatus(id, status);
        if (updated != null)
            return ResponseEntity.ok(updated);
        return ResponseEntity.notFound().build();
    }
}
