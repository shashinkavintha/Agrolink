package com.agrolink.backend.controller;

import com.agrolink.backend.model.Profile;
import com.agrolink.backend.service.ProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @PostMapping
    public ResponseEntity<Profile> createProfile(@RequestBody Profile profile) {
        return ResponseEntity.ok(profileService.createProfile(profile));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Profile> getProfile(@PathVariable UUID id) {
        Profile profile = profileService.getProfile(id);
        if (profile != null) {
            return ResponseEntity.ok(profile);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Profile>> getPendingProfiles() {
        List<Profile> profiles = profileService.getPendingProfiles();
        // Debug logging
        profiles.forEach(p -> {
            if ("driver".equals(p.getRole().toString()) || p.getRole() == com.agrolink.backend.model.UserRole.driver) {
                System.out.println("Pending Driver: " + p.getFullName());
                System.out.println(" - VehiclePhotoUrl: " + p.getVehiclePhotoUrl());
                System.out.println(" - VehiclePlatePhotoUrl: " + p.getVehiclePlatePhotoUrl());
            }
        });
        return ResponseEntity.ok(profiles);
    }

    @GetMapping("/farmers")
    public ResponseEntity<List<Profile>> getFarmers() {
        return ResponseEntity.ok(profileService.getProfilesByRole(com.agrolink.backend.model.UserRole.farmer));
    }

    @PostMapping("/{id}/recalculate-ranks")
    public ResponseEntity<Void> recalculateRanks(@PathVariable UUID id) {
        profileService.recalculateRanks(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Profile> approveProfile(@PathVariable UUID id) {
        Profile profile = profileService.approveProfile(id);
        if (profile != null) {
            return ResponseEntity.ok(profile);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/submit-verification")
    public ResponseEntity<Profile> submitVerification(@PathVariable UUID id, @RequestBody Profile updatedProfile) {
        Profile profile = profileService.getProfile(id);
        if (profile != null) {
            profile.setNicFrontUrl(updatedProfile.getNicFrontUrl());
            profile.setNicBackUrl(updatedProfile.getNicBackUrl());
            profile.setProofPhotoUrl(updatedProfile.getProofPhotoUrl());
            if (updatedProfile.getVehiclePhotoUrl() != null) {
                profile.setVehiclePhotoUrl(updatedProfile.getVehiclePhotoUrl());
            }
            if (updatedProfile.getVehiclePlatePhotoUrl() != null) {
                profile.setVehiclePlatePhotoUrl(updatedProfile.getVehiclePlatePhotoUrl());
            }
            profile.setStatus(com.agrolink.backend.model.UserStatus.submitted);
            return ResponseEntity.ok(profileService.createProfile(profile)); // Save
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Profile> updateProfile(@PathVariable UUID id, @RequestBody Profile updatedProfile) {
        Profile profile = profileService.getProfile(id);
        if (profile != null) {
            if (updatedProfile.getLatitude() != null)
                profile.setLatitude(updatedProfile.getLatitude());
            if (updatedProfile.getLongitude() != null)
                profile.setLongitude(updatedProfile.getLongitude());
            if (updatedProfile.getFullName() != null)
                profile.setFullName(updatedProfile.getFullName());
            // Add other fields as needed
            return ResponseEntity.ok(profileService.createProfile(profile));
        }
        return ResponseEntity.notFound().build();
    }
}
