/**
 * SetupService.gs
 * Automates the cleanup and setup of the spreadsheet tabs and data integration.
 */

// Configuration for Setup (using IDs provided in the conversation)
const SETUP_CONFIG = {
  SPREADSHEET_ID: "1TIt779EIG58oTdT-TL-6GnsrkfDOc4AZQghwHPWYgZQ",
  TECH_SHEET_ID: "1xp47bSnKFfwjIlTdWnMOXnriZn7My852KejNJe1f_1c",
  GD_VA_DOC_ID: "1T9wWjSGeoMHgRTHKIhabZDSIKtybo5w5t8B93N3rtos",
  DM_DOC_ID: "11Nx9CcqZzWFn5Zye6gaeRkd1Nxc6uU_SeRWxjAmluRE",
  ADMIN_EMAIL: "meir.horwitz@fiverr.com"
};

/**
 * MAIN SETUP FUNCTION
 * Run this function to set up the entire system
 */
function runSystemSetup() {
  // const ui = SpreadsheetApp.getUi(); // Removed to avoid context error in Doc
  try {
    console.log('Starting System Setup...');
    
    // 1. Create/Validate Tabs
    createRequiredSheets();
    
    // 2. Populate Default Config
    populateDefaultConfig();
    
    // 3. Set Admin Permissions
    setupAdminPermissions();
    
    // 4. Import Vertical Hierarchy from Sources
    importVerticalData();
    
    console.log('Setup Complete!');
    return "Setup completed successfully. Please check the Spreadsheet.";
  } catch (e) {
    console.error('Setup Failed:', e);
    return "Setup failed: " + e.message;
  }
}

/**
 * Creates the required sheets if they don't exist
 */
function createRequiredSheets() {
  const ss = SpreadsheetApp.openById(SETUP_CONFIG.SPREADSHEET_ID);
  
  const definitions = [
    {
      name: 'VerticalCategories',
      headers: ['Vertical', 'Category', 'SubCategory', 'QuestionsSource'],
      bold: true
    },
    {
      name: 'BriefSubmissions',
      headers: ['BriefID', 'Timestamp', 'AgentEmail', 'AgentName', 'ContactName', 
               'ContactEmail', 'Company', 'Vertical', 'Category', 'SubCategory',
               'StandardBrief', 'VerticalBrief', 'SelectedBrief', 'WorkatoEventID', 'Status'],
      bold: true
    },
    {
      name: 'QAReviews',
      headers: ['ReviewID', 'BriefID', 'ReviewerEmail', 'ReviewTimestamp',
               'AccuracyWinner', 'RelevancyWinner', 'StructureWinner', 'OverallWinner', 'Notes'],
      bold: true
    },
    {
      name: 'Analytics',
      headers: ['Date', 'TotalBriefs', 'StandardWins', 'VerticalWins', 'Ties', 'ByVertical_JSON'],
      bold: true
    },
    {
      name: 'UserPermissions',
      headers: ['Email', 'Role', 'AddedBy', 'AddedDate'],
      bold: true
    },
    {
      name: 'Config',
      headers: ['Key', 'Value'],
      bold: true
    }
  ];
  
  definitions.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      console.log(`Creating sheet: ${def.name}`);
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      if (def.bold) sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else {
      console.log(`Sheet ${def.name} exists.`);
    }
  });
}

/**
 * Populates default configuration values
 */
function populateDefaultConfig() {
  const ss = SpreadsheetApp.openById(SETUP_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Config');
  const existing = sheet.getDataRange().getValues();
  const existingKeys = existing.map(row => row[0]);
  
  const defaults = [
    ['NOTIFICATION_EMAIL', Session.getActiveUser().getEmail()], // Default to runner
    ['ADMIN_EMAIL', SETUP_CONFIG.ADMIN_EMAIL],
    ['REQUIRE_TRANSCRIPT', 'true'],
    ['ENABLE_DUAL_BRIEFS', 'true'],
    ['QA_REVIEW_ENABLED', 'true']
  ];
  
  defaults.forEach(def => {
    if (!existingKeys.includes(def[0])) {
      sheet.appendRow(def);
      console.log(`Added config: ${def[0]}`);
    }
  });
}

/**
 * Adds the admin user to permissions
 */
function setupAdminPermissions() {
  const ss = SpreadsheetApp.openById(SETUP_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('UserPermissions');
  const data = sheet.getDataRange().getValues();
  const emails = data.map(row => row[0]);
  
  if (!emails.includes(SETUP_CONFIG.ADMIN_EMAIL)) {
    sheet.appendRow([SETUP_CONFIG.ADMIN_EMAIL, 'Admin', 'System Setup', new Date().toISOString()]);
    console.log(`Added Admin permission: ${SETUP_CONFIG.ADMIN_EMAIL}`);
  }
}

/**
 * Imports vertical hierarchy from external Docs and Sheets
 */
function importVerticalData() {
  const ss = SpreadsheetApp.openById(SETUP_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('VerticalCategories');
  
  // Clear existing data (preserve header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
  }
  
  console.log('Importing Vertical Data...');
  
  // 1. Programming & Tech (From Spreadsheet)
  importFromSpreadsheet(sheet, SETUP_CONFIG.TECH_SHEET_ID, 'Programming & Tech');
  
  // 2. Graphics & Design (From Doc)
  // Note: The Doc ID provided covers both G&D and Video & Animation
  importFromDoc(sheet, SETUP_CONFIG.GD_VA_DOC_ID, 'Graphics & Design', ['Graphics', 'Design']);
  importFromDoc(sheet, SETUP_CONFIG.GD_VA_DOC_ID, 'Video & Animation', ['Video', 'Animation']);
  
  // 3. Digital Marketing (From Doc)
  importFromDoc(sheet, SETUP_CONFIG.DM_DOC_ID, 'Digital Marketing', ['Marketing', 'SEO', 'Social']);
}

/**
 * Helper: Import from Tech Spreadsheet
 */
function importFromSpreadsheet(targetSheet, sourceId, verticalName) {
  try {
    const ss = SpreadsheetApp.openById(sourceId);
    const sheets = ss.getSheets();
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      // Filter out utility sheets if any
      if (!name.startsWith('_') && name !== 'Dropdowns') {
        // Assume Tab Name is the Category
        targetSheet.appendRow([
          verticalName,
          name, // Category
          '-',  // SubCategory (none for spreadsheet structure usually)
          `SPREADSHEET:${sourceId}:${name}` // QuestionsSource
        ]);
        console.log(`Imported ${verticalName} > ${name}`);
      }
    });
  } catch (e) {
    console.error(`Error importing from Spreadsheet ${sourceId}:`, e);
  }
}

/**
 * Helper: Import from Google Doc
 * Scans for Headers (style Heading 1 or similar pattern)
 */
function importFromDoc(targetSheet, sourceId, verticalName, keywords) {
  try {
    const doc = DocumentApp.openById(sourceId);
    const body = doc.getBody();
    const pars = body.getParagraphs();
    
    let currentMainHeader = '';
    
    pars.forEach(p => {
      const text = p.getText().trim();
      if (!text) return;
      
      const attrs = p.getAttributes();
      const heading = attrs[DocumentApp.Attribute.HEADING];
      
      // Heuristic: Heading 1 or Lines starting with Number + Label (e.g., "1. Web Design")
      // Based on previous learnings, headers look like "1. Growth Marketing Strategist"
      const isHeader = 
        heading === DocumentApp.ParagraphHeading.HEADING1 || 
        heading === DocumentApp.ParagraphHeading.HEADING2 ||
        (/^(\d+\.|[A-Z]+)\s+[A-Za-z]/.test(text) && text.length < 50 && !text.includes('?'));
      
      if (isHeader) {
        // Clean the text
        const categoryName = text.replace(/^\d+\.\s*/, '').trim();
        
        // Simple keyword filter to assign to correct vertical if dealing with mixed doc
        // (Only checks if ANY keyword matches the category name)
        const matchesKeyword = keywords.some(k => categoryName.includes(k));
        
        // If strict separation is needed, implement here. 
        // For now, we trust the caller's verticalName assignment if strict check isn't possible.
        
        // Logic specific to the split G&D / Video doc
        if (verticalName === 'Graphics & Design' && (categoryName.includes('Video') || categoryName.includes('Animation'))) return;
        if (verticalName === 'Video & Animation' && !(categoryName.includes('Video') || categoryName.includes('Animation'))) return;

        targetSheet.appendRow([
          verticalName,
          categoryName,
          '-',
          `DOC:${sourceId}:${text}` // Using full text to help exact matching
        ]);
        console.log(`Imported ${verticalName} > ${categoryName}`);
      }
    });
    
  } catch (e) {
    console.error(`Error importing from Doc ${sourceId}:`, e);
  }
}
