package com.agrolink.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseFixer implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            jdbcTemplate.execute("ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS fkqgkanrr90j46564w4ww63jcna");
            System.out.println("Dropped bad foreign key constraint!");
            
            // Optionally recreate it mapping to 'conversations' table instead of 'chat_conversations'
            try {
                jdbcTemplate.execute("ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_conversations FOREIGN KEY (conversation_id) REFERENCES conversations(id)");
                System.out.println("Added correct foreign key to conversations!");
            } catch (Exception fkEx) {
                System.out.println("Constraint may already exist or error: " + fkEx.getMessage());
            }

        } catch (Exception e) {
            System.out.println("Database Fixer error: " + e.getMessage());
        }
    }
}
