package com.agrolink.backend;

import com.agrolink.backend.model.Category;
import com.agrolink.backend.model.KnowledgeEntry;
import com.agrolink.backend.repository.CategoryRepository;
import com.agrolink.backend.repository.KnowledgeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class AgrolinkBackendApplication {

	@Bean
	public CommandLineRunner run(CategoryRepository categoryRepository) {
		return args -> {
			System.out.println("Checking for legacy categories...");
			List<Category> categories = categoryRepository.findAll();
			for (Category category : categories) {
				System.out.println("Category: " + category.getName() + ", Type: '" + category.getType() + "'");

				if (List.of("Vegetables", "Fruits", "Spices", "Grains").contains(category.getName())) {
					if (!"MARKETPLACE".equals(category.getType())) {
						category.setType("MARKETPLACE");
						categoryRepository.save(category);
						System.out.println("Correction: Moved " + category.getName() + " to MARKETPLACE");
					}
				} else if (category.getType() == null || category.getType().isEmpty()
						|| (!"MARKETPLACE".equals(category.getType()) && !"FARMERS_SHOP".equals(category.getType()))) {
					category.setType("FARMERS_SHOP");
					categoryRepository.save(category);
					System.out.println("Updated legacy category: " + category.getName() + " to FARMERS_SHOP");
				}
			}
		};
	}

	public static void main(String[] args) {
		SpringApplication.run(AgrolinkBackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner databaseFix(javax.sql.DataSource dataSource) {
		return args -> {
			try (java.sql.Connection conn = dataSource.getConnection();
					java.sql.Statement stmt = conn.createStatement()) {
				stmt.execute("ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL");
				stmt.execute("ALTER TABLE driver_locations ALTER COLUMN id TYPE bigint USING id::bigint");
				stmt.execute("ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL DEFAULT 'SENT'");
				// Admin override/learning columns for knowledge_entries
				stmt.execute("ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN NOT NULL DEFAULT FALSE");
				stmt.execute("ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS original_answer TEXT");
				stmt.execute("ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMP WITH TIME ZONE");
				stmt.execute("ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS corrected_by_user_id UUID");
				stmt.execute("ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS source_ticket_id UUID");
				System.out.println("Database fixes applied successfully!");
			} catch (Exception e) {
				System.out.println("Database fix failed: " + e.getMessage());
			}
		};
	}

	@Bean
	public CommandLineRunner seedKnowledge(KnowledgeRepository knowledgeRepository) {
		return args -> {
			if (knowledgeRepository.count() > 0) {
				System.out.println("Knowledge base already seeded, skipping.");
				return;
			}
			System.out.println("Seeding knowledge base...");
			List<KnowledgeEntry> entries = List.of(
				new KnowledgeEntry(
					"How do I track my order?",
					"Go to 'My Orders' in your profile. Each order shows its current status: Pending, Shipped, Out for Delivery, or Delivered. You can also see the assigned driver's details once your order is shipped.",
					"Orders", "track order delivery status shipped"),
				new KnowledgeEntry(
					"My order has not arrived yet",
					"If your order is past the estimated delivery date, first check the order status under 'My Orders'. If it still shows 'Shipped', the driver may be delayed. You can contact the driver directly through the app. If the issue persists beyond 24 hours, please raise a support ticket.",
					"Orders", "late order not arrived delayed delivery"),
				new KnowledgeEntry(
					"How do I cancel my order?",
					"You can cancel an order only if it is still in 'Pending' status. Go to 'My Orders', select the order, and tap 'Cancel Order'. Once the seller has accepted or shipped the order, cancellation is no longer available.",
					"Orders", "cancel order refund pending"),
				new KnowledgeEntry(
					"How do I request a refund?",
					"Refunds are processed if your order was cancelled before shipment, or if the item arrived damaged or incorrect. Go to 'My Orders', select the order, and tap 'Request Refund'. Refunds are typically processed within 5-7 business days to your original payment method.",
					"Payments", "refund money return payment"),
				new KnowledgeEntry(
					"Why was my payment declined?",
					"Payments can be declined due to insufficient balance, incorrect card details, or your bank blocking the transaction. Please verify your card details and try again. If the issue persists, try a different payment method or contact your bank.",
					"Payments", "payment failed declined card bank"),
				new KnowledgeEntry(
					"How do I change my delivery address?",
					"You can update your delivery address before the seller accepts your order. Go to 'My Orders', open the order, and tap 'Edit Address'. Once the order is accepted, you will need to contact the seller directly to arrange address changes.",
					"Orders", "address delivery change update location"),
				new KnowledgeEntry(
					"How do I reset my password?",
					"On the login screen, tap 'Forgot Password' and enter your registered email. You will receive a password reset link. If you do not see the email, check your spam folder. The link expires after 30 minutes.",
					"Account", "password reset forgot login email"),
				new KnowledgeEntry(
					"How do I update my profile or contact information?",
					"Go to your Profile page by tapping your avatar in the top corner. Tap 'Edit Profile' to update your name, phone number, or profile picture. Email address cannot be changed after registration.",
					"Account", "profile update name phone contact information"),
				new KnowledgeEntry(
					"A product I received is damaged or wrong",
					"We apologise for the inconvenience. Please take a photo of the item and go to 'My Orders' then select the order then 'Report an Issue'. Attach the photo and describe the problem. Our team will review and arrange a replacement or refund within 2 business days.",
					"Products", "damaged wrong item product quality complaint"),
				new KnowledgeEntry(
					"How do I contact a seller?",
					"You can message a seller by opening the product listing and tapping 'Contact Seller'. If you have already placed an order, you can find the seller's contact in 'My Orders' under the order details.",
					"Products", "contact seller message chat"),
				new KnowledgeEntry(
					"How do I become a seller on Agrolink?",
					"To register as a seller, go to the Sign Up page and select 'Farmer / Seller'. Fill in your farm details and product categories. Your account will be reviewed within 24 hours. Once approved, you can list your products.",
					"Account", "seller register farm signup become"),
				new KnowledgeEntry(
					"Why is my account suspended or blocked?",
					"Accounts may be suspended for violating our terms of service (e.g., fraudulent listings, repeated payment failures). You will receive an email explaining the reason. To appeal, please contact support with your registered email and a brief explanation.",
					"Account", "account suspended blocked banned restricted")
			);
			knowledgeRepository.saveAll(entries);
			System.out.println("Knowledge base seeded with " + entries.size() + " entries.");
		};
	}
}
