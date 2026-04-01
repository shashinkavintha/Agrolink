package com.agrolink.backend.service;

import com.agrolink.backend.model.Product;
import com.agrolink.backend.model.ProductStatus;
import com.agrolink.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    public Product createProduct(Product product) {
        return productRepository.save(product);
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public List<Product> getProductsByFarmer(UUID farmerId) {
        return productRepository.findByFarmerId(farmerId);
    }

    public List<Product> getPendingProducts() {
        return productRepository.findByStatus(ProductStatus.pending);
    }

    public List<Product> getApprovedProducts() {
        return productRepository.findByStatus(ProductStatus.approved);
    }

    public Product updateStatus(UUID id, ProductStatus status) {
        return productRepository.findById(id).map(product -> {
            product.setStatus(status);
            return productRepository.save(product);
        }).orElse(null);
    }

    public Product updateProduct(UUID id, Product updatedProduct) {
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

    public List<Product> getProductsByCategoryType(String type) {
        return productRepository.findByCategory_TypeAndStatus(type, ProductStatus.approved);
    }
}
