package com.agrolink.backend.repository;

import com.agrolink.backend.model.Product;
import com.agrolink.backend.model.ProductStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByStatus(ProductStatus status);

    List<Product> findByFarmerId(UUID farmerId);

    List<Product> findByCategory_Type(String type);

    List<Product> findByCategory_TypeAndStatus(String type, ProductStatus status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Product p SET p.quantity = p.quantity - :deduction WHERE p.id = :id AND p.quantity >= :deduction")
    int deductStock(@org.springframework.data.repository.query.Param("id") UUID id, @org.springframework.data.repository.query.Param("deduction") java.math.BigDecimal deduction);
}
