package com.agrolink.backend.service;

import com.agrolink.backend.model.Profile;
import com.agrolink.backend.model.UserStatus;
import com.agrolink.backend.repository.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private RankingService rankingService;

    public Profile createProfile(Profile profile) {
        if (profile == null) {
            throw new IllegalArgumentException("Profile cannot be null");
        }
        
        // Generate UUID if not provided
        if (profile.getId() == null) {
            profile.setId(UUID.randomUUID());
        }
        
        // Validate required fields
        if (profile.getEmail() == null || profile.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        
        if (profile.getRole() == null) {
            throw new IllegalArgumentException("Role is required");
        }
        
        // Set status to pending if not specified
        if (profile.getStatus() == null) {
            profile.setStatus(UserStatus.pending);
        }
        
        try {
            return profileRepository.save(profile);
        } catch (DataIntegrityViolationException e) {
            String message = e.getMessage();
            if (message != null) {
                if (message.contains("email")) {
                    throw new RuntimeException("A profile with this email address already exists: " + profile.getEmail());
                }
                if (message.contains("unique")) {
                    throw new RuntimeException("This record already exists: " + message);
                }
            }
            throw new RuntimeException("Database constraint violation: " + message, e);
        } catch (Exception e) {
            System.err.println("Exception type: " + e.getClass().getName());
            System.err.println("Exception message: " + e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("email")) {
                throw new RuntimeException("A profile with this email address already exists: " + profile.getEmail());
            }
            throw new RuntimeException("Failed to save profile: " + e.getMessage(), e);
        }
    }

    public Profile getProfile(UUID id) {
        return profileRepository.findById(id).orElse(null);
    }

    public List<Profile> getPendingProfiles() {
        return profileRepository.findByStatusIn(List.of(UserStatus.pending, UserStatus.submitted));
    }

    public Profile approveProfile(UUID id) {
        Profile profile = getProfile(id);
        if (profile != null) {
            profile.setStatus(UserStatus.approved);
            return profileRepository.save(profile);
        }
        return null;
    }

    public Profile rejectProfile(UUID id) {
        Profile profile = getProfile(id);
        if (profile != null) {
            profile.setStatus(UserStatus.rejected);
            return profileRepository.save(profile);
        }
        return null;
    }

    public List<Profile> getProfilesByRole(com.agrolink.backend.model.UserRole role) {
        return profileRepository.findByRole(role);
    }

    public void recalculateRanks(UUID id) {
        rankingService.updateFarmerRanksAndKPIs(id);
    }
}
