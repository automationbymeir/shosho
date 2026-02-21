function getAnalyticsDataForThemedView(filters) {
  try {
    const result = getComprehensiveAnalytics(filters);
    const stats = (result && result.success && result.data) ? result.data : {};

    // Get current date string
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const periodString = `Last 30 Days`; // Simplified for now

    // Process monthly trends
    const trends = (stats.timelineStats || []).map(t => ({
      month: t.month,
      spend: t.count * 100, // Mock "Spend" value based on brief count (e.g. $100 per brief)
      orders: t.count
    }));

    // Process categories for pie chart
    // The template expects key-value object where values have { spend, orders }
    const spendBySubCategory = {};
    if (stats.categoryStats && stats.categoryStats.subCategories) {
      stats.categoryStats.subCategories.forEach(cat => {
        spendBySubCategory[cat.name] = {
          spend: cat.count * 100, // Mock spend
          orders: cat.count
        };
      });
    }

    // Top Freelancers -> Proxied by Recent Briefs (Agent Name as "Freelancer")
    // In a real scenario this would be aggregated by freelancer ID
    const freelancersMap = {};
    (stats.recentBriefs || []).forEach(b => {
      const name = b.agentName || "Unknown Agent";
      if (!freelancersMap[name]) {
        freelancersMap[name] = { name: name, orders: 0, spend: 0 };
      }
      freelancersMap[name].orders += 1;
      freelancersMap[name].spend += 100;
    });
    const topFreelancers = Object.values(freelancersMap)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // Safe KPI Accessors
    const totalBriefs = stats.versionStats?.totalBriefs || 0;
    const verticalWins = stats.qaStats?.qaDecision?.verticalWins || 0;
    const v2Count = stats.versionStats?.v2Count || 0;
    const standardWins = stats.qaStats?.qaDecision?.standardWins || 0;

    return {
      reportPeriod: periodString,
      generatedDate: dateString,
      mainKPIs: {
        totalSpend: totalBriefs, // Mapped to Total Briefs
        potentialSavings: verticalWins, // Mapped to Vertical Wins
        orders: v2Count // Mapped to V2 Briefs
      },
      pendingKPIs: {
        avgProjectValue: standardWins // Mapped to Standard Wins
      },
      visibility: {
        showSubCategories: true,
        showSellers: false,
        showTeamMembers: false,
        showAvgOrderValue: true
      },
      spendBySubCategory: spendBySubCategory,
      spendBySeller: {}, // Not used
      spendByTeamMember: {}, // Not used
      monthlyTrends: trends,
      topFreelancers: topFreelancers,

      // Links
      bsmUrl: "https://pro.fiverr.com/",
      fullStats: stats // Expose full detailed stats for Detailed Analysis section
    };
  } catch (e) {
    console.error("Error in getAnalyticsDataForThemedView", e);
    throw e;
  }
}

function getAnalyticsDataSimple() {
  console.log("getAnalyticsDataSimple called");
  return {
    success: true,
    data: {
      totalBriefs: 0,
      standardWins: 0,
      verticalWins: 0,
      ties: 0,
      standardWinRate: 0,
      verticalWinRate: 0,
      byVertical: {},
      recentBriefs: []
    }
  };
}
