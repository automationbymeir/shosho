/**
 * Gets or creates a spreadsheet for storing brief metadata
 */
function getOrCreateStorageSheet() {
  try {
    // Use specific spreadsheet ID
    const specificSheetId = "1Ime4nTUTAkk4t95OwK8JRqV0DYGngg8EnUCeoMr6bTY";
    
    try {
      // Try to open specific spreadsheet first
      return SpreadsheetApp.openById(specificSheetId);
    } catch (e) {
      console.log("Could not open specific sheet:", e.message);
      
      // Fall back to stored ID if exists
      const storageSheetId = PropertiesService.getScriptProperties().getProperty("briefStorageSheetId");
      
      if (storageSheetId) {
        try {
          return SpreadsheetApp.openById(storageSheetId);
        } catch (e) {
          console.log("Could not open existing storage sheet:", e.message);
        }
      }
      
      // Create a new sheet as last resort
      const newSheet = SpreadsheetApp.create("Brief Storage");
      
      // Set up headers
      const sheet = newSheet.getActiveSheet();
      sheet.appendRow([
        "ID", 
        "Contact Name", 
        "Contact Email", 
        "Created Date", 
        "PDF URL", 
        "Document ID",
        "Job Title"
      ]);
      
      // Format header row
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
      sheet.setFrozenRows(1);
      
      // Save the new sheet's ID
      PropertiesService.getScriptProperties().setProperty("briefStorageSheetId", newSheet.getId());
      
      return newSheet;
    }
  } catch (e) {
    console.error("Error in getOrCreateStorageSheet:", e.message);
    throw new Error("Failed to access or create storage sheet: " + e.message);
  }
}

/**
 * Stores brief metadata in the storage sheet
 */
function storeBriefMetadata(contactName, contactEmail, pdfUrl, docId, jobTitle) {
  try {
    console.log("Starting storeBriefMetadata");
    
    // Get storage sheet
    const ss = getOrCreateStorageSheet();
    console.log("Got storage sheet:", ss.getName());
    
    const sheet = ss.getActiveSheet();
    
    // Create metadata
    const briefDate = new Date();
    const briefId = Utilities.getUuid();
    
    // Add row
    sheet.appendRow([
      briefId,
      contactName || "Unknown Contact",
      contactEmail || "",
      briefDate.toISOString(),
      pdfUrl,
      docId,
      jobTitle || "Position"
    ]);
    
    console.log("Stored brief metadata");
    return briefId;
  } catch (e) {
    console.error("Error in storeBriefMetadata:", e.message);
    throw new Error("Failed to store brief metadata: " + e.message);
  }
}

/**
 * Gets previous briefs from storage
 */
function getPreviousBriefs(limit = 50) {
  try {
    console.log("Starting getPreviousBriefs");
    
    // Get storage sheet
    const ss = getOrCreateStorageSheet();
    const sheet = ss.getActiveSheet();
    
    // Get data
    const data = sheet.getDataRange().getValues();
    console.log("Got data rows:", data.length);
    
    if (data.length <= 1) {
      // Only header row exists
      return [];
    }
    
    // Process data
    const briefs = data.slice(1).map(row => ({
      id: row[0],
      contactName: row[1],
      contactEmail: row[2],
      createdAt: row[3],
      pdfUrl: row[4],
      docId: row[5],
      jobTitle: row[6] || "Position"
    }));
    
    // Sort and limit
    return briefs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  } catch (e) {
    console.error("Error in getPreviousBriefs:", e.message);
    throw new Error("Error retrieving briefs: " + e.message);
  }
}

/**
 * Searches briefs by query
 */
function searchBriefs(query) {
  try {
    // Get briefs
    const briefs = getPreviousBriefs(100);
    
    // Filter by query
    query = query.toLowerCase();
    const filtered = briefs.filter(brief => 
      (brief.contactName || "").toLowerCase().includes(query) ||
      (brief.contactEmail || "").toLowerCase().includes(query) ||
      (brief.jobTitle || "").toLowerCase().includes(query)
    );
    
    return filtered;
  } catch (e) {
    console.error("Error in searchBriefs:", e.message);
    throw new Error("Error searching briefs: " + e.message);
  }
}