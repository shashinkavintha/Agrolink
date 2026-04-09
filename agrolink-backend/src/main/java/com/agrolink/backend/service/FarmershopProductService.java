package com.agrolink.backend.service;

import com.agrolink.backend.model.FarmershopProduct;
import com.agrolink.backend.model.ProductStatus;
import com.agrolink.backend.repository.FarmershopProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class FarmershopProductService {

    @Autowired
    private FarmershopProductRepository productRepository;

    public FarmershopProduct createProduct(FarmershopProduct product) {
        return productRepository.save(product);
    }

    public List<FarmershopProduct> getProductsByFarmer(UUID farmerId) {
        return productRepository.findByFarmerId(farmerId);
    }

    public List<FarmershopProduct> getPendingProducts() {
        return productRepository.findByStatus(ProductStatus.pending);
    }

    public List<FarmershopProduct> getApprovedProducts() {
        return productRepository.findByStatus(ProductStatus.approved);
    }

    // New method for get all products bypass status
    public List<FarmershopProduct> getAllProducts() {
        return productRepository.findAll();
    }

    public FarmershopProduct updateStatus(UUID id, ProductStatus status) {
        return productRepository.findById(id).map(product -> {
            product.setStatus(status);
            return productRepository.save(product);
        }).orElse(null);
    }

    public FarmershopProduct updateProduct(UUID id, FarmershopProduct updatedProduct) {
        return productRepository.findById(id).map(product -> {
            product.setName(updatedProduct.getName());
            product.setDescription(updatedProduct.getDescription());
            product.setPrice(updatedProduct.getPrice());
            product.setQuantity(updatedProduct.getQuantity());
            product.setUnit(updatedProduct.getUnit());
            product.setImageUrl(updatedProduct.getImageUrl());
            product.setCategory(updatedProduct.getCategory());
            return productRepository.save(product);
        }).orElse(null);
    }

    public void deleteProduct(UUID id) {
        productRepository.deleteById(id);
    }

    public List<FarmershopProduct> getProductsByCategoryType(String type) {
        return productRepository.findByCategory_TypeAndStatus(type, ProductStatus.approved);
    }

    public FarmershopProduct getProductById(UUID id) {
        return productRepository.findById(id).orElse(null);
    }
}
