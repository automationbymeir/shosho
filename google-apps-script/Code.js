// ===== Code.gs =====
// FINAL VERSION - Direct BigQuery Connection with Accurate Deduplication Query

// ===== AWS S3 CONFIGURATION =====
const AWS_CONFIG = {
  // Set to 'dev' or 'prod'
  ENVIRONMENT: 'prod', // Change this to 'prod' when ready for production

  dev: {
    bucket: 'fiverr-business-insights-reports-dev',
    region: 'eu-west-1' // Europe (Ireland)
  },

  prod: {
    bucket: 'fiverr-business-insights-reports-prod',
    region: 'us-east-1' // US East (N. Virginia)
  }
};

function getAWSConfig() {
  return AWS_CONFIG[AWS_CONFIG.ENVIRONMENT];
}

// ===== EMAIL NOTIFICATION CONFIGURATION =====
const EMAIL_NOTIFICATION_CONFIG = {
  RECIPIENTS: ['meir.horwitz@fiverr.com', 'amit.lobenstain@fiverr.com'],
  ENABLED: true,
  SUBJECT_PREFIX: '[Fiverr Pro Reports]'
};

// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1m3NZtaDtVTphx2GafTteFEk-yPM4GqogrfF8mdC_Qpg',
  REPORTS_FOLDER_ID: '1xUFFEaumpeciil4SH03k7Pzk1WJYAr6v',
  // --- Sheets that will be populated by the BigQuery queries ---
  SHEETS: {
    USERS: 'User_List',
    REGISTERED_USERS: 'Registered users'
  },
  THRESHOLDS: {
    MUST: { TOTAL_SPEND: 3000, ORDERS_MIN: 3 }, // For report generation eligibility
    NON_MUST: { SUB_CATEGORIES_MIN: 2, SELLERS_MIN: 2, TEAM_MEMBERS_MIN: 2, AVG_ORDER_VALUE_MIN: 2 }
  },
  PROXY_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyCOAO9Ri5gViqJk2hfChMA6vIGrZSeU_0yFeqjMTS4daz5HrbidubaENGg9yBXRxMPBA/exec',
  // ===== NEW: Default BSM scheduling URL =====
  DEFAULT_BSM_URL: 'https://propages.fiverr.com/meetings/pro-168076799/bsm-round-robin-'
};

// ===== TIER NOTIFICATION CONFIGURATION =====

/**
 * Update tier thresholds if business requirements change
 * Modify these values in production as needed
 */
const TIER_NOTIFICATION_CONFIG = {
  THRESHOLDS: {
    platinum: 5000,   // Minimum annual spend for Platinum
    diamond: 25000    // Minimum annual spend for Diamond
  },
  WARNING_PERCENTAGE: 0.8,  // Show notification at 80% of threshold
  ENABLED: true             // Master switch to enable/disable notifications
};

/**
 * Gets the current tier notification configuration
 * Can be called to check settings
 */
function getTierNotificationConfig() {
  return TIER_NOTIFICATION_CONFIG;
}

/**
 * Updates tier notification configuration
 * Use this to change settings without modifying code
 * @param {object} config - New configuration values
 */
function updateTierNotificationConfig(config) {
  if (config.thresholds) {
    Object.assign(TIER_NOTIFICATION_CONFIG.THRESHOLDS, config.thresholds);
  }
  if (config.warningPercentage !== undefined) {
    TIER_NOTIFICATION_CONFIG.WARNING_PERCENTAGE = config.warningPercentage;
  }
  if (config.enabled !== undefined) {
    TIER_NOTIFICATION_CONFIG.ENABLED = config.enabled;
  }

  console.log('Updated tier notification config:', TIER_NOTIFICATION_CONFIG);
  return TIER_NOTIFICATION_CONFIG;
}


// Cache for user metadata to avoid repeated reads from the sheet
let userMapCache = null;


/**
* Creates the custom menu in the spreadsheet UI when opened.
*/
// ===== UPDATED MENU FOR OPTIMIZED GENERATION =====

/**
 * Update your onOpen() function to include the new batch management options
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Fiverr Pro Reports')
    .addItem('🌐 Open Admin Dashboard', 'openAdminDashboard')
    .addSeparator()
    .addItem('🔄 Refresh Data from BigQuery', 'refreshDataFromBigQuery')
    .addSeparator()
    .addSubMenu(ui.createMenu('☁️ S3 Sync')
      .addItem('Test S3 Upload', 'testS3Upload')
      .addItem('Test S3 Sync (7 days)', 'testS3Sync')
      .addItem('Manual S3 Sync', 'manualS3Sync')
      .addItem('Setup Daily S3 Sync', 'setupS3SyncTrigger'))
    .addSubMenu(ui.createMenu('🔍 Diagnostics')
      .addItem('Check Data Import', 'checkDataImport')
      .addItem('Verify Thresholds', 'verifyThresholds')
      .addItem('List Eligible Users', 'listEligibleUsers')
      .addItem('Debug All Users Eligibility', 'debugAllUsersEligibility')
      .addItem('Test Specific User', 'testSpecificUserFromMenu')
      .addItem('Debug User Eligibility Issue', 'debugUserEligibilityIssue')
      .addItem('Test Drive Folder Access', 'testDriveAccess')
      .addItem('Check Date Filtering', 'checkDateFiltering')
      .addItem('Test Tier Notification System', 'testTierNotificationSystem')
      .addItem('Test Email Notifications', 'testEmailNotifications'))
    .addSubMenu(ui.createMenu('📈 Reports')
      .addItem('Generate All Reports (Optimized)', 'generateAllReports')  // Updated
      .addItem('Generate Report for User', 'generateReportForUser')
      .addItem('Generate Reports with Custom Date', 'generateReportsWithCustomDate')
      .addItem('Preview Report', 'previewReportFromMenu'))
    .addSubMenu(ui.createMenu('⚙️ Batch Management')
      .addItem('Check Batch Status', 'checkBatchStatusFromMenu')
      .addItem('Setup Auto-Continue Trigger', 'setupBatchTriggerFromMenu')
      .addItem('Remove Auto-Continue Trigger', 'removeBatchTriggerFromMenu')
      .addItem('Clear Batch Progress', 'clearBatchProgressFromMenu'))
    .addToUi();
}

// ===== MENU HANDLER FUNCTIONS =====

function checkBatchStatusFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const progress = checkBatchStatus();

  if (!progress) {
    ui.alert(
      'No Batch in Progress',
      'There is no report generation batch currently in progress.\n\n' +
      'To start generating reports, use:\n' +
      '📈 Reports → Generate All Reports (Optimized)',
      ui.ButtonSet.OK
    );
  } else {
    const percentComplete = ((progress.position / progress.total) * 100).toFixed(1);
    const minutesSinceLastRun = ((Date.now() - progress.timestamp) / (1000 * 60)).toFixed(1);

    ui.alert(
      'Batch in Progress',
      `Progress: ${percentComplete}% complete\n` +
      `Position: ${progress.position}/${progress.total} users\n` +
      `Remaining: ${progress.total - progress.position} users\n` +
      `Last run: ${progress.date}\n` +
      `Time since last run: ${minutesSinceLastRun} minutes\n\n` +
      'To continue, run "Generate All Reports" again.',
      ui.ButtonSet.OK
    );
  }
}

function setupBatchTriggerFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Setup Auto-Continue Trigger',
    'This will create a trigger that automatically continues report generation every 10 minutes.\n\n' +
    'The trigger will keep running until all reports are complete.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    setupBatchGenerationTrigger();
    ui.alert(
      'Trigger Created',
      'Auto-continue trigger has been set up.\n\n' +
      'If a report generation batch is interrupted, it will automatically resume within 10 minutes.\n\n' +
      'The trigger will stop automatically when all reports are complete.',
      ui.ButtonSet.OK
    );
  }
}

function removeBatchTriggerFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Remove Auto-Continue Trigger',
    'This will remove the automatic batch continuation trigger.\n\n' +
    'Report generation will not automatically resume if interrupted.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    removeBatchGenerationTrigger();
    ui.alert(
      'Trigger Removed',
      'Auto-continue trigger has been removed and batch progress has been cleared.',
      ui.ButtonSet.OK
    );
  }
}

function clearBatchProgressFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const progress = getBatchProgress();

  if (!progress) {
    ui.alert('No Progress to Clear', 'There is no batch progress saved.', ui.ButtonSet.OK);
    return;
  }

  const percentComplete = ((progress.position / progress.total) * 100).toFixed(1);

  const response = ui.alert(
    'Clear Batch Progress',
    `Current progress: ${percentComplete}% complete (${progress.position}/${progress.total} users)\n\n` +
    'This will reset the batch and start from the beginning next time.\n\n' +
    'Are you sure?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    clearBatchProgress();
    ui.alert('Progress Cleared', 'Batch progress has been reset.', ui.ButtonSet.OK);
  }
}


// ===== EMAIL NOTIFICATION FUNCTIONS =====

/**
 * Sends email notification about batch generation status
 * @param {string} status - 'success', 'failure', 'timeout', or 'progress'
 * @param {object} details - Details about the batch run
 */
function sendBatchNotificationEmail(status, details) {
  if (!EMAIL_NOTIFICATION_CONFIG.ENABLED) {
    console.log('[Email] Notifications disabled, skipping email');
    return;
  }

  try {
    const recipients = EMAIL_NOTIFICATION_CONFIG.RECIPIENTS.join(',');
    let subject, body;

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });

    switch (status) {
      case 'success':
        subject = `${EMAIL_NOTIFICATION_CONFIG.SUBJECT_PREFIX} ✅ Batch Generation Complete`;
        body = `
Fiverr Pro Reports - Batch Generation Complete
===============================================

Status: SUCCESS ✅
Completed at: ${timestamp}
Environment: ${AWS_CONFIG.ENVIRONMENT}

Results Summary:
----------------
• Total Users Processed: ${details.processed || 0}
• New Reports Generated: ${details.success || 0}
• Reports Already Existed: ${details.alreadyExists || 0}
• Not Eligible: ${details.notEligible || 0}
• Failed: ${details.failed || 0}

S3 Upload Summary:
------------------
• Successful Uploads: ${details.s3Success || 0}
• Failed Uploads: ${details.s3Failed || 0}

Execution Time: ${details.totalTime ? details.totalTime.toFixed(1) + ' seconds' : 'N/A'}

---
This is an automated notification from the Fiverr Pro Analytics system.
        `;
        break;

      case 'failure':
        subject = `${EMAIL_NOTIFICATION_CONFIG.SUBJECT_PREFIX} ❌ Batch Generation Failed`;
        body = `
Fiverr Pro Reports - Batch Generation FAILED
=============================================

Status: FAILED ❌
Failed at: ${timestamp}
Environment: ${AWS_CONFIG.ENVIRONMENT}

Error Details:
--------------
${details.error || 'Unknown error'}

Progress at Time of Failure:
----------------------------
• Position: ${details.position || 0}/${details.total || 0} users
• Percent Complete: ${details.percentComplete || 0}%
• Users Remaining: ${(details.total || 0) - (details.position || 0)}

Partial Results (before failure):
---------------------------------
• New Reports Generated: ${details.success || 0}
• Reports Already Existed: ${details.alreadyExists || 0}
• Not Eligible: ${details.notEligible || 0}
• Failed: ${details.failed || 0}

Action Required:
----------------
The system will automatically attempt to resume from where it stopped.
If the issue persists, please check the script logs for more details.

---
This is an automated notification from the Fiverr Pro Analytics system.
        `;
        break;

      case 'timeout':
        subject = `${EMAIL_NOTIFICATION_CONFIG.SUBJECT_PREFIX} ⏱️ Batch Paused (Time Limit)`;
        body = `
Fiverr Pro Reports - Batch Paused Due to Time Limit
====================================================

Status: PAUSED (Will Auto-Resume) ⏱️
Paused at: ${timestamp}
Environment: ${AWS_CONFIG.ENVIRONMENT}

Progress Saved:
---------------
• Position: ${details.position || 0}/${details.total || 0} users
• Percent Complete: ${details.percentComplete || 0}%
• Users Remaining: ${(details.total || 0) - (details.position || 0)}

This Batch Results:
-------------------
• Processed in this run: ${details.processed || 0}
• New Reports Generated: ${details.success || 0}
• Reports Already Existed: ${details.alreadyExists || 0}
• Not Eligible: ${details.notEligible || 0}

Next Steps:
-----------
The batch will automatically resume within 10 minutes if auto-continue trigger is enabled.
No action is required.

---
This is an automated notification from the Fiverr Pro Analytics system.
        `;
        break;

      case 'resumed':
        subject = `${EMAIL_NOTIFICATION_CONFIG.SUBJECT_PREFIX} 🔄 Batch Generation Resumed`;
        body = `
Fiverr Pro Reports - Batch Generation Resumed
==============================================

Status: RESUMED 🔄
Resumed at: ${timestamp}
Environment: ${AWS_CONFIG.ENVIRONMENT}

Resuming From:
--------------
• Position: ${details.position || 0}/${details.total || 0} users
• Percent Complete: ${details.percentComplete || 0}%
• Users Remaining: ${(details.total || 0) - (details.position || 0)}

Previous Run Info:
------------------
• Last run: ${details.lastRunDate || 'Unknown'}
• Time since last run: ${details.timeSinceLastRun || 'Unknown'} minutes

---
This is an automated notification from the Fiverr Pro Analytics system.
        `;
        break;

      default:
        subject = `${EMAIL_NOTIFICATION_CONFIG.SUBJECT_PREFIX} 📊 Batch Status Update`;
        body = `Status: ${status}\nDetails: ${JSON.stringify(details, null, 2)}`;
    }

    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      body: body.trim()
    });

    console.log(`[Email] Notification sent: ${status} to ${recipients}`);

  } catch (error) {
    console.error('[Email] Failed to send notification:', error.message);
    // Don't throw - email failure shouldn't stop the batch process
  }
}

/**
 * Test function for email notifications
 */
function testEmailNotifications() {
  console.log('Testing email notifications...');

  sendBatchNotificationEmail('success', {
    processed: 100,
    success: 75,
    alreadyExists: 15,
    notEligible: 8,
    failed: 2,
    s3Success: 75,
    s3Failed: 0,
    totalTime: 245.5
  });

  console.log('Test email sent! Check your inbox.');

  try {
    SpreadsheetApp.getUi().alert('Email Test', 'Test email sent successfully! Check your inbox.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // Not running from UI
  }
}


// --- BIGQUERY SERVICE ACCOUNT AUTHENTICATION & DATA FETCHING ---


/**
* Generates and retrieves a BigQuery access token using the service account key.
* This function bypasses the OAuth2 library and directly handles the JWT creation
* and token exchange using UrlFetchApp.
*/
function getBigQueryAccessToken() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const serviceAccountKeyJson = scriptProperties.getProperty('SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKeyJson) {
    throw new Error("CRITICAL: The 'SERVICE_ACCOUNT_KEY' is not set in Script Properties.");
  }
  const serviceAccountKey = JSON.parse(serviceAccountKeyJson);


  const jwtHeader = {
    "alg": "RS256",
    "typ": "JWT"
  };


  const now = new Date();
  const iat = Math.round(now.getTime() / 1000);
  const exp = iat + 3600; // Token expires in 1 hour (max allowed)


  const claims = {
    "iss": serviceAccountKey.client_email,
    "scope": "https://www.googleapis.com/auth/bigquery",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": exp,
    "iat": iat
  };


  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(jwtHeader));
  const encodedClaims = Utilities.base64EncodeWebSafe(JSON.stringify(claims));
  const signature = Utilities.computeRsaSha256Signature(encodedHeader + "." + encodedClaims, serviceAccountKey.private_key);
  const encodedSignature = Utilities.base64EncodeWebSafe(signature);


  const jwt = encodedHeader + "." + encodedClaims + "." + encodedSignature;


  const tokenUrl = "https://oauth2.googleapis.com/token";
  const tokenPayload = {
    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "assertion": jwt
  };


  const options = {
    "method": "post",
    "contentType": "application/x-www-form-urlencoded",
    "payload": tokenPayload
  };


  let tokenResponse;
  try {
    tokenResponse = UrlFetchApp.fetch(tokenUrl, options);
  } catch (e) {
    throw new Error(`Failed to fetch access token: ${e.message}`);
  }


  const tokenData = JSON.parse(tokenResponse.getContentText());


  if (tokenData.error) {
    throw new Error(`Token acquisition error: ${tokenData.error_description || tokenData.error}`);
  }


  return tokenData.access_token;
}


/**
* Executes a BigQuery query and returns the results as a 2D array.
*/
function runBigQueryQuery(accessToken, projectId, query) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;
  const requestBody = { query: query, useLegacySql: false, timeoutMs: 300000 }; // 5-minute timeout
  const options = { method: 'post', contentType: 'application/json', headers: { 'Authorization': 'Bearer ' + accessToken }, payload: JSON.stringify(requestBody), muteHttpExceptions: true };
  let response = UrlFetchApp.fetch(url, options);
  let result = JSON.parse(response.getContentText());


  if (response.getResponseCode() !== 200) throw new Error(`BigQuery API Error: ${result.error.message}`);


  const jobId = result.jobReference.jobId;
  const location = result.jobReference.location;
  const jobUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries/${jobId}?location=${location}`;
  const fetchOptions = { method: 'get', headers: { 'Authorization': 'Bearer ' + accessToken } };


  while (result.jobComplete === false) {
    Utilities.sleep(1500);
    response = UrlFetchApp.fetch(jobUrl, fetchOptions);
    result = JSON.parse(response.getContentText());
  }


  if (result.totalRows == "0" || !result.rows) return [];


  const headers = result.schema.fields.map(field => field.name);
  const tableData = [headers];
  result.rows.forEach(row => {
    tableData.push(row.f.map(cell => (cell.v === null ? '' : cell.v)));
  });
  return tableData;
}


function writeToSheet(sheetName, data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();
  if (data.length > 0 && data[0].length > 0) {
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  }
}


// --- WEB APP AND DASHBOARD FUNCTIONS ---


function doGet(e) {
  const page = e.parameter.page || 'dashboard';


  if (page === 'dashboard') {
    return HtmlService.createHtmlOutputFromFile('AdminDashboard.html')
      .setTitle('Fiverr Pro Analytics - Admin Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  } else if (page === 'preview') {
    const userId = e.parameter.userId || '';
    const customDateRange = e.parameter.startDate && e.parameter.endDate ?
      { startDate: e.parameter.startDate, endDate: e.parameter.endDate } : null;

    // ===== MODIFIED =====
    // Use the enhanced function that includes tier notification data
    const reportData = getReportDataWithTierNotification(userId, customDateRange);
    // ====================


    if (!reportData) {
      return HtmlService.createHtmlOutput('User not found or not eligible for report for the selected date range.');
    }

    const htmlTemplate = HtmlService.createTemplateFromFile('ReportTemplate.html');
    htmlTemplate.data = reportData;


    return htmlTemplate.evaluate()
      .setTitle('Fiverr Pro Business Analytics Report')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (page === 'register') {
    // ... registration logic
  }
  return HtmlService.createHtmlOutput('Invalid request');
}


/**
* Loads the user metadata once and caches it to prevent repeated reads.
* @param {boolean} forceFromBigQuery - If true, fetches directly from BigQuery instead of cached sheet
* @returns {Map<string, object>} A map of user IDs to user data.
*/
function getUsersMap(forceFromBigQuery = false) {
  // If requesting fresh data from BigQuery, bypass cache
  if (forceFromBigQuery) {
    console.log('[getUsersMap] Fetching fresh user data from BigQuery');
    return getUsersMapFromBigQuery();
  }
  if (userMapCache) {
    return userMapCache;
  }
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
    const userMap = new Map();


    if (!sheet || sheet.getLastRow() <= 1) {
      console.warn(`The '${CONFIG.SHEETS.USERS}' sheet is missing or empty. Fetching from BigQuery instead.`);
      return getUsersMapFromBigQuery();
    }
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userIdIndex = headers.indexOf('business_account_team_id');
    if (userIdIndex === -1) {
      console.error(`'business_account_team_id' column not found in '${CONFIG.SHEETS.USERS}' sheet.`);
      return userMap;
    }
    const ownerNameIndex = headers.indexOf('owner_name');
    const ownerEmailIndex = headers.indexOf('owner_email');
    const tierIndex = headers.indexOf('tier');
    const packageTypeIndex = headers.indexOf('package_type');
    const pointsBalanceIndex = headers.indexOf('current_points_balance');


    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const userId = String(row[userIdIndex] || '');
      if (userId) {
        userMap.set(userId, {
          userId: userId, ownerName: String(row[ownerNameIndex] || ''), email: String(row[ownerEmailIndex] || ''),
          tier: String(row[tierIndex] || '').trim().toLowerCase(), packageType: String(row[packageTypeIndex] || ''),
          pointsBalance: parseFloat(String(row[pointsBalanceIndex] || '0').replace(/,/g, '')) || 0
        });
      }
    }
    userMapCache = userMap;
    return userMap;
  } catch (error) {
    console.error('A critical error occurred in the getUsersMap() function:', error);
    return new Map();
  }
}


/**
* Fetches user data directly from BigQuery (always fresh, not cached)
* @returns {Map<string, object>} A map of user IDs to user data.
*/
function getUsersMapFromBigQuery() {
  try {
    const projectId = 'fiverr-dwh-artifact-prod';
    const query = `
      SELECT
        business_account_team_id,
        owner_name,
        owner_email,
        tier,
        package_type,
        current_points_balance
      FROM
        \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_user_list\`
      WHERE
        _partitiontime = (SELECT MAX(_partitiontime) FROM \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_user_list\`);
    `;

    const accessToken = getBigQueryAccessToken();
    const result = runBigQueryQuery(accessToken, projectId, query);

    const userMap = new Map();

    if (result.length < 2) {
      console.warn('No user data returned from BigQuery');
      return userMap;
    }

    const headers = result[0];
    const userIdIndex = headers.indexOf('business_account_team_id');
    const ownerNameIndex = headers.indexOf('owner_name');
    const ownerEmailIndex = headers.indexOf('owner_email');
    const tierIndex = headers.indexOf('tier');
    const packageTypeIndex = headers.indexOf('package_type');
    const pointsBalanceIndex = headers.indexOf('current_points_balance');

    for (let i = 1; i < result.length; i++) {
      const row = result[i];
      const userId = String(row[userIdIndex] || '');
      if (userId) {
        userMap.set(userId, {
          userId: userId,
          ownerName: String(row[ownerNameIndex] || ''),
          email: String(row[ownerEmailIndex] || ''),
          tier: String(row[tierIndex] || '').trim().toLowerCase(),
          packageType: String(row[packageTypeIndex] || ''),
          pointsBalance: parseFloat(String(row[pointsBalanceIndex] || '0').replace(/,/g, '')) || 0
        });
      }
    }

    console.log(`[getUsersMapFromBigQuery] Loaded ${userMap.size} users from BigQuery`);
    return userMap;
  } catch (error) {
    console.error('Error fetching users from BigQuery:', error);
    return new Map();
  }
}


/**
* ✅ FINAL VERSION: Fetches and processes dashboard data for a given date range.
* This ensures real-time accuracy and dynamic filtering.
* @param {string} startDate - The start date of the date range (YYYY-MM-DD).
* @param {string} endDate - The end date of the date range (YYYY-MM-DD).
*/
function getDashboardData(startDate, endDate) {
  try {
    const projectId = 'fiverr-dwh-artifact-prod';

    const dashboardQuery = `
      WITH
        OrderSummary AS (
          SELECT
            business_account_team_id,
            SUM(amount) AS total_spend,
            COUNT(order_id) AS total_orders
          FROM (
            SELECT
              business_account_team_id,
              order_id,
              amount
            FROM
              \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_orders\`
            WHERE
              DATE(order_created_at) >= DATE('${startDate}')
              AND DATE(order_created_at) <= DATE('${endDate}')
              AND business_account_team_id IS NOT NULL
            QUALIFY
              ROW_NUMBER() OVER(PARTITION BY order_id ORDER BY order_created_at) = 1
          )
          GROUP BY
            business_account_team_id
        )
      SELECT
        users.business_account_team_id,
        users.owner_name,
        users.owner_email,
        users.tier,
        users.package_type,
        users.current_points_balance,
        COALESCE(summary.total_spend, 0) AS total_spend,
        COALESCE(summary.total_orders, 0) AS total_orders
      FROM
        \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_user_list\` AS users
      LEFT JOIN
        OrderSummary AS summary ON users.business_account_team_id = summary.business_account_team_id
      WHERE
        users._partitiontime = (SELECT MAX(_partitiontime) FROM \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_user_list\`);
    `;


    const accessToken = getBigQueryAccessToken();
    const queryResults = runBigQueryQuery(accessToken, projectId, dashboardQuery);


    if (queryResults.length < 2) {
      console.warn("BigQuery returned no user data.");
      return [];
    }

    const headers = queryResults.shift();
    const idIndex = headers.indexOf('business_account_team_id');
    const nameIndex = headers.indexOf('owner_name');
    const emailIndex = headers.indexOf('owner_email');
    const tierIndex = headers.indexOf('tier');
    const packageIndex = headers.indexOf('package_type');
    const pointsIndex = headers.indexOf('current_points_balance');
    const spendIndex = headers.indexOf('total_spend');
    const ordersIndex = headers.indexOf('total_orders');

    const dashboardUsers = queryResults.map(row => {
      const totalSpend = parseFloat(row[spendIndex]) || 0;
      const totalOrders = parseInt(row[ordersIndex]) || 0;

      const thresholdCheck = meetsThresholds({
        mainKPIs: {
          totalSpend: totalSpend,
          orders: totalOrders
        }
      });

      return {
        userId: String(row[idIndex]),
        ownerName: String(row[nameIndex]),
        email: String(row[emailIndex]),
        tier: String(row[tierIndex] || '').trim().toLowerCase(),
        packageType: String(row[packageIndex] || ''),
        pointsBalance: parseFloat(row[pointsIndex] || '0') || 0,
        totalSpend: totalSpend,
        isEligible: thresholdCheck.eligible,
        reasons: thresholdCheck.reasons
      };
    });


    return dashboardUsers;


  } catch (e) {
    console.error(`Fatal error in getDashboardData: ${e.toString()}`, e.stack);
    return { error: true, message: e.toString() };
  }
}


/**
* Fetches detailed orders for a specific user directly from BigQuery.
* @param {string} userId - The ID of the user.
* @param {object} dateRange - Object containing startDate and endDate in YYYY-MM-DD format.
* @returns {Array<object>} An array of order objects.
*/
function getOrdersFromBigQuery(userId, dateRange) {
  const projectId = 'fiverr-dwh-artifact-prod';
  const query = `
    SELECT
      order_id,
      order_created_at,
      sub_category_name,
      buyer_id,
      buyer_name,
      buyer_email,
      seller_name,
      amount,
      tier
    FROM
      \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_orders\`
    WHERE
      business_account_team_id = '${userId}'
      AND DATE(order_created_at) >= DATE('${dateRange.startDate}')
      AND DATE(order_created_at) <= DATE('${dateRange.endDate}')
    QUALIFY
      ROW_NUMBER() OVER(PARTITION BY order_id ORDER BY order_created_at) = 1
  `;
  const accessToken = getBigQueryAccessToken();
  const queryResults = runBigQueryQuery(accessToken, projectId, query);


  if (queryResults.length < 2) {
    return [];
  }


  const headers = queryResults.shift();
  const orderDateIndex = headers.indexOf('order_created_at');
  const subCategoryIndex = headers.indexOf('sub_category_name');
  const buyerIdIndex = headers.indexOf('buyer_id');
  const buyerNameIndex = headers.indexOf('buyer_name');
  const buyerEmailIndex = headers.indexOf('buyer_email');
  const sellerNameIndex = headers.indexOf('seller_name');
  const amountIndex = headers.indexOf('amount');
  const tierIndex = headers.indexOf('tier');
  return queryResults.map(row => ({
    orderDate: new Date(row[orderDateIndex]),
    subCategory: row[subCategoryIndex] || 'Other',
    buyerId: row[buyerIdIndex] || '',
    buyerName: row[buyerNameIndex] || '',
    buyerEmail: row[buyerEmailIndex] || '',
    sellerName: row[sellerNameIndex] || 'Unknown Seller',
    amount: parseFloat(row[amountIndex]) || 0,
    tier: row[tierIndex] || ''
  }));
}


/**
* NEW FUNCTION: Fetches and returns raw order data for a specific user and date range.
* This is designed specifically for the new logs tab in the dashboard.
* @param {string} userId - The user ID to query.
* @param {string} startDate - The start date for the query (YYYY-MM-DD).
* @param {string} endDate - The end date for the query (YYYY-MM-DD).
* @returns {Array} A 2D array of the raw query results (headers + rows).
*/
function getReportLogData(userId, startDate, endDate) {
  try {
    const projectId = 'fiverr-dwh-artifact-prod';
    const logQuery = `
            SELECT *
            FROM \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_orders\`
            WHERE
              business_account_team_id = '${userId}'
              AND DATE(order_created_at) >= DATE('${startDate}')
              AND DATE(order_created_at) <= DATE('${endDate}')
            QUALIFY
              ROW_NUMBER() OVER(PARTITION BY order_id ORDER BY order_created_at) = 1
        `;


    const accessToken = getBigQueryAccessToken();
    const queryResults = runBigQueryQuery(accessToken, projectId, logQuery);

    return queryResults;
  } catch (e) {
    console.error(`Error fetching log data from BigQuery: ${e.toString()}`, e.stack);
    return { error: true, message: `Error fetching log data: ${e.message}` };
  }
}


// ===== TIER NOTIFICATION SYSTEM - NEWLY ADDED =====

/**
 * Calculates the user's annual spend and tier status
 * Uses the tier from the database (not calculated from spend)
 * @param {string} userId - The business account team ID
 * @returns {object} Tier status information including annual spend and top category
 */
function getUserTierStatus(userId) {
  try {
    console.log(`[getUserTierStatus] Starting for user ${userId}`);

    const projectId = 'fiverr-dwh-artifact-prod';

    // Get current year's date range
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearStartFormatted = Utilities.formatDate(yearStart, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const todayFormatted = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    console.log(`[getUserTierStatus] Date range: ${yearStartFormatted} to ${todayFormatted}`);

    const query = `
      WITH OrderData AS (
        SELECT
          business_account_team_id,
          amount,
          sub_category_name
        FROM
          \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_orders\`
        WHERE
          business_account_team_id = '${userId}'
          AND DATE(order_created_at) >= DATE('${yearStartFormatted}')
          AND DATE(order_created_at) <= DATE('${todayFormatted}')
        QUALIFY
          ROW_NUMBER() OVER(PARTITION BY order_id ORDER BY order_created_at) = 1
      ),
      SpendSummary AS (
        SELECT
          business_account_team_id,
          SUM(amount) AS annual_spend
        FROM OrderData
        GROUP BY business_account_team_id
      ),
      TopCategory AS (
        SELECT
          sub_category_name,
          SUM(amount) AS category_spend
        FROM OrderData
        WHERE sub_category_name IS NOT NULL
        GROUP BY sub_category_name
        ORDER BY category_spend DESC
        LIMIT 1
      )
      SELECT
        COALESCE(s.annual_spend, 0) AS annual_spend,
        COALESCE(t.sub_category_name, 'Programming & Tech') AS top_category,
        u.tier AS current_tier
      FROM SpendSummary s
      LEFT JOIN TopCategory t ON TRUE
      LEFT JOIN \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_user_list\` u 
        ON u.business_account_team_id = '${userId}' 
        AND date(u._partitiontime) = current_date() - 1
    `;

    const accessToken = getBigQueryAccessToken();
    const result = runBigQueryQuery(accessToken, projectId, query);

    if (result.length < 2) {
      console.warn(`[getUserTierStatus] No data found for user ${userId}`);
      return {
        annualSpend: 0,
        topCategory: 'Programming & Tech',
        currentTier: 'platinum'
      };
    }

    const annualSpend = parseFloat(result[1][0]) || 0;
    const topCategory = result[1][1] || 'Programming & Tech';
    const currentTier = (result[1][2] || 'platinum').toLowerCase().trim();

    console.log(`[getUserTierStatus] Annual spend: ${annualSpend}`);
    console.log(`[getUserTierStatus] Top category: ${topCategory}`);
    console.log(`[getUserTierStatus] Current tier from database: ${currentTier}`);

    return {
      annualSpend: Math.round(annualSpend),
      topCategory: topCategory,
      currentTier: currentTier
    };

  } catch (error) {
    console.error('[getUserTierStatus] Error:', error);
    return {
      annualSpend: 0,
      topCategory: 'Programming & Tech',
      currentTier: 'platinum'
    };
  }
}

/**
 * Determines if the tier notification should be shown to the user
 * Shows notification when user is below their tier's threshold
 * Uses the tier from the database
 * @param {string} userId - The business account team ID
 * @returns {boolean} Whether to show the notification
 */
function shouldShowTierNotification(userId) {
  try {
    console.log(`[shouldShowTierNotification] Starting check for user ${userId}`);
    console.log(`[shouldShowTierNotification] Master switch enabled: ${TIER_NOTIFICATION_CONFIG.ENABLED}`);

    if (!TIER_NOTIFICATION_CONFIG.ENABLED) {
      console.log(`[shouldShowTierNotification] Master switch is OFF - returning false`);
      return false;
    }

    const tierStatus = getUserTierStatus(userId);
    console.log(`[shouldShowTierNotification] Tier status:`, JSON.stringify(tierStatus));

    const tier = tierStatus.currentTier.toLowerCase().trim();
    const thresholds = TIER_NOTIFICATION_CONFIG.THRESHOLDS;

    console.log(`[shouldShowTierNotification] User's tier: ${tier}`);
    console.log(`[shouldShowTierNotification] All thresholds:`, JSON.stringify(thresholds));

    const tierThreshold = thresholds[tier] || thresholds.platinum;

    console.log(`[shouldShowTierNotification] Threshold for '${tier}' tier: ${tierThreshold}`);

    // Show notification if they're below their tier's threshold
    const shouldShow = tierStatus.annualSpend < tierThreshold;

    console.log(`[shouldShowTierNotification] Comparison: ${tierStatus.annualSpend} < ${tierThreshold} = ${shouldShow}`);
    console.log(`[shouldShowTierNotification] Final result: ${shouldShow}`);

    return shouldShow;

  } catch (error) {
    console.error('[shouldShowTierNotification] Error:', error);
    return false;
  }
}

/**
 * Gets tier notification data for dashboard display
 * Can be called via google.script.run from the dashboard
 * @param {string} userId - The business account team ID
 * @returns {object|null} Tier notification data or null if shouldn't show
 */
function getTierNotificationData(userId) {
  try {
    if (!shouldShowTierNotification(userId)) {
      return null;
    }

    return getUserTierStatus(userId);

  } catch (error) {
    console.error('Error getting tier notification data:', error);
    return null;
  }
}

/**
 * Called from dashboard to check if user needs tier notification
 * Usage: google.script.run.withSuccessHandler(callback).checkUserTierStatus(userId)
 */
function checkUserTierStatus(userId) {
  return getTierNotificationData(userId);
}

/**
 * Gets tier statistics for dashboard display
 * Shows how many users are approaching tier thresholds
 */
function getTierStatistics() {
  const userMap = getUsersMap();
  const userIds = Array.from(userMap.keys());

  const stats = {
    total: userIds.length,
    byTier: {
      platinum: { total: 0, atRisk: 0, safe: 0 },
      diamond: { total: 0, atRisk: 0, safe: 0 }
    }
  };

  userIds.forEach(userId => {
    const user = userMap.get(userId);
    const tier = user ? user.tier.toLowerCase() : 'platinum';

    if (stats.byTier[tier]) {
      stats.byTier[tier].total++;

      if (shouldShowTierNotification(userId)) {
        stats.byTier[tier].atRisk++;
      } else {
        const tierStatus = getUserTierStatus(userId);
        const thresholds = TIER_NOTIFICATION_CONFIG.THRESHOLDS;
        const tierThreshold = thresholds[tier] || thresholds.platinum;

        if (tierStatus.annualSpend >= tierThreshold) {
          stats.byTier[tier].safe++;
        }
      }
    }
  });

  return stats;
}

/**
 * Modified getReportData to include tier notification flag
 * This function wraps the existing getReportData and appends tier info
 */
function getReportDataWithTierNotification(userId, customDateRange = null) {
  try {
    // Get existing report data (your current implementation)
    const reportData = getReportData(userId, customDateRange);

    if (!reportData) {
      return null;
    }

    // Add tier notification data
    const tierNotificationData = getTierNotificationData(userId);
    reportData.tierNotification = tierNotificationData;
    reportData.showTierNotification = tierNotificationData !== null;

    return reportData;

  } catch (error) {
    console.error(`Error getting report data with tier notification for ${userId}:`, error);
    return null;
  }
}


// ===== END TIER NOTIFICATION SYSTEM =====


function getMetricsDataForUser(userId, preloadedData = null, customDateRange = null) {
  try {
    // First try cached data
    let userMap = getUsersMap();
    let user = userMap.get(userId);

    // If not found, fetch fresh from BigQuery
    if (!user) {
      console.log(`[getMetricsDataForUser] User ${userId} not found in cache, fetching from BigQuery`);
      userMap = getUsersMap(true); // Force fetch from BigQuery
      user = userMap.get(userId);

      if (!user) {
        console.log(`[getMetricsDataForUser] User ${userId} not found in BigQuery either`);
        return { user: null, orders: [] };
      }
    }


    let startDate, endDate;
    if (customDateRange) {
      console.log(`[getMetricsDataForUser] Using custom date range: ${JSON.stringify(customDateRange)}`);
      startDate = new Date(customDateRange.startDate);
      endDate = new Date(customDateRange.endDate);
    } else {
      const now = new Date();
      if (user.packageType === 'pro_advanced') {
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else {
        endDate = now;
        startDate = new Date(2025, 0, 1); // January 1, 2025
      }
      console.log(`[getMetricsDataForUser] Using default dates for ${user.packageType}`);
    }

    const formattedStartDate = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const formattedEndDate = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    console.log(`[getMetricsDataForUser] Formatted dates for BigQuery: ${formattedStartDate} to ${formattedEndDate}`);

    const userOrders = getOrdersFromBigQuery(userId, { startDate: formattedStartDate, endDate: formattedEndDate });
    console.log(`[getMetricsDataForUser] Retrieved ${userOrders.length} orders from BigQuery`);

    if (userOrders.length === 0) {
      return { user: user, orders: [], dateRange: { startDate, endDate, isCustom: !!customDateRange } };
    }


    return { user, orders: userOrders, dateRange: { startDate, endDate, isCustom: !!customDateRange } };


  } catch (error) {
    console.error(`Error in getMetricsDataForUser for ${userId}:`, error.stack);
    return { user: preloadedData ? preloadedData.user : null, orders: [] };
  }
}


function processMetricsData(userId, userData, registeredUsersSet = new Set(), customDateRange = null) {
  try {
    const { user, orders, isAdvanced, dateRange } = userData;
    if (!user || !orders || orders.length === 0) return null;
    const isRegistered = registeredUsersSet.has(userId);
    const now = new Date();
    const savingsRate = 0.05;
    const totalSpend = orders.reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;
    const totalSavings = totalSpend * savingsRate;
    const spendBySubCategory = {},
      spendByTeamMember = {},
      spendBySellerRaw = {};
    orders.forEach(order => {
      const amount = parseFloat(order.amount) || 0;
      const subCategory = order.subCategory || 'Other';
      if (!spendBySubCategory[subCategory]) spendBySubCategory[subCategory] = { spend: 0, orders: 0 };
      spendBySubCategory[subCategory].spend += amount;
      spendBySubCategory[subCategory].orders++;
      const memberName = order.buyerName || `Member ${order.buyerId || 'Unknown'}`;
      if (!spendByTeamMember[memberName]) spendByTeamMember[memberName] = { spend: 0, orders: 0 };
      spendByTeamMember[memberName].spend += amount;
      spendByTeamMember[memberName].orders++;
      const sellerName = order.sellerName || 'Unknown Seller';
      if (!spendBySellerRaw[sellerName]) spendBySellerRaw[sellerName] = { spend: 0, orders: 0 };
      spendBySellerRaw[sellerName].spend += amount;
      spendBySellerRaw[sellerName].orders++;
    });
    const spendBySeller = {};
    const sortedSellers = Object.entries(spendBySellerRaw).sort(([, a], [, b]) => b.spend - a.spend);
    const topSellersCount = 10;
    const legendNameForOthers = 'Your smaller orders';
    if (sortedSellers.length > topSellersCount) {
      for (let i = 0; i < topSellersCount; i++) {
        const [name, data] = sortedSellers[i];
        spendBySeller[name] = data;
      }
      const others = { spend: 0, orders: 0, details: [] };
      for (let i = topSellersCount; i < sortedSellers.length; i++) {
        const [name, data] = sortedSellers[i];
        others.spend += data.spend;
        others.orders += data.orders;
        others.details.push({
          name: name,
          spend: Math.round(data.spend),
          orders: data.orders
        });
      }
      if (others.details.length > 0) spendBySeller[legendNameForOthers] = others;
    } else {
      Object.assign(spendBySeller, spendBySellerRaw);
    }
    const uniqueFreelancers = Object.keys(spendBySellerRaw).length;
    const topFreelancers = Object.entries(spendBySellerRaw)
      .sort(([, a], [, b]) => b.spend - a.spend)
      .slice(0, 3)
      .map(([name, data]) => ({
        name: name,
        orders: data.orders,
        spend: Math.round(data.spend),
        rating: (Math.random() * 0.5 + 4.5).toFixed(1),
        category: orders.find(o => o.sellerName === name)?.subCategory || 'General'
      }));
    const monthlyTrends = [];
    const trendsAggregator = {};
    orders.forEach(order => {
      try {
        if (order.orderDate && order.orderDate instanceof Date && !isNaN(order.orderDate.getTime())) {
          const key = `${order.orderDate.getFullYear()}-${order.orderDate.getMonth()}`;
          if (!trendsAggregator[key]) trendsAggregator[key] = { spend: 0, orders: 0, savings: 0 };
          const amount = parseFloat(order.amount) || 0;
          trendsAggregator[key].spend += amount;
          trendsAggregator[key].orders++;
          trendsAggregator[key].savings += amount * savingsRate;
        }
      } catch (trendError) {
        console.error('Error processing order for trends:', trendError, order);
      }
    });
    if (dateRange) {
      let currentDate = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), 1);
      while (currentDate < dateRange.endDate) {
        const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        const data = trendsAggregator[key] || { spend: 0, orders: 0, savings: 0 };
        monthlyTrends.push({
          month: Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MMM"),
          spend: Math.round(data.spend),
          orders: data.orders,
          savings: Math.round(data.savings)
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    let reportPeriod;
    if (dateRange) {
      const startFormatted = Utilities.formatDate(dateRange.startDate, Session.getScriptTimeZone(), "MMM d, yyyy");
      const endFormatted = Utilities.formatDate(dateRange.endDate, Session.getScriptTimeZone(), "MMM d, yyyy");
      reportPeriod = `${startFormatted} - ${endFormatted}`;
    } else {
      reportPeriod = "Since Jan 1, 2025";
    }
    const registrationUrl = `${CONFIG.PROXY_SCRIPT_URL}?teamId=${encodeURIComponent(user.userId || '')}&ownerId=${encodeURIComponent(user.ownerId || '')}&ownerName=${encodeURIComponent(user.ownerName || '')}&ownerEmail=${encodeURIComponent(user.email || '')}&tier=${encodeURIComponent(user.tier || '')}&packageType=${encodeURIComponent(user.packageType || '')}`;

    // ===== NEW: BSM URL - can be customized per user if needed =====
    const bsmUrl = CONFIG.DEFAULT_BSM_URL;

    const generatedDateFormatted = Utilities.formatDate(now, Session.getScriptTimeZone(), "MMM d, yyyy");
    const reportData = {
      contact: {
        firstName: (user.ownerName || '').split(' ')[0] || 'User',
        email: user.email || '',
        company: user.ownerName || '',
        tier: user.tier || '',
        packageType: user.packageType || '',
        userId: userId || '',
        pointsBalance: parseFloat(user.pointsBalance) || 0,
        tierIcon: getTierIconHtml(user.tier || '')
      },
      reportPeriod: reportPeriod,
      generatedDate: generatedDateFormatted,
      mainKPIs: {
        totalSpend: Math.round(totalSpend),
        potentialSavings: Math.round(totalSavings),
        orders: totalOrders
      },
      monthlyTrends: monthlyTrends,
      pendingKPIs: {
        avgProjectValue: Math.round(avgOrderValue),
        repeatHireRate: totalOrders > 0 ? 75 : 0,
        ordersPerFreelancer: uniqueFreelancers > 0 ? (totalOrders / uniqueFreelancers).toFixed(1) : '0'
      },
      spendBySubCategory: spendBySubCategory,
      spendByTeamMember: spendByTeamMember,
      spendBySeller: spendBySeller,
      topFreelancers: topFreelancers,
      isRegistered: isRegistered,
      registrationUrl: registrationUrl,
      bsmUrl: bsmUrl,  // ===== NEW: Added BSM URL =====
      callToAction: !isRegistered
    };
    return reportData;
  } catch (error) {
    console.error(`Error processing metrics data for user ${userId}:`, error.stack);
    return null;
  }
}


function getReportData(userId, customDateRange = null) {
  try {
    console.log(`[getReportData] Starting for user ${userId}`);
    console.log(`[getReportData] Custom date range:`, JSON.stringify(customDateRange));

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const registeredUsersSheet = ss.getSheetByName(CONFIG.SHEETS.REGISTERED_USERS);
    const registeredUsersData = registeredUsersSheet && registeredUsersSheet.getLastRow() > 1 ? registeredUsersSheet.getRange('A2:A' + registeredUsersSheet.getLastRow()).getValues().flat().filter(String) : [];
    const registeredUsersSet = new Set(registeredUsersData);

    // This will automatically fetch from BigQuery if user not in cache
    const userData = getMetricsDataForUser(userId, null, customDateRange);
    console.log(`[getReportData] User found: ${!!userData?.user}, Orders count: ${userData?.orders?.length || 0}`);

    if (!userData || !userData.user) {
      console.log(`[getReportData] User ${userId} not found in BigQuery - user may not exist`);
      return null;
    }

    const processedData = processMetricsData(userId, userData, registeredUsersSet, customDateRange);

    if (!processedData) {
      console.log(`[getReportData] No processed data returned for user ${userId} - likely no orders in date range`);
      return null;
    }

    console.log(`[getReportData] Processed data - Total Spend: $${processedData.mainKPIs.totalSpend}, Orders: ${processedData.mainKPIs.orders}`);

    const thresholdCheck = meetsThresholds(processedData);
    if (!thresholdCheck.eligible) {
      console.log(`[getReportData] User ${userId} not eligible. Reasons: ${thresholdCheck.reasons.join(', ')}`);
      return null;
    }

    processedData.visibility = checkNonMustThresholds(processedData);
    processedData.showRegistrationButton = processedData.callToAction;

    console.log(`[getReportData] User ${userId} is eligible, returning report data`);
    return processedData;
  } catch (error) {
    console.error(`[getReportData] Error for user ${userId}:`, error.stack);
    return null;
  }
}


function meetsThresholds(reportData) {
  const reasons = [];
  if (reportData.mainKPIs.totalSpend < CONFIG.THRESHOLDS.MUST.TOTAL_SPEND) reasons.push(`Total spend ($${reportData.mainKPIs.totalSpend}) is below $${CONFIG.THRESHOLDS.MUST.TOTAL_SPEND}`);
  if (reportData.mainKPIs.orders < CONFIG.THRESHOLDS.MUST.ORDERS_MIN) reasons.push(`Orders (${reportData.mainKPIs.orders}) are below ${CONFIG.THRESHOLDS.MUST.ORDERS_MIN}`);
  return { eligible: reasons.length === 0, reasons: reasons };
}


function checkNonMustThresholds(reportData) {
  return {
    showSubCategories: Object.keys(reportData.spendBySubCategory || {}).length >= CONFIG.THRESHOLDS.NON_MUST.SUB_CATEGORIES_MIN,
    showSellers: Object.keys(reportData.spendBySeller || {}).length >= CONFIG.THRESHOLDS.NON_MUST.SELLERS_MIN,
    showTeamMembers: Object.keys(reportData.spendByTeamMember || {}).length >= CONFIG.THRESHOLDS.NON_MUST.TEAM_MEMBERS_MIN,
    showAvgOrderValue: reportData.pendingKPIs.avgProjectValue >= CONFIG.THRESHOLDS.NON_MUST.AVG_ORDER_VALUE_MIN
  };
}


function refreshDataFromBigQuery() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Starting Data Refresh', 'Data will be refreshed from BigQuery. This may take a few moments.', ui.ButtonSet.OK);
  const result = fetchAndPopulateUsersFromBigQuery();
  if (result.error) {
    ui.alert('Refresh Failed', `Error: ${result.message}`, ui.ButtonSet.OK);
  } else {
    ui.alert('Refresh Complete', result.message, ui.ButtonSet.OK);
  }
}


function fetchAndPopulateUsersFromBigQuery() {
  try {
    const projectId = 'fiverr-dwh-artifact-prod';
    const query = `
      SELECT
        business_account_team_id,
        owner_name,
        owner_email,
        tier,
        package_type,
        current_points_balance
      FROM
        \`fiverr-dwh-artifact-prod.tf_rnd.artifact_bussines_insights_user_list\`
      WHERE
        date(_partitiontime) = current_date() - 1;
    `;
    const accessToken = getBigQueryAccessToken();
    const result = runBigQueryQuery(accessToken, projectId, query);
    if (result.length > 1) {
      writeToSheet(CONFIG.SHEETS.USERS, result);
      userMapCache = null;
      return { error: false, message: `Successfully refreshed user data. ${result.length - 1} users imported.` };
    } else {
      return { error: true, message: 'No user data was returned from BigQuery.' };
    }
  } catch (e) {
    console.error('Error in fetchAndPopulateUsersFromBigQuery:', e);
    return { error: true, message: e.toString() };
  }
}


function openAdminDashboard() {
  const htmlOutput = HtmlService.createHtmlOutputFromFile('AdminDashboard.html')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Fiverr Pro Analytics - Admin Dashboard');
}


function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}


function generateAllReports() {
  const ui = SpreadsheetApp.getUi();

  const progress = getBatchProgress();
  if (progress) {
    const percentComplete = ((progress.position / progress.total) * 100).toFixed(1);
    const response = ui.alert(
      'Resume Batch?',
      `A batch is ${percentComplete}% complete (${progress.position}/${progress.total} users).\n\n` +
      `Do you want to continue from where it left off?`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      clearBatchProgress();
      ui.alert('Progress cleared. Starting fresh batch.');
    }
  }

  ui.alert(
    'Starting Report Generation',
    'Report generation will begin. This may take several runs if you have many users.\n\n' +
    'The process will automatically save progress and can be resumed if it times out.',
    ui.ButtonSet.OK
  );

  const result = generateAllReportsOptimized();

  if (result.status === 'batch_complete') {
    ui.alert(
      'Batch Progress Saved',
      `Processed ${result.processed} users (${result.percentComplete}% complete).\n\n` +
      `Generated: ${result.success}\n` +
      `Already exist: ${result.alreadyExists}\n` +
      `Not eligible: ${result.notEligible}\n\n` +
      `Run "Generate All Reports" again to continue, or set up automatic continuation.`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      'Generation Complete!',
      `All ${result.processed} users processed!\n\n` +
      `New reports: ${result.success}\n` +
      `Already existed: ${result.alreadyExists}\n` +
      `Not eligible: ${result.notEligible}\n` +
      `Failed: ${result.failed}\n\n` +
      `S3 Uploads: ${result.s3Success} successful, ${result.s3Failed} failed\n` +
      `Time: ${result.totalTime.toFixed(1)} seconds`,
      ui.ButtonSet.OK
    );
  }
}


function generateReportsWithCustomDate() {
  const ui = SpreadsheetApp.getUi();
  const dateResponse = ui.prompt('Custom Date Range', 'Enter start date and end date (YYYY-MM-DD,YYYY-MM-DD):', ui.ButtonSet.OK_CANCEL);
  if (dateResponse.getSelectedButton() === ui.Button.OK) {
    const dates = dateResponse.getResponseText().split(',').map(d => d.trim());
    if (dates.length === 2) {
      const customDateRange = { startDate: dates[0], endDate: dates[1] };
      const result = generateReportsForAllUsers(customDateRange);
      ui.alert('Report Generation Complete', result.message, ui.ButtonSet.OK);
    } else {
      ui.alert('Invalid Input', 'Please enter dates in the format: YYYY-MM-DD,YYYY-MM-DD', ui.ButtonSet.OK);
    }
  }
}


function generateReportForUser() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Generate Report for User', 'Enter Business Account Team ID:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    const userId = response.getResponseText().trim();
    if (userId) {
      const userData = getMetricsDataForUser(userId);
      if (!userData || !userData.user) {
        ui.alert('User Not Found', `No data found for user ID: ${userId}`, ui.ButtonSet.OK);
        return;
      }
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const registeredUsersSheet = ss.getSheetByName(CONFIG.SHEETS.REGISTERED_USERS);
      const registeredUsersData = registeredUsersSheet && registeredUsersSheet.getLastRow() > 1 ? registeredUsersSheet.getRange('A2:A' + registeredUsersSheet.getLastRow()).getValues().flat().filter(String) : [];
      const registeredUsersSet = new Set(registeredUsersData);
      const reportData = processMetricsData(userId, userData, registeredUsersSet);
      if (!reportData) {
        ui.alert('No Data', `No orders found for user ID: ${userId}`, ui.ButtonSet.OK);
        return;
      }
      const thresholdCheck = meetsThresholds(reportData);
      if (!thresholdCheck.eligible) {
        ui.alert('Not Eligible', `User ${userId} does not meet the minimum thresholds:\n${thresholdCheck.reasons.join('\n')}`, ui.ButtonSet.OK);
        return;
      }

      reportData.visibility = checkNonMustThresholds(reportData);
      reportData.showRegistrationButton = reportData.callToAction;

      // Add tier notification data
      try {
        const tierNotificationData = getTierNotificationData(userId);
        reportData.tierNotification = tierNotificationData;
        reportData.showTierNotification = tierNotificationData !== null;
      } catch (tierError) {
        console.warn(`Could not add tier notification for ${userId}:`, tierError.message);
        reportData.showTierNotification = false;
        reportData.tierNotification = null;
      }

      const result = saveReportToFile(reportData);
      ui.alert('Report Generated', result.message, ui.ButtonSet.OK);
    }
  }
}


function saveReportToFile(reportData, customDateRange = null) {
  try {
    const userId = reportData.contact.userId;
    const dateRange = customDateRange || { endDate: new Date() };
    const endDate = new Date(dateRange.endDate);
    const year = String(endDate.getFullYear());
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const reportsFolder = DriveApp.getFolderById(CONFIG.REPORTS_FOLDER_ID);
    let userFolder = null;
    const userFolderIterator = reportsFolder.getFoldersByName(userId);
    if (userFolderIterator.hasNext()) {
      userFolder = userFolderIterator.next();
    } else {
      userFolder = reportsFolder.createFolder(userId);
    }
    let analyticsFolder = null;
    const analyticsFolderIterator = userFolder.getFoldersByName('analytics-report');
    if (analyticsFolderIterator.hasNext()) {
      analyticsFolder = analyticsFolderIterator.next();
    } else {
      analyticsFolder = userFolder.createFolder('analytics-report');
    }
    let yearFolder = null;
    const yearFolderIterator = analyticsFolder.getFoldersByName(year);
    if (yearFolderIterator.hasNext()) {
      yearFolder = yearFolderIterator.next();
    } else {
      yearFolder = analyticsFolder.createFolder(year);
    }
    let monthFolder = null;
    const monthFolderIterator = yearFolder.getFoldersByName(month);
    if (monthFolderIterator.hasNext()) {
      monthFolder = monthFolderIterator.next();
    } else {
      monthFolder = yearFolder.createFolder(month);
    }
    const existingFiles = monthFolder.getFilesByName('report.html');
    if (existingFiles.hasNext()) {
      return { status: 'exists', message: `Report already exists for user ${userId} for ${year}-${month}.` };
    }
    const template = HtmlService.createTemplateFromFile('ReportTemplate.html');
    template.data = reportData;
    const htmlContent = template.evaluate().getContent();
    const newFile = monthFolder.createFile('report.html', htmlContent, MimeType.HTML);
    return { status: 'created', message: `Report successfully created for user ${userId} in ${year}/${month}.`, fileUrl: newFile.getUrl() };
  } catch (error) {
    console.error(`Error saving report to file for user ${reportData.contact.userId}:`, error.stack);
    return { status: 'error', message: `Failed to save report: ${error.message}` };
  }
}


function previewReportFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Preview Report', 'Enter Business Account Team ID:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    const userId = response.getResponseText().trim();
    if (userId) {
      const reportData = getReportDataWithTierNotification(userId);
      if (!reportData) {
        ui.alert('No Data', 'User not found or not eligible for report.', ui.ButtonSet.OK);
        return;
      }
      const template = HtmlService.createTemplateFromFile('ReportTemplate.html');
      template.data = reportData;
      const htmlOutput = template.evaluate().setWidth(1200).setHeight(800);
      ui.showModalDialog(htmlOutput, 'Report Preview');
    }
  }
}


// ===== DIAGNOSTIC FUNCTIONS =====

function checkDataImport() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', `Sheet '${CONFIG.SHEETS.USERS}' not found.`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  const rowCount = sheet.getLastRow();
  if (rowCount <= 1) {
    SpreadsheetApp.getUi().alert('No Data', `Sheet '${CONFIG.SHEETS.USERS}' is empty or contains only headers.`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  const message = `Data Import Check:\n- Sheet: ${CONFIG.SHEETS.USERS}\n- Rows (including header): ${rowCount}\n- Users: ${rowCount - 1}`;
  SpreadsheetApp.getUi().alert('Data Import Status', message, SpreadsheetApp.getUi().ButtonSet.OK);
  console.log(message);
}


function verifyThresholds() {
  const thresholdsInfo = `Current Thresholds:\n\nMUST (Eligibility):\n- Total Spend: $${CONFIG.THRESHOLDS.MUST.TOTAL_SPEND}\n- Orders: ${CONFIG.THRESHOLDS.MUST.ORDERS_MIN}\n\nNON-MUST (Visibility):\n- Sub-categories: ${CONFIG.THRESHOLDS.NON_MUST.SUB_CATEGORIES_MIN}\n- Sellers: ${CONFIG.THRESHOLDS.NON_MUST.SELLERS_MIN}\n- Team Members: ${CONFIG.THRESHOLDS.NON_MUST.TEAM_MEMBERS_MIN}\n- Avg Order Value: $${CONFIG.THRESHOLDS.NON_MUST.AVG_ORDER_VALUE_MIN}`;
  SpreadsheetApp.getUi().alert('Threshold Configuration', thresholdsInfo, SpreadsheetApp.getUi().ButtonSet.OK);
  console.log(thresholdsInfo);
}


function listEligibleUsers() {
  const userMap = getUsersMap();
  const userIds = Array.from(userMap.keys());
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const registeredUsersSheet = ss.getSheetByName(CONFIG.SHEETS.REGISTERED_USERS);
  const registeredUsersData = registeredUsersSheet && registeredUsersSheet.getLastRow() > 1 ? registeredUsersSheet.getRange('A2:A' + registeredUsersSheet.getLastRow()).getValues().flat().filter(String) : [];
  const registeredUsersSet = new Set(registeredUsersData);
  let eligibleCount = 0;
  let notEligibleCount = 0;
  const eligibleList = [];
  const notEligibleList = [];
  userIds.forEach(userId => {
    const userData = getMetricsDataForUser(userId);
    if (!userData || !userData.user) {
      notEligibleCount++;
      notEligibleList.push(`${userId} (No data)`);
      return;
    }
    const reportData = processMetricsData(userId, userData, registeredUsersSet);
    if (!reportData) {
      notEligibleCount++;
      notEligibleList.push(`${userId} (No orders)`);
      return;
    }
    const thresholdCheck = meetsThresholds(reportData);
    if (thresholdCheck.eligible) {
      eligibleCount++;
      eligibleList.push(`${userId} - ${reportData.contact.company}`);
    } else {
      notEligibleCount++;
      notEligibleList.push(`${userId} (${thresholdCheck.reasons.join(', ')})`);
    }
  });
  console.log('=== ELIGIBLE USERS LIST ===\n');
  console.log(`Total Eligible: ${eligibleCount}`);
  console.log(`Total Not Eligible: ${notEligibleCount}\n`);
  console.log('Eligible Users:');
  eligibleList.forEach((user, index) => console.log(`${index + 1}. ${user}`));
  console.log('\nNot Eligible Users (Sample):');
  notEligibleList.slice(0, 10).forEach((user, index) => console.log(`${index + 1}. ${user}`));
  SpreadsheetApp.getUi().alert('Eligibility Check Complete', `Eligible: ${eligibleCount}\nNot Eligible: ${notEligibleCount}\n\nCheck the execution log for details (View > Logs)`, SpreadsheetApp.getUi().ButtonSet.OK);
}


function debugAllUsersEligibility() {
  console.log('=== DEBUGGING ALL USERS ELIGIBILITY ===\n');
  const userMap = getUsersMap();
  const userIds = Array.from(userMap.keys()).slice(0, 5);
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const registeredUsersSheet = ss.getSheetByName(CONFIG.SHEETS.REGISTERED_USERS);
  const registeredUsersData = registeredUsersSheet && registeredUsersSheet.getLastRow() > 1 ? registeredUsersSheet.getRange('A2:A' + registeredUsersSheet.getLastRow()).getValues().flat().filter(String) : [];
  const registeredUsersSet = new Set(registeredUsersData);
  for (const userId of userIds) {
    const userData = getMetricsDataForUser(userId);
    console.log(`\nUser ID: ${userId}`);
    if (!userData || !userData.user) {
      console.log('  ❌ User not found in data');
      continue;
    }
    const reportData = processMetricsData(userId, userData, registeredUsersSet);
    if (!reportData) {
      console.log('  ❌ No orders or data processing failed');
      continue;
    }


    console.log(`  MUST metrics: Total Spend: $${reportData.mainKPIs.totalSpend}, Orders: ${reportData.mainKPIs.orders}`);
    const thresholdCheck = meetsThresholds(reportData);
    if (thresholdCheck.eligible) {
      console.log('  ✅ ELIGIBLE (meets MUST thresholds)');
      const visibility = checkNonMustThresholds(reportData);
      console.log(`  Visible sections: Sub-cat: ${visibility.showSubCategories}, Sellers: ${visibility.showSellers}, Team: ${visibility.showTeamMembers}, Avg Order: ${visibility.showAvgOrderValue}`);
    } else {
      console.log(`  ❌ NOT ELIGIBLE: ${thresholdCheck.reasons.join(', ')}`);
    }
  }
}


function testSpecificUserFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Test Specific User', 'Enter Business Account Team ID:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    const userId = response.getResponseText().trim();
    if (userId) {
      testSpecificUser(userId);
      ui.alert('Debug Complete', 'Check the execution log for details (View > Logs)', ui.ButtonSet.OK);
    }
  }
}


function testSpecificUser(testUserId) {
  console.log('=== DETAILED USER DEBUG ===\n');
  const userMap = getUsersMap();
  const user = userMap.get(testUserId);
  if (!user) { console.log('User not found!'); return; }
  console.log('User found:', JSON.stringify(user, null, 2));

  const { orders, dateRange } = getMetricsDataForUser(testUserId);
  console.log(`\nProcessed orders: ${orders ? orders.length : 0}`);
  console.log('Date range used for test:', dateRange);
  if (orders && orders.length > 0) {
    console.log('\nFirst order details:', JSON.stringify(orders[0], null, 2));

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const registeredUsersSheet = ss.getSheetByName(CONFIG.SHEETS.REGISTERED_USERS);
    const registeredUsersData = registeredUsersSheet && registeredUsersSheet.getLastRow() > 1 ? registeredUsersSheet.getRange('A2:A' + registeredUsersSheet.getLastRow()).getValues().flat().filter(String) : [];
    const registeredUsersSet = new Set(registeredUsersData);

    const reportData = processMetricsData(testUserId, { user, orders, isAdvanced: user.packageType === 'pro_advanced', dateRange }, registeredUsersSet);
    if (reportData) {
      console.log('\nReport data summary:');
      console.log('  - Report Period:', reportData.reportPeriod);
      console.log('  - Total spend:', reportData.mainKPIs.totalSpend);
      console.log('  - Total orders:', reportData.mainKPIs.orders);
      const thresholdCheck = meetsThresholds(reportData);
      console.log('\nEligibility (MUST thresholds):', thresholdCheck.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE');
      if (!thresholdCheck.eligible) console.log('Reasons:', thresholdCheck.reasons);
    }
  }
}


function debugUserEligibilityIssue() {
  const ui = SpreadsheetApp.getUi();
  const userIdResponse = ui.prompt(
    'Debug User Eligibility Issue',
    'Enter the User ID (Business Account Team ID):',
    ui.ButtonSet.OK_CANCEL
  );
  if (userIdResponse.getSelectedButton() !== ui.Button.OK) return;
  const userId = userIdResponse.getResponseText().trim();
  if (!userId) return;

  const dateResponse = ui.prompt(
    'Date Range',
    'Enter date range (YYYY-MM-DD,YYYY-MM-DD) or leave empty for defaults:',
    ui.ButtonSet.OK_CANCEL
  );
  if (dateResponse.getSelectedButton() !== ui.Button.OK) return;

  let customDateRange = null;
  const dateText = dateResponse.getResponseText().trim();

  if (dateText) {
    const dates = dateText.split(',').map(d => d.trim());
    if (dates.length === 2) {
      customDateRange = { startDate: dates[0], endDate: dates[1] };
    }
  }

  console.log('\n========================================');
  console.log('ELIGIBILITY ISSUE DIAGNOSTIC REPORT');
  console.log('========================================');
  console.log(`User ID: ${userId}`);
  console.log(`Date Range: ${customDateRange ? `${customDateRange.startDate} to ${customDateRange.endDate}` : 'Using defaults'}`);
  console.log('----------------------------------------\n');

  console.log('STEP 1: Checking user existence...');
  const userMap = getUsersMap();
  const user = userMap.get(userId);

  if (!user) {
    console.log('❌ ISSUE FOUND: User not found in user map');
    ui.alert('Issue Found', `User ${userId} not found in the user list. Check the User_List sheet.`, ui.ButtonSet.OK);
    return;
  }

  console.log('✓ User found in user map');
  console.log(`  Name: ${user.ownerName}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Tier: ${user.tier}`);
  console.log(`  Package: ${user.packageType}`);
  console.log('');

  console.log('STEP 2: Testing report generation path...');
  const reportData = getReportData(userId, customDateRange);

  if (!reportData) {
    console.log('❌ ISSUE FOUND: getReportData returned null');
  } else {
    console.log('✓ getReportData succeeded');
    console.log(`  Report Period: ${reportData.reportPeriod}`);
    console.log(`  Total Spend: $${reportData.mainKPIs.totalSpend}`);
    console.log(`  Total Orders: ${reportData.mainKPIs.orders}`);
  }

  ui.alert(
    'Diagnostic Complete',
    'Check the execution log (View > Logs or Ctrl+Enter) for detailed results.',
    ui.ButtonSet.OK
  );
}


function checkDateFiltering() {
  const now = new Date();
  const defaultStartDate = new Date(2025, 0, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  console.log('--- DATE FILTERING CHECK ---');
  console.log('Current date:', now.toISOString());
  console.log('\nDefault for Standard/Platinum/Diamond users:');
  console.log(`  Start Date: ${defaultStartDate.toISOString()} (January 1, 2025)`);
  console.log(`  End Date:   ${now.toISOString()} (inclusive)`);
  console.log('\nDefault for Advanced users:');
  console.log(`  Start Date: ${prevMonthStart.toISOString()} (Previous Month Start)`);
  console.log(`  End Date:   ${thisMonthStart.toISOString()} (Current Month Start - Exclusive)`);
  SpreadsheetApp.getUi().alert('Date Check Complete', 'Check the execution log for details (View > Logs)', SpreadsheetApp.getUi().ButtonSet.OK);
}


function testDriveAccess() {
  const FOLDER_ID = CONFIG.REPORTS_FOLDER_ID;
  console.log('--- Starting Drive Access Test ---');
  try {
    console.log(`Attempting to access folder ID: ${FOLDER_ID}`);
    const parentFolder = DriveApp.getFolderById(FOLDER_ID);
    const fileName = `test-file-${new Date().getTime()}.txt`;
    console.log(`Folder found: "${parentFolder.getName()}". Attempting to create a test file...`);
    const testFile = parentFolder.createFile(fileName, 'This is a temporary test file.');
    console.log(`Successfully created test file: "${testFile.getName()}"`);
    testFile.setTrashed(true);
    console.log("Successfully deleted the test file.");
    console.log('✅ Success! The script appears to have the correct "Editor" access to the reports folder.');
    SpreadsheetApp.getUi().alert('✅ Drive Access Test Succeeded!',
      'The script was able to create and delete a file in the reports folder.',
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    console.error(`❌ DRIVE ACCESS TEST FAILED: ${e.toString()}`);
    SpreadsheetApp.getUi().alert('❌ Drive Access Test Failed',
      `The script could not access the folder. Please check the logs for the error message and verify folder permissions.`,
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
  console.log('--- Finished Drive Access Test ---');
}


function testTierNotificationSystem() {
  const testUserId = 'YOUR_TEST_USER_ID';

  console.log('=== TIER NOTIFICATION TEST ===');
  if (testUserId === 'YOUR_TEST_USER_ID') {
    console.error("Please replace 'YOUR_TEST_USER_ID' in the testTierNotificationSystem function with a real ID.");
    SpreadsheetApp.getUi().alert("Test Failed", "Please replace 'YOUR_TEST_USER_ID' in the testTierNotificationSystem function with a real ID before running.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  console.log(`Testing user: ${testUserId}\n`);

  const tierStatus = getUserTierStatus(testUserId);
  console.log('Tier Status:', JSON.stringify(tierStatus, null, 2));

  const shouldShow = shouldShowTierNotification(testUserId);
  console.log(`\nShould show notification: ${shouldShow}`);

  const tier = tierStatus.currentTier.toLowerCase();
  const thresholds = TIER_NOTIFICATION_CONFIG.THRESHOLDS;
  const tierThreshold = thresholds[tier] || thresholds.platinum;
  const remaining = tierThreshold - tierStatus.annualSpend;

  console.log('\nThreshold Analysis:');
  console.log(`- Current Tier: ${tierStatus.currentTier}`);
  console.log(`- Tier Threshold: $${tierThreshold.toLocaleString()}`);
  console.log(`- Annual Spend: $${tierStatus.annualSpend.toLocaleString()}`);
  console.log(`- Remaining to threshold: $${Math.max(remaining, 0).toLocaleString()}`);
  console.log(`- Progress: ${Math.round((tierStatus.annualSpend / tierThreshold) * 100)}%`);
  console.log(`- Top Spending Category: ${tierStatus.topCategory}`);

  SpreadsheetApp.getUi().alert('Tier Test Complete', 'Check the execution log (View > Logs) for details.', SpreadsheetApp.getUi().ButtonSet.OK);
}


function checkAllUsersTierNotifications() {
  const userMap = getUsersMap();
  const userIds = Array.from(userMap.keys());

  const summary = {
    totalUsers: userIds.length,
    usersNeedingNotification: 0,
    byTier: {
      platinum: { count: 0, users: [] },
      diamond: { count: 0, users: [] }
    }
  };

  userIds.forEach(userId => {
    if (shouldShowTierNotification(userId)) {
      summary.usersNeedingNotification++;

      const user = userMap.get(userId);
      if (user) {
        const tier = user.tier.toLowerCase();
        if (summary.byTier[tier]) {
          summary.byTier[tier].count++;
          summary.byTier[tier].users.push({
            userId: userId,
            name: user.ownerName,
            email: user.email
          });
        }
      }
    }
  });

  console.log('=== TIER NOTIFICATION SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));

  return summary;
}


// ===== S3 SYNC FUNCTIONS =====

function setupS3SyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailyS3Sync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('dailyS3Sync')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();

  console.log('✓ S3 sync trigger created - will run daily at 2 AM');
}

function dailyS3Sync() {
  syncRecentReportsToS3(1);
}

function manualS3Sync() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Manual S3 Sync',
    'How many days back do you want to sync? (e.g., 7 for last week)',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const days = parseInt(response.getResponseText());
    if (isNaN(days) || days < 1) {
      ui.alert('Error', 'Please enter a valid number of days', ui.ButtonSet.OK);
      return;
    }

    ui.alert('Sync Started', `Syncing reports from last ${days} days. Check logs for progress.`, ui.ButtonSet.OK);
    const result = syncRecentReportsToS3(days);
    ui.alert('Sync Complete', `Synced: ${result.synced}\nFailed: ${result.failed}\nSkipped: ${result.skipped}`, ui.ButtonSet.OK);
  }
}


// ===== TIER ICON FUNCTION =====

function getTierIconHtml(tier) {
  const lowerCaseTier = tier.toLowerCase();
  if (lowerCaseTier === 'diamond') {
    return `<svg width="56" height="28" viewBox="0 0 56 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M41.8052 1.2002C48.8743 1.20027 54.605 6.93081 54.605 14C54.605 21.0692 48.8743 26.7997 41.8052 26.7998C34.736 26.7998 29.0054 21.0692 29.0054 14C29.0054 6.93076 34.736 1.2002 41.8052 1.2002Z" fill="url(#paint0_linear_3798_8466)" stroke="white" stroke-width="1.6"/><path d="M27.8057 1.2002C34.8748 1.20027 40.6055 6.93081 40.6055 14C40.6055 21.0692 34.8748 26.7997 27.8057 26.7998C20.7365 26.7998 15.0059 21.0692 15.0059 14C15.0059 6.93076 20.7365 1.2002 27.8057 1.2002Z" fill="url(#paint1_linear_3798_8466)" stroke="white" stroke-width="1.6"/><path d="M13.9023 1.29688C20.9179 1.29688 26.6055 6.98435 26.6055 14C26.6053 21.0155 20.9178 26.7021 13.9023 26.7021C6.8871 26.7019 1.20039 21.0153 1.2002 14C1.2002 6.98451 6.88698 1.29714 13.9023 1.29688Z" fill="url(#paint2_linear_3798_8466)" stroke="white" stroke-width="1.6"/><defs><linearGradient id="paint0_linear_3798_8466" x1="41.708" y1="5.96766" x2="41.805" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="#5E83BC"/><stop offset="1" stop-color="#B2CDFA"/></linearGradient><linearGradient id="paint1_linear_3798_8466" x1="35.1478" y1="26.7978" x2="28.7841" y2="3.75761" gradientUnits="userSpaceOnUse"><stop stop-color="#678DC9"/><stop offset="1" stop-color="#364F81"/></linearGradient><linearGradient id="paint2_linear_3798_8466" x1="13.9028" y1="2.09668" x2="13.9028" y2="25.9026" gradientUnits="userSpaceOnUse"><stop stop-color="#1F3056"/><stop offset="1" stop-color="#426194"/></linearGradient></defs></svg>`;
  } else if (lowerCaseTier === 'platinum') {
    return `<svg width="56" height="28" viewBox="0 0 56 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M41.8052 1.2002C48.8743 1.20027 54.605 6.93081 54.605 14C54.605 21.0692 48.8743 26.7997 41.8052 26.7998C34.736 26.7998 29.0054 21.0692 29.0054 14C29.0054 6.93076 34.736 1.2002 41.8052 1.2002Z" fill="url(#paint0_linear_3798_8441)" stroke="white" stroke-width="1.6"/><path d="M27.8057 1.2002C34.8748 1.20027 40.6055 6.93081 40.6055 14C40.6055 21.0692 34.8748 26.7997 27.8057 26.7998C20.7365 26.7998 15.0059 21.0692 15.0059 14C15.0059 6.93076 20.7365 1.2002 27.8057 1.2002Z" fill="url(#paint1_linear_3798_8441)" stroke="white" stroke-width="1.6"/><path d="M13.9023 1.29688C20.9179 1.29688 26.6055 6.98435 26.6055 14C26.6053 21.0155 20.9178 26.7021 13.9023 26.7021C6.8871 26.7019 1.20039 21.0153 1.2002 14C1.2002 6.98451 6.88698 1.29714 13.9023 1.29688Z" fill="url(#paint2_linear_3798_8441)" stroke="white" stroke="white" stroke-width="1.6"/><defs><linearGradient id="paint0_linear_3798_8441" x1="41.708" y1="5.96766" x2="41.805" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="#8CACDF"/><stop offset="1" stop-color="#D1E2FE"/></linearGradient><linearGradient id="paint1_linear_3798_8441" x1="35.1478" y1="26.7978" x2="28.7841" y2="3.75761" gradientUnits="userSpaceOnUse"><stop stop-color="#B7CFF3"/><stop offset="1" stop-color="#638FD5"/></linearGradient><linearGradient id="paint2_linear_3798_8441" x1="13.9028" y1="2.09668" x2="13.9028" y2="25.9026" gradientUnits="userSpaceOnUse"><stop stop-color="#4972B0"/><stop offset="1" stop-color="#79A3E2"/></linearGradient></defs></svg>`;
  }
  return '';
}


// ===== BATCH PROCESSING CONFIGURATION =====

const BATCH_CONFIG = {
  MAX_EXECUTION_TIME: 5 * 60 * 1000,
  CHECK_INTERVAL: 10,
  USERS_PER_BATCH: 500,
  AUTO_RETRY_DELAY_MINUTES: 2,  // Time to wait before auto-retry on failure
  MAX_RETRY_ATTEMPTS: 3          // Maximum number of consecutive retry attempts
};

function getBatchProgress() {
  const props = PropertiesService.getScriptProperties();
  const progress = props.getProperty('BATCH_GENERATION_PROGRESS');
  return progress ? JSON.parse(progress) : null;
}

function saveBatchProgress(position, total, timestamp, additionalData = {}) {
  const props = PropertiesService.getScriptProperties();
  const progressData = {
    position: position,
    total: total,
    timestamp: timestamp,
    date: new Date(timestamp).toISOString(),
    ...additionalData
  };
  props.setProperty('BATCH_GENERATION_PROGRESS', JSON.stringify(progressData));
  console.log(`[saveBatchProgress] Saved progress: position ${position}/${total}`);
}

function clearBatchProgress() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('BATCH_GENERATION_PROGRESS');
  props.deleteProperty('BATCH_RETRY_COUNT');
  console.log('[clearBatchProgress] Batch progress cleared');
}

/**
 * Gets the current retry count for the batch
 */
function getBatchRetryCount() {
  const props = PropertiesService.getScriptProperties();
  const count = props.getProperty('BATCH_RETRY_COUNT');
  return count ? parseInt(count) : 0;
}

/**
 * Increments the retry count
 */
function incrementBatchRetryCount() {
  const props = PropertiesService.getScriptProperties();
  const count = getBatchRetryCount() + 1;
  props.setProperty('BATCH_RETRY_COUNT', count.toString());
  return count;
}

/**
 * Resets the retry count (called on successful progress)
 */
function resetBatchRetryCount() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('BATCH_RETRY_COUNT');
}

/**
 * Schedules an automatic retry after a failure
 * Creates a one-time trigger to resume batch generation
 */
function scheduleAutoRetry() {
  try {
    // Remove any existing retry triggers first
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'autoRetryBatchGeneration') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create a new trigger to run after the delay
    ScriptApp.newTrigger('autoRetryBatchGeneration')
      .timeBased()
      .after(BATCH_CONFIG.AUTO_RETRY_DELAY_MINUTES * 60 * 1000)
      .create();

    console.log(`[scheduleAutoRetry] Auto-retry scheduled in ${BATCH_CONFIG.AUTO_RETRY_DELAY_MINUTES} minutes`);
    return true;
  } catch (error) {
    console.error('[scheduleAutoRetry] Failed to schedule auto-retry:', error);
    return false;
  }
}

/**
 * Handler for automatic retry after failure
 * This is triggered by the one-time trigger created in scheduleAutoRetry
 */
function autoRetryBatchGeneration() {
  console.log('\n========================================');
  console.log('AUTO-RETRY BATCH GENERATION STARTED');
  console.log('========================================\n');

  const progress = getBatchProgress();

  if (!progress) {
    console.log('No batch progress found - nothing to retry');
    return;
  }

  const retryCount = getBatchRetryCount();
  console.log(`Retry attempt: ${retryCount + 1}/${BATCH_CONFIG.MAX_RETRY_ATTEMPTS}`);

  if (retryCount >= BATCH_CONFIG.MAX_RETRY_ATTEMPTS) {
    console.log('Maximum retry attempts reached - stopping auto-retry');

    // Send failure notification
    sendBatchNotificationEmail('failure', {
      error: `Maximum retry attempts (${BATCH_CONFIG.MAX_RETRY_ATTEMPTS}) reached. Manual intervention required.`,
      position: progress.position,
      total: progress.total,
      percentComplete: ((progress.position / progress.total) * 100).toFixed(1),
      success: progress.successCount || 0,
      alreadyExists: progress.alreadyExistsCount || 0,
      notEligible: progress.notEligibleCount || 0,
      failed: progress.failedCount || 0
    });

    return;
  }

  // Increment retry count before attempting
  incrementBatchRetryCount();

  // Send resumed notification
  const timeSinceLastRun = Date.now() - progress.timestamp;
  const minutesSinceLastRun = (timeSinceLastRun / (1000 * 60)).toFixed(1);

  sendBatchNotificationEmail('resumed', {
    position: progress.position,
    total: progress.total,
    percentComplete: ((progress.position / progress.total) * 100).toFixed(1),
    lastRunDate: progress.date,
    timeSinceLastRun: minutesSinceLastRun
  });

  // Run the batch generation
  try {
    const result = generateAllReportsOptimized();

    if (result.status === 'complete') {
      console.log('Batch completed successfully after retry!');
      // Reset retry count on success
      resetBatchRetryCount();
    }
  } catch (error) {
    console.error('Auto-retry failed:', error);
    // The generateAllReportsOptimized function will handle saving progress and scheduling another retry
  }
}


function generateAllReportsOptimized(customDateRange = null) {
  const startTime = Date.now();

  console.log('========================================');
  console.log('OPTIMIZED REPORT GENERATION STARTED');
  console.log('========================================');
  console.log(`Start time: ${new Date(startTime).toISOString()}`);
  console.log(`Environment: ${AWS_CONFIG.ENVIRONMENT}`);
  console.log(`Custom date range: ${customDateRange ? JSON.stringify(customDateRange) : 'None (using defaults)'}`);

  let userMap, allUserIds, totalUsers;

  try {
    userMap = getUsersMap();
    allUserIds = Array.from(userMap.keys());
    totalUsers = allUserIds.length;
  } catch (error) {
    console.error('Failed to load user map:', error);
    sendBatchNotificationEmail('failure', {
      error: `Failed to load user data: ${error.message}`,
      position: 0,
      total: 0,
      percentComplete: 0
    });
    scheduleAutoRetry();
    throw error;
  }

  console.log(`Total users to process: ${totalUsers}`);

  const progress = getBatchProgress();
  let startPosition = 0;

  // Track cumulative stats across batches
  let cumulativeStats = {
    successCount: 0,
    alreadyExistsCount: 0,
    failedCount: 0,
    notEligibleCount: 0,
    s3SuccessCount: 0,
    s3FailedCount: 0
  };

  if (progress) {
    const timeSinceLastRun = Date.now() - progress.timestamp;
    const hoursSinceLastRun = timeSinceLastRun / (1000 * 60 * 60);

    if (hoursSinceLastRun < 24) {
      startPosition = progress.position;
      console.log(`\n✓ RESUMING from position ${startPosition}/${totalUsers} (${((startPosition / totalUsers) * 100).toFixed(1)}% complete)`);
      console.log(`Last run: ${progress.date}`);
      console.log(`Time since last run: ${(timeSinceLastRun / (1000 * 60)).toFixed(1)} minutes`);

      // Restore cumulative stats if available
      if (progress.cumulativeStats) {
        cumulativeStats = progress.cumulativeStats;
        console.log(`Restored cumulative stats from previous run`);
      }
    } else {
      console.log(`\nPrevious run too old (${hoursSinceLastRun.toFixed(1)} hours), starting fresh`);
      clearBatchProgress();
    }
  }

  let ss, registeredUsersSet;

  try {
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const registeredUsersSheet = ss.getSheetByName(CONFIG.SHEETS.REGISTERED_USERS);
    const registeredUsersData = registeredUsersSheet && registeredUsersSheet.getLastRow() > 1 ?
      registeredUsersSheet.getRange('A2:A' + registeredUsersSheet.getLastRow()).getValues().flat().filter(String) : [];
    registeredUsersSet = new Set(registeredUsersData);
  } catch (error) {
    console.error('Failed to load spreadsheet data:', error);

    // Save progress before failing
    saveBatchProgress(startPosition, totalUsers, Date.now(), {
      error: error.message,
      cumulativeStats: cumulativeStats
    });

    sendBatchNotificationEmail('failure', {
      error: `Failed to load spreadsheet data: ${error.message}`,
      position: startPosition,
      total: totalUsers,
      percentComplete: ((startPosition / totalUsers) * 100).toFixed(1),
      ...cumulativeStats
    });

    scheduleAutoRetry();
    throw error;
  }

  let processed = 0;
  let successCount = 0;
  let failedCount = 0;
  let notEligibleCount = 0;
  let alreadyExistsCount = 0;
  let s3SuccessCount = 0;
  let s3FailedCount = 0;
  let lastSuccessfulPosition = startPosition;

  console.log(`\nProcessing users ${startPosition + 1} to ${totalUsers}...`);
  console.log('----------------------------------------\n');

  try {
    for (let i = startPosition; i < totalUsers; i++) {
      // Check execution time
      if (processed > 0 && processed % BATCH_CONFIG.CHECK_INTERVAL === 0) {
        const elapsed = Date.now() - startTime;
        const remainingTime = BATCH_CONFIG.MAX_EXECUTION_TIME - elapsed;

        console.log(`\nProgress check: ${processed} users processed, ${(elapsed / 1000).toFixed(1)}s elapsed, ${(remainingTime / 1000).toFixed(1)}s remaining`);

        if (remainingTime < 60000) {
          console.log('\n⚠️  Approaching time limit, saving progress...');

          // Update cumulative stats
          cumulativeStats.successCount += successCount;
          cumulativeStats.alreadyExistsCount += alreadyExistsCount;
          cumulativeStats.failedCount += failedCount;
          cumulativeStats.notEligibleCount += notEligibleCount;
          cumulativeStats.s3SuccessCount += s3SuccessCount;
          cumulativeStats.s3FailedCount += s3FailedCount;

          saveBatchProgress(i, totalUsers, Date.now(), {
            cumulativeStats: cumulativeStats
          });

          // Reset retry count since this is a normal timeout, not a failure
          resetBatchRetryCount();

          // Send timeout notification
          sendBatchNotificationEmail('timeout', {
            processed: processed,
            position: i,
            total: totalUsers,
            percentComplete: ((i / totalUsers) * 100).toFixed(1),
            success: successCount,
            alreadyExists: alreadyExistsCount,
            notEligible: notEligibleCount,
            failed: failedCount
          });

          console.log('\n========================================');
          console.log('BATCH COMPLETED - WILL RESUME NEXT RUN');
          console.log('========================================');
          console.log(`Processed: ${processed} users in this batch`);
          console.log(`Position: ${i}/${totalUsers} (${((i / totalUsers) * 100).toFixed(1)}% complete)`);

          return {
            status: 'batch_complete',
            processed: processed,
            position: i,
            total: totalUsers,
            percentComplete: ((i / totalUsers) * 100).toFixed(1),
            success: successCount,
            alreadyExists: alreadyExistsCount,
            failed: failedCount,
            notEligible: notEligibleCount,
            s3Success: s3SuccessCount,
            s3Failed: s3FailedCount,
            message: `Batch complete: ${processed} users processed. ${totalUsers - i} remaining. Run again to continue.`
          };
        }
      }

      const userId = allUserIds[i];
      processed++;

      if (processed % 100 === 0) {
        console.log(`Progress: ${i + 1}/${totalUsers} (${((i / totalUsers) * 100).toFixed(1)}%) - Success: ${successCount}, Exists: ${alreadyExistsCount}, Not eligible: ${notEligibleCount}`);

        // Save progress periodically (every 100 users) in case of unexpected failure
        cumulativeStats.successCount += successCount;
        cumulativeStats.alreadyExistsCount += alreadyExistsCount;
        cumulativeStats.failedCount += failedCount;
        cumulativeStats.notEligibleCount += notEligibleCount;
        cumulativeStats.s3SuccessCount += s3SuccessCount;
        cumulativeStats.s3FailedCount += s3FailedCount;

        saveBatchProgress(i, totalUsers, Date.now(), {
          cumulativeStats: cumulativeStats
        });

        // Reset counters for this batch segment
        successCount = 0;
        alreadyExistsCount = 0;
        failedCount = 0;
        notEligibleCount = 0;
        s3SuccessCount = 0;
        s3FailedCount = 0;

        lastSuccessfulPosition = i;
      }

      try {
        const userData = getMetricsDataForUser(userId, null, customDateRange);
        if (!userData || !userData.user) {
          notEligibleCount++;
          continue;
        }

        const reportData = processMetricsData(userId, userData, registeredUsersSet, customDateRange);
        if (!reportData) {
          notEligibleCount++;
          continue;
        }

        const thresholdCheck = meetsThresholds(reportData);
        if (!thresholdCheck.eligible) {
          notEligibleCount++;
          continue;
        }

        reportData.visibility = checkNonMustThresholds(reportData);
        reportData.showRegistrationButton = reportData.callToAction;

        try {
          const tierNotificationData = getTierNotificationData(userId);
          reportData.tierNotification = tierNotificationData;
          reportData.showTierNotification = tierNotificationData !== null;
        } catch (tierError) {
          console.warn(`Could not add tier notification for ${userId}:`, tierError.message);
          reportData.showTierNotification = false;
          reportData.tierNotification = null;
        }

        const result = saveReportToFile(reportData, customDateRange);

        if (result.status === 'created') {
          successCount++;

          try {
            const dateRange = customDateRange || { endDate: new Date() };
            const endDate = new Date(dateRange.endDate);
            const year = String(endDate.getFullYear());
            const month = String(endDate.getMonth() + 1).padStart(2, '0');

            if (typeof syncReportToS3 === 'function') {
              const s3Result = syncReportToS3(userId, year, month);
              if (s3Result && s3Result.success) {
                s3SuccessCount++;
              } else {
                s3FailedCount++;
              }
            }
          } catch (s3Error) {
            s3FailedCount++;
            console.error(`S3 upload error for ${userId}:`, s3Error.message);
          }

        } else if (result.status === 'exists') {
          alreadyExistsCount++;
        } else {
          failedCount++;
        }

      } catch (error) {
        failedCount++;
        console.error(`Error processing user ${userId}:`, error.message);
      }
    }
  } catch (error) {
    // Unexpected error during processing
    console.error('\n❌ UNEXPECTED ERROR during batch processing:', error);

    // Update cumulative stats before saving
    cumulativeStats.successCount += successCount;
    cumulativeStats.alreadyExistsCount += alreadyExistsCount;
    cumulativeStats.failedCount += failedCount;
    cumulativeStats.notEligibleCount += notEligibleCount;
    cumulativeStats.s3SuccessCount += s3SuccessCount;
    cumulativeStats.s3FailedCount += s3FailedCount;

    // Save progress at last successful position
    const savePosition = lastSuccessfulPosition > startPosition ? lastSuccessfulPosition : startPosition;
    saveBatchProgress(savePosition, totalUsers, Date.now(), {
      error: error.message,
      cumulativeStats: cumulativeStats
    });

    // Send failure notification
    sendBatchNotificationEmail('failure', {
      error: error.message,
      position: savePosition,
      total: totalUsers,
      percentComplete: ((savePosition / totalUsers) * 100).toFixed(1),
      success: cumulativeStats.successCount,
      alreadyExists: cumulativeStats.alreadyExistsCount,
      notEligible: cumulativeStats.notEligibleCount,
      failed: cumulativeStats.failedCount
    });

    // Schedule auto-retry
    scheduleAutoRetry();

    throw error;
  }

  // Successfully completed all users
  // Add final batch stats to cumulative
  cumulativeStats.successCount += successCount;
  cumulativeStats.alreadyExistsCount += alreadyExistsCount;
  cumulativeStats.failedCount += failedCount;
  cumulativeStats.notEligibleCount += notEligibleCount;
  cumulativeStats.s3SuccessCount += s3SuccessCount;
  cumulativeStats.s3FailedCount += s3FailedCount;

  clearBatchProgress();

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n========================================');
  console.log('REPORT GENERATION COMPLETE!');
  console.log('========================================');
  console.log(`Total time: ${totalTime.toFixed(1)} seconds`);
  console.log(`Total users processed: ${processed}`);
  console.log(`\nResults (cumulative across all batches):`);
  console.log(`  ✓ New reports generated: ${cumulativeStats.successCount}`);
  console.log(`  ⊘ Reports already exist: ${cumulativeStats.alreadyExistsCount}`);
  console.log(`  ✗ Generation failed: ${cumulativeStats.failedCount}`);
  console.log(`  ⊘ Not eligible: ${cumulativeStats.notEligibleCount}`);
  console.log(`\nS3 Uploads:`);
  console.log(`  ✓ Successful: ${cumulativeStats.s3SuccessCount}`);
  console.log(`  ✗ Failed: ${cumulativeStats.s3FailedCount}`);
  console.log('========================================\n');

  // Send success notification
  sendBatchNotificationEmail('success', {
    processed: totalUsers,
    success: cumulativeStats.successCount,
    alreadyExists: cumulativeStats.alreadyExistsCount,
    failed: cumulativeStats.failedCount,
    notEligible: cumulativeStats.notEligibleCount,
    s3Success: cumulativeStats.s3SuccessCount,
    s3Failed: cumulativeStats.s3FailedCount,
    totalTime: totalTime
  });

  return {
    status: 'complete',
    processed: totalUsers,
    success: cumulativeStats.successCount,
    alreadyExists: cumulativeStats.alreadyExistsCount,
    failed: cumulativeStats.failedCount,
    notEligible: cumulativeStats.notEligibleCount,
    s3Success: cumulativeStats.s3SuccessCount,
    s3Failed: cumulativeStats.s3FailedCount,
    totalTime: totalTime,
    message: `Complete! Generated ${cumulativeStats.successCount} new reports, ${cumulativeStats.alreadyExistsCount} already existed. ${cumulativeStats.notEligibleCount} not eligible, ${cumulativeStats.failedCount} failed. S3: ${cumulativeStats.s3SuccessCount}/${cumulativeStats.s3SuccessCount + cumulativeStats.s3FailedCount} uploaded.`
  };
}


function setupBatchGenerationTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'continueBatchGeneration') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('continueBatchGeneration')
    .timeBased()
    .everyMinutes(10)
    .create();

  console.log('✓ Batch generation trigger created - will run every 10 minutes');
}


function continueBatchGeneration() {
  const progress = getBatchProgress();

  if (!progress) {
    console.log('No batch in progress - nothing to continue');
    return;
  }

  const timeSinceLastRun = Date.now() - progress.timestamp;
  const minutesSinceLastRun = timeSinceLastRun / (1000 * 60);

  console.log(`\n=== AUTOMATIC BATCH CONTINUATION ===`);
  console.log(`Last run: ${progress.date}`);
  console.log(`Time since last run: ${minutesSinceLastRun.toFixed(1)} minutes`);
  console.log(`Progress: ${progress.position}/${progress.total} (${((progress.position / progress.total) * 100).toFixed(1)}%)`);

  // Send resumed notification
  sendBatchNotificationEmail('resumed', {
    position: progress.position,
    total: progress.total,
    percentComplete: ((progress.position / progress.total) * 100).toFixed(1),
    lastRunDate: progress.date,
    timeSinceLastRun: minutesSinceLastRun.toFixed(1)
  });

  try {
    const result = generateAllReportsOptimized();

    if (result.status === 'complete') {
      console.log('\n🎉 ALL REPORTS COMPLETE!');
      // Reset retry count on successful completion
      resetBatchRetryCount();
    }
  } catch (error) {
    console.error('Error in continueBatchGeneration:', error);
    // Error handling and auto-retry is done within generateAllReportsOptimized
  }
}


function removeBatchGenerationTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;

  triggers.forEach(trigger => {
    const handlerFunction = trigger.getHandlerFunction();
    if (handlerFunction === 'continueBatchGeneration' || handlerFunction === 'autoRetryBatchGeneration') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  if (removed > 0) {
    console.log(`✓ Removed ${removed} batch generation trigger(s)`);
  } else {
    console.log('No batch generation triggers found');
  }

  clearBatchProgress();
  console.log('✓ Cleared batch progress');
}


function checkBatchStatus() {
  const progress = getBatchProgress();

  console.log('\n=== BATCH GENERATION STATUS ===');

  if (!progress) {
    console.log('Status: No batch in progress');
    console.log('\nTo start generation, run: generateAllReportsOptimized()');
    return null;
  }

  const timeSinceLastRun = Date.now() - progress.timestamp;
  const minutesSinceLastRun = timeSinceLastRun / (1000 * 60);
  const percentComplete = ((progress.position / progress.total) * 100).toFixed(1);
  const retryCount = getBatchRetryCount();

  console.log(`Status: Batch in progress`);
  console.log(`Position: ${progress.position}/${progress.total} users`);
  console.log(`Progress: ${percentComplete}% complete`);
  console.log(`Remaining: ${progress.total - progress.position} users`);
  console.log(`Last run: ${progress.date}`);
  console.log(`Time since last run: ${minutesSinceLastRun.toFixed(1)} minutes`);
  console.log(`Retry count: ${retryCount}/${BATCH_CONFIG.MAX_RETRY_ATTEMPTS}`);

  if (progress.cumulativeStats) {
    console.log('\nCumulative stats:');
    console.log(`  Success: ${progress.cumulativeStats.successCount}`);
    console.log(`  Already exists: ${progress.cumulativeStats.alreadyExistsCount}`);
    console.log(`  Not eligible: ${progress.cumulativeStats.notEligibleCount}`);
    console.log(`  Failed: ${progress.cumulativeStats.failedCount}`);
  }

  if (progress.error) {
    console.log(`\nLast error: ${progress.error}`);
  }

  return progress;
}


function generateReportsForAllUsers(customDateRange = null) {
  return generateAllReportsOptimized(customDateRange);
}


function generateReportsForUsers(userIds, customDateRange = null) {
  const userMap = getUsersMap();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const registeredUsersSheet = ss.getSheetByName(CONFIG.SHEETS.REGISTERED_USERS);
  const registeredUsersData = registeredUsersSheet && registeredUsersSheet.getLastRow() > 1 ?
    registeredUsersSheet.getRange('A2:A' + registeredUsersSheet.getLastRow()).getValues().flat().filter(String) : [];
  const registeredUsersSet = new Set(registeredUsersData);

  let successCount = 0;
  let failedCount = 0;
  let notEligibleCount = 0;
  let s3SuccessCount = 0;
  let s3FailedCount = 0;

  userIds.forEach(userId => {
    const userData = getMetricsDataForUser(userId, null, customDateRange);
    if (!userData || !userData.user) {
      notEligibleCount++;
      return;
    }

    const reportData = processMetricsData(userId, userData, registeredUsersSet, customDateRange);
    if (!reportData) {
      notEligibleCount++;
      return;
    }

    const thresholdCheck = meetsThresholds(reportData);
    if (!thresholdCheck.eligible) {
      notEligibleCount++;
      return;
    }

    reportData.visibility = checkNonMustThresholds(reportData);
    reportData.showRegistrationButton = reportData.callToAction;

    try {
      const tierNotificationData = getTierNotificationData(userId);
      reportData.tierNotification = tierNotificationData;
      reportData.showTierNotification = tierNotificationData !== null;
    } catch (tierError) {
      console.warn(`Could not add tier notification for ${userId}:`, tierError.message);
      reportData.showTierNotification = false;
      reportData.tierNotification = null;
    }

    const result = saveReportToFile(reportData, customDateRange);
    if (result.status === 'created' || result.status === 'exists') {
      successCount++;

      try {
        const dateRange = customDateRange || { endDate: new Date() };
        const endDate = new Date(dateRange.endDate);
        const year = String(endDate.getFullYear());
        const month = String(endDate.getMonth() + 1).padStart(2, '0');

        if (typeof syncReportToS3 === 'function') {
          const s3Result = syncReportToS3(userId, year, month);
          if (s3Result && s3Result.success) {
            s3SuccessCount++;
          } else {
            s3FailedCount++;
          }
        }
      } catch (s3Error) {
        s3FailedCount++;
      }

    } else {
      failedCount++;
    }
  });

  return {
    success: successCount,
    failed: failedCount,
    notEligible: notEligibleCount,
    s3Success: s3SuccessCount,
    s3Failed: s3FailedCount
  };
}