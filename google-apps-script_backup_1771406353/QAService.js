/**
 * QAService.gs
 * Handles QA review submission and analytics
 */

/**
 * Save QA review for a brief
 */
function saveQAReview(reviewData) {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    let sheet = ss.getSheetByName('QAReviews');
    
    if (!sheet) {
      sheet = ss.insertSheet('QAReviews');
      sheet.appendRow([
        'ReviewID', 'BriefID', 'ReviewerEmail', 'ReviewTimestamp',
        'AccuracyWinner', 'RelevancyWinner', 'StructureWinner', 'OverallWinner', 'Notes'
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    const reviewId = 'QA-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
    
    sheet.appendRow([
      reviewId,
      reviewData.briefId,
      Session.getActiveUser().getEmail(),
      new Date().toISOString(),
      reviewData.accuracyWinner,
      reviewData.relevancyWinner,
      reviewData.structureWinner,
      reviewData.overallWinner,
      reviewData.notes || ''
    ]);
    
    // Update analytics
    updateAnalytics(reviewData);
    
    // Update brief status
    updateBriefStatus(reviewData.briefId, 'QA_REVIEWED');
    
    return { success: true, reviewId: reviewId };
    
  } catch (e) {
    console.error('Error saving QA review:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Update analytics with new review data
 */
function updateAnalytics(reviewData) {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    let sheet = ss.getSheetByName('Analytics');
    
    if (!sheet) {
      sheet = ss.insertSheet('Analytics');
      sheet.appendRow(['Date', 'TotalBriefs', 'StandardWins', 'VerticalWins', 'Ties', 'ByVertical_JSON']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const data = sheet.getDataRange().getValues();
    
    let todayRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        todayRow = i + 1;
        break;
      }
    }
    
    if (todayRow === -1) {
      // Create new row for today
      sheet.appendRow([today, 1, 0, 0, 0, '{}']);
      todayRow = sheet.getLastRow();
    } else {
      // Increment total
      const currentTotal = sheet.getRange(todayRow, 2).getValue() || 0;
      sheet.getRange(todayRow, 2).setValue(currentTotal + 1);
    }
    
    // Update winner counts
    const winner = reviewData.overallWinner;
    if (winner === 'Standard') {
      const current = sheet.getRange(todayRow, 3).getValue() || 0;
      sheet.getRange(todayRow, 3).setValue(current + 1);
    } else if (winner === 'Vertical') {
      const current = sheet.getRange(todayRow, 4).getValue() || 0;
      sheet.getRange(todayRow, 4).setValue(current + 1);
    } else {
      const current = sheet.getRange(todayRow, 5).getValue() || 0;
      sheet.getRange(todayRow, 5).setValue(current + 1);
    }
    
    return true;
  } catch (e) {
    console.error('Error updating analytics:', e);
    return false;
  }
}

/**
 * Update brief status
 */
function updateBriefStatus(briefId, status) {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('BriefSubmissions');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === briefId) {
        sheet.getRange(i + 1, 15).setValue(status);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('Error updating brief status:', e);
    return false;
  }
}

/**
 * Get analytics data for dashboard
 */
/**
 * Get analytics data for dashboard
 * dynamically calculated from BriefSubmissions and QAReviews
 */
function getAnalyticsData() {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    
    const qaSheet = ss.getSheetByName('QAReviews');
    const briefsSheet = ss.getSheetByName('BriefSubmissions');
    
    let totalBriefs = 0;
    let totalStandardWins = 0;
    let totalVerticalWins = 0;
    let totalTies = 0;
    
    // Get recent activity and total briefs count
    const recentBriefs = [];
    const briefLookup = {}; // Map briefId -> {vertical, category, status}
    
    if (briefsSheet) {
      const data = briefsSheet.getDataRange().getValues();
      // Skip header
      if (data.length > 1) {
        // Total briefs is simply the number of submission rows
        totalBriefs = data.length - 1;
        
        // Build lookup and recent list
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const briefId = row[0];
          
          briefLookup[briefId] = {
            vertical: row[7],
            category: row[8],
            status: row[14]
          };
          
          // Add to recent list (limit to last 20)
          if (i > data.length - 21) {
             recentBriefs.push({
              briefId: briefId,
              timestamp: row[1],
              company: row[6],
              vertical: row[7],
              status: row[14]
            });
          }
        }
      }
      recentBriefs.reverse(); // Newest first
    }
    
    // Get briefs by vertical
    const byVertical = {};
    
    if (qaSheet) {
      const qaData = qaSheet.getDataRange().getValues();
      console.log('QA Data rows:', qaData.length);
      
      // Skip header
      for (let i = 1; i < qaData.length; i++) {
        const briefId = qaData[i][1];
        const winner = qaData[i][7]; // OverallWinner is column H (index 7)
        
        let vertical = 'Unknown';
        if (briefLookup[briefId]) {
          vertical = briefLookup[briefId].vertical;
        } else {
             console.warn('Brief ID not found in lookup:', briefId);
        }
        
        // Update totals
        if (winner === 'Standard') totalStandardWins++;
        else if (winner === 'Vertical') totalVerticalWins++;
        else totalTies++; 
        
        // Update per-vertical stats
        if (!byVertical[vertical]) {
          byVertical[vertical] = { standard: 0, vertical: 0, tie: 0 };
        }
        
        if (winner === 'Standard') byVertical[vertical].standard++;
        else if (winner === 'Vertical') byVertical[vertical].vertical++;
        else byVertical[vertical].tie++;
      }
    } else {
        console.warn('QAReviews sheet not found');
    }
    
    return {
      success: true,
      data: {
        totalBriefs: totalBriefs,
        standardWins: totalStandardWins,
        verticalWins: totalVerticalWins,
        ties: totalTies,
        // Prevent division by zero
        standardWinRate: (totalStandardWins + totalVerticalWins + totalTies) > 0 ? Math.round((totalStandardWins / (totalStandardWins + totalVerticalWins + totalTies)) * 100) : 0,
        verticalWinRate: (totalStandardWins + totalVerticalWins + totalTies) > 0 ? Math.round((totalVerticalWins / (totalStandardWins + totalVerticalWins + totalTies)) * 100) : 0,
        byVertical: byVertical,
        recentBriefs: recentBriefs
      }
    };
    
  } catch (e) {
    console.error('Error getting analytics data:', e);
    return { success: false, error: e.message + ' Stack: ' + e.stack };
  }
}

/**
 * Check user permissions for analytics
 */
function checkUserPermission(email) {
  try {
    const adminEmail = getConfigValue('ADMIN_EMAIL');
    
    // Admin has full access
    if (email === adminEmail) {
      return { success: true, role: 'Admin', hasAccess: true };
    }
    
    // Check permissions sheet
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('UserPermissions');
    
    if (!sheet) {
      // If no permissions sheet, allow all users read access
      return { success: true, role: 'User', hasAccess: true };
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        return { success: true, role: data[i][1], hasAccess: true };
      }
    }
    
    // Default: allow read access to all
    return { success: true, role: 'Viewer', hasAccess: true };
    
  } catch (e) {
    console.error('Error checking permissions:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Add user permission (admin only)
 */
function addUserPermission(email, role) {
  try {
    const currentUserEmail = Session.getActiveUser().getEmail();
    const adminEmail = getConfigValue('ADMIN_EMAIL');
    
    if (currentUserEmail !== adminEmail) {
      return { success: false, error: 'Only admin can add permissions' };
    }
    
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    let sheet = ss.getSheetByName('UserPermissions');
    
    if (!sheet) {
      sheet = ss.insertSheet('UserPermissions');
      sheet.appendRow(['Email', 'Role', 'AddedBy', 'AddedDate']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    sheet.appendRow([email, role, currentUserEmail, new Date().toISOString()]);
    
    return { success: true, message: 'Permission added' };
    
  } catch (e) {
    console.error('Error adding permission:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Remove user permission (admin only)
 */
function removeUserPermission(email) {
  try {
    const currentUserEmail = Session.getActiveUser().getEmail();
    const adminEmail = getConfigValue('ADMIN_EMAIL');
    
    if (currentUserEmail !== adminEmail) {
      return { success: false, error: 'Only admin can remove permissions' };
    }
    
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('UserPermissions');
    
    if (!sheet) {
      return { success: false, error: 'Permissions sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Permission removed' };
      }
    }
    
    return { success: false, error: 'User not found' };
    
  } catch (e) {
    console.error('Error removing permission:', e);
    return { success: false, error: e.message };
  }
}
