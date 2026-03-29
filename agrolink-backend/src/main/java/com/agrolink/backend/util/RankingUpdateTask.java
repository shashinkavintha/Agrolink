package com.agrolink.backend.util;

import com.agrolink.backend.service.RankingService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RankingUpdateTask {

    private final RankingService rankingService;

    public RankingUpdateTask(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    // Run every hour
    @Scheduled(cron = "0 0 * * * *")
    public void updateRankings() {
        System.out.println("⏰ Running scheduled ranking and KPI update...");
        try {
            rankingService.updateAllRanksAndKPIs();
            System.out.println("✅ Scheduled ranking and KPI update complete.");
        } catch (Exception e) {
            System.err.println("❌ Error during scheduled ranking update: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
