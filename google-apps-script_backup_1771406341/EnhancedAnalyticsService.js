/**
 * Enhanced Analytics Service
 * Combines data from v1 (legacy spreadsheet) and v2 (current system)
 * Provides comprehensive statistics on briefs, categories, payments, and QA reviews
 */

// Legacy system spreadsheet ID
const LEGACY_BRIEFS_SHEET_ID = "1Ime4nTUTAkk4t95OwK8JRqV0DYGngg8EnUCeoMr6bTY";

/**
 * Get comprehensive analytics data from both v1 and v2 systems
 */
function getComprehensiveAnalytics(filters = {}) {
  try {
    console.log("Starting comprehensive analytics with filters:", JSON.stringify(filters));

    // Get data from both systems
    const v2Data = getV2BriefsData();
    const v1Data = getV1BriefsData();
    const qaData = getQAData(); // QA stats might need filtering too, but linking reviews to briefs is complex. For now, QA stats might stay global or we filter based on brief IDs.

    // Combine
    let allBriefs = [...v1Data, ...v2Data];

    // === APPLY FILTERS ===
    if (filters) {
      // 1. Text Search (ID, Company, Job Title, Agent)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        allBriefs = allBriefs.filter(b =>
          (b.id && b.id.toLowerCase().includes(q)) ||
          (b.company && b.company.toLowerCase().includes(q)) ||
          (b.jobTitle && b.jobTitle.toLowerCase().includes(q)) ||
          (b.agentName && b.agentName.toLowerCase().includes(q))
        );
      }

      // 2. Category Filter
      if (filters.category && filters.category !== 'All') {
        allBriefs = allBriefs.filter(b => b.category === filters.category);
      }

      // 3. Month Filter (YYYY-MM)
      if (filters.month && filters.month !== 'All') {
        allBriefs = allBriefs.filter(b => {
          if (!b.createdDate) return false;
          const d = new Date(b.createdDate);
          if (isNaN(d.getTime())) return false;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === filters.month;
        });
      }
    }

    // Calculate statistics on FILTERED data
    const stats = {
      // Version breakdown
      versionStats: {
        v1Count: allBriefs.filter(b => b.version === 'v1').length,
        v2Count: allBriefs.filter(b => b.version === 'v2').length,
        totalBriefs: allBriefs.length
      },

      // Category statistics
      categoryStats: analyzeCategoryStats(allBriefs),

      // Job title statistics (top 20)
      jobTitleStats: analyzeJobTitles(allBriefs),

      // Timeline statistics
      timelineStats: analyzeTimeline(allBriefs),

      // QA Review statistics (Note: This is approximate if we don't filter QA data by the filtered briefs. 
      // For now, we'll return global QA stats or filter them if possible. 
      // Let's filter QA reviews to only include those matching the filtered brief IDs for consistency.)
      qaStats: analyzeQAReviews(qaData, allBriefs),

      // Purchase Reason statistics
      purchaseReasonStats: analyzePurchaseReasons(allBriefs),

      // Brief comparison (Standard vs Vertical)
      comparisonStats: analyzeBriefComparison(qaData), // This relies on reviews, keeping global for now or update similarly

      // Recent activity (Filtered list)
      recentBriefs: getRecentBriefs(allBriefs, 50) // Increased limit for filtered views
    };

    return {
      success: true,
      data: stats
    };

  } catch (e) {
    console.error("Error in getComprehensiveAnalytics:", e);
    return {
      success: false,
      error: e.message + "\n\nStack: " + e.stack
    };
  }
}

/**
 * Get briefs from V2 (current system)
 */
function getV2BriefsData() {
  const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
  const sheet = ss.getSheetByName('BriefSubmissions');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const briefs = [];

  // Skip header row
  // Column order: BriefID, Timestamp, AgentEmail, AgentName, ContactName, ContactEmail, Company,
  // Vertical, Category, SubCategory, StandardBrief, VerticalBrief, SelectedBrief, WorkatoEventID, Status
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows

    briefs.push({
      id: row[0],
      createdDate: row[1],
      agentEmail: row[2] || '',
      agentName: row[3] || 'Unknown',
      contactName: row[4] || 'Unknown',
      contactEmail: row[5] || '',
      company: row[6] || '',
      vertical: row[7] || 'Unknown',
      category: row[8] || 'Unknown',
      subCategory: row[9] || '',
      standardBrief: row[10] || '',
      verticalBrief: row[11] || '',
      selectedBrief: row[12] || '',
      status: row[14] || 'Unknown',
      purchaseReason: row[15] || 'Not specified', // New field
      version: 'v2'
    });
  }

  return briefs;
}

/**
 * Get briefs from V1 (legacy system)
 */
function getV1BriefsData() {
  try {
    const ss = SpreadsheetApp.openById(LEGACY_BRIEFS_SHEET_ID);
    const sheet = ss.getSheets()[0]; // First sheet

    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    const briefs = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // Skip empty rows

      briefs.push({
        id: row[0],
        contactName: row[1] || 'Unknown',
        contactEmail: row[2] || '',
        createdDate: row[3],
        pdfUrl: row[4] || '',
        documentId: row[5] || '',
        jobTitle: row[6] || 'Unknown',
        agentName: 'Unknown', // Not available in v1
        agentEmail: '',
        company: '',
        vertical: extractVerticalFromJobTitle(row[6]), // Infer from job title
        category: extractCategoryFromJobTitle(row[6]), // Infer from job title
        subCategory: '',
        status: 'Completed', // Assume completed for v1
        version: 'v1'
      });
    }

    return briefs;
  } catch (e) {
    console.warn("Could not access legacy spreadsheet:", e.message);
    return [];
  }
}

/**
 * Get QA review data
 */
function getQAData() {
  const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
  const sheet = ss.getSheetByName('QAReviews');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const reviews = [];

  // Skip header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue; // Skip if no briefId

    reviews.push({
      timestamp: row[0],
      briefId: row[1],
      reviewerEmail: row[2],
      expertChoice: row[3], // Standard/Vertical/Tie
      standardRating: row[4] || 0,
      verticalRating: row[5] || 0,
      notes: row[6] || '',
      overallWinner: row[7] || '' // Standard/Vertical/Tie
    });
  }

  return reviews;
}

/**
 * Analyze category statistics
 */
function analyzeCategoryStats(briefs) {
  const categoryCount = {};
  const subCategoryCount = {};

  briefs.forEach(brief => {
    // Count categories
    const cat = brief.category || 'Unknown';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;

    // Count subcategories
    if (brief.subCategory) {
      const subCat = brief.subCategory;
      subCategoryCount[subCat] = (subCategoryCount[subCat] || 0) + 1;
    }
  });

  // Convert to sorted arrays
  const categories = Object.keys(categoryCount)
    .map(cat => ({ name: cat, count: categoryCount[cat] }))
    .sort((a, b) => b.count - a.count);

  const subCategories = Object.keys(subCategoryCount)
    .map(cat => ({ name: cat, count: subCategoryCount[cat] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20

  return {
    categories,
    subCategories
  };
}

/**
 * Analyze Purchase Reasons
 */
function analyzePurchaseReasons(briefs) {
  const reasonCount = {};

  briefs.forEach(brief => {
    // Only V2 briefs usually have this, but we'll check all
    const reason = brief.purchaseReason || 'Not specified';
    // Clean up reason if needed (e.g. trim)
    const key = reason.trim();
    if (key) {
      reasonCount[key] = (reasonCount[key] || 0) + 1;
    }
  });

  return Object.keys(reasonCount)
    .map(r => ({ reason: r, count: reasonCount[r] }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Analyze job titles
 */
function analyzeJobTitles(briefs) {
  const titleCount = {};

  briefs.forEach(brief => {
    const title = brief.jobTitle || 'Unknown';
    titleCount[title] = (titleCount[title] || 0) + 1;
  });

  return Object.keys(titleCount)
    .map(title => ({ title, count: titleCount[title] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20
}

/**
 * Analyze timeline (briefs per month)
 */
function analyzeTimeline(briefs) {
  const monthCount = {};

  briefs.forEach(brief => {
    if (!brief.createdDate) return;

    const date = new Date(brief.createdDate);
    if (isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCount[monthKey] = (monthCount[monthKey] || 0) + 1;
  });

  return Object.keys(monthCount)
    .sort()
    .map(month => ({ month, count: monthCount[month] }));
}

/**
 * Analyze QA reviews
 */
function analyzeQAReviews(reviews, filteredBriefs) {
  let standardWins = 0;
  let verticalWins = 0;
  let ties = 0;
  let expertChoiceStandard = 0;
  let expertChoiceVertical = 0;
  let expertChoiceTie = 0;

  // Create a Set of valid IDs from the filtered briefs for O(1) lookup
  const validBriefIds = new Set(filteredBriefs ? filteredBriefs.map(b => b.id) : []);

  reviews.forEach(review => {
    // Only count reviews for briefs that are in our filtered set (if filtering is active)
    if (filteredBriefs && !validBriefIds.has(review.briefId)) {
      return;
    }

    // Overall winner (QA decision)
    if (review.overallWinner === 'Standard') standardWins++;
    else if (review.overallWinner === 'Vertical') verticalWins++;
    else ties++;

    // Expert choice
    if (review.expertChoice === 'Standard') expertChoiceStandard++;
    else if (review.expertChoice === 'Vertical') expertChoiceVertical++;
    else expertChoiceTie++;
  });

  const total = standardWins + verticalWins + ties;

  return {
    totalReviews: reviews.length,
    qaDecision: {
      standardWins,
      verticalWins,
      ties,
      standardWinRate: total > 0 ? Math.round((standardWins / total) * 100) : 0,
      verticalWinRate: total > 0 ? Math.round((verticalWins / total) * 100) : 0
    },
    expertChoice: {
      standardWins: expertChoiceStandard,
      verticalWins: expertChoiceVertical,
      ties: expertChoiceTie,
      standardWinRate: total > 0 ? Math.round((expertChoiceStandard / total) * 100) : 0,
      verticalWinRate: total > 0 ? Math.round((expertChoiceVertical / total) * 100) : 0
    }
  };
}

/**
 * Analyze brief comparison statistics
 */
function analyzeBriefComparison(reviews) {
  const avgStandardRating = reviews.reduce((sum, r) => sum + (r.standardRating || 0), 0) / reviews.length || 0;
  const avgVerticalRating = reviews.reduce((sum, r) => sum + (r.verticalRating || 0), 0) / reviews.length || 0;

  return {
    averageStandardRating: avgStandardRating.toFixed(2),
    averageVerticalRating: avgVerticalRating.toFixed(2),
    reviewCount: reviews.length
  };
}

/**
 * Get recent briefs
 */
function getRecentBriefs(briefs, limit) {
  return briefs
    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
    .slice(0, limit)
    .map(b => ({
      id: b.id.substring(0, 8) + '...',
      fullId: b.id,
      contactName: b.contactName,
      company: b.company || '',
      jobTitle: b.jobTitle || 'Unknown',
      category: b.category || 'Unknown',
      vertical: b.vertical || 'Unknown',
      createdDate: b.createdDate,
      agentName: b.agentName || 'Unknown',
      agentEmail: b.agentEmail || '',
      version: b.version,
      status: b.status
    }));
}

/**
 * Get briefs filtered by category
 */
function getBriefsByCategory(categoryName) {
  try {
    console.log("Getting briefs for category:", categoryName);

    const v2Data = getV2BriefsData();
    const v1Data = getV1BriefsData();
    const allBriefs = [...v1Data, ...v2Data];

    const filteredBriefs = allBriefs
      .filter(b => b.category === categoryName)
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
      .map(b => ({
        id: b.id.substring(0, 8) + '...',
        fullId: b.id,
        contactName: b.contactName,
        contactEmail: b.contactEmail,
        company: b.company || '',
        jobTitle: b.jobTitle || 'Unknown',
        category: b.category,
        subCategory: b.subCategory || '',
        vertical: b.vertical,
        createdDate: b.createdDate,
        agentName: b.agentName || 'Unknown',
        agentEmail: b.agentEmail || '',
        version: b.version,
        status: b.status,
        standardBrief: b.standardBrief || '',
        verticalBrief: b.verticalBrief || '',
        selectedBrief: b.selectedBrief || '',
        url: b.pdfUrl || '' // Add URL for clickable links (V1)
      }));

    return {
      success: true,
      data: filteredBriefs
    };
  } catch (e) {
    console.error("Error in getBriefsByCategory:", e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Helper: Extract vertical from job title
 */
function extractVerticalFromJobTitle(jobTitle) {
  if (!jobTitle) return 'Unknown';

  const title = jobTitle.toLowerCase();

  // Marketing
  if (title.includes('market') || title.includes('seo') || title.includes('ad')) return 'Marketing';

  // Development
  if (title.includes('develop') || title.includes('engineer') || title.includes('program')) return 'Development';

  // Design
  if (title.includes('design') || title.includes('graphic') || title.includes('ui') || title.includes('ux')) return 'Design';

  // Video/Animation
  if (title.includes('video') || title.includes('animat') || title.includes('editor')) return 'Video & Animation';

  // Writing
  if (title.includes('writ') || title.includes('content') || title.includes('copy')) return 'Writing';

  return 'Other';
}

/**
 * Helper: Extract category from job title
 */
function extractCategoryFromJobTitle(jobTitle) {
  if (!jobTitle) return 'Unknown';

  const title = jobTitle.toLowerCase();

  // Web Development
  if (title.includes('web') || title.includes('website') || title.includes('wordpress')) return 'Web Development';

  // Mobile Development
  if (title.includes('mobile') || title.includes('app') || title.includes('ios') || title.includes('android')) return 'Mobile Development';

  // Graphic Design
  if (title.includes('graphic') || title.includes('logo') || title.includes('brand')) return 'Graphic Design';

  // Video Editing
  if (title.includes('video') || title.includes('editor')) return 'Video Editing';

  // Digital Marketing
  if (title.includes('market') || title.includes('social media')) return 'Digital Marketing';

  return jobTitle;
}
