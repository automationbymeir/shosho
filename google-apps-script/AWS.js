// ===== AWS S3 UPLOAD FUNCTIONS =====

/**
 * Gets AWS credentials from Script Properties based on environment
 */
function getAWSCredentials() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const env = AWS_CONFIG.ENVIRONMENT.toUpperCase();
  
  const accessKeyId = scriptProperties.getProperty(`AWS_ACCESS_KEY_ID_${env}`);
  const secretAccessKey = scriptProperties.getProperty(`AWS_SECRET_ACCESS_KEY_${env}`);
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(`AWS credentials not configured for ${env} environment. Please check Script Properties.`);
  }
  
  return {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  };
}

// ===== AWS Signature V4 Helper Functions =====

function sha256Hex(data) {
  const bytes = typeof data === 'string' ? Utilities.newBlob(data).getBytes() : data;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2))
    .join('');
}

/**
 * HMAC-SHA256 for AWS Signature V4
 * Uses computeHmacSignature with proper byte handling for both message and key
 */
function hmacSha256ForAWS(message, key) {
  // Convert message to bytes
  const messageBytes = Utilities.newBlob(message).getBytes();
  
  if (typeof key === 'string') {
    // String key - convert to bytes
    const keyBytes = Utilities.newBlob(key).getBytes();
    return Utilities.computeHmacSignature(
      Utilities.MacAlgorithm.HMAC_SHA_256,
      messageBytes,
      keyBytes
    );
  } else {
    // Byte array key - recreate as proper byte array through Blob
    const keyBlob = Utilities.newBlob(key);
    const keyBytes = keyBlob.getBytes();
    return Utilities.computeHmacSignature(
      Utilities.MacAlgorithm.HMAC_SHA_256,
      messageBytes,
      keyBytes
    );
  }
}

function calculateSignature(secretAccessKey, date, region, service, stringToSign) {
  // AWS Signature V4: Derive signing key through chained HMAC operations
  
  try {
    // Step 1: kDate = HMAC-SHA256("AWS4" + secret, date)
    const kDate = hmacSha256ForAWS(date, 'AWS4' + secretAccessKey);
    
    // Step 2: kRegion = HMAC-SHA256(kDate, region)
    const kRegion = hmacSha256ForAWS(region, kDate);
    
    // Step 3: kService = HMAC-SHA256(kRegion, service)
    const kService = hmacSha256ForAWS(service, kRegion);
    
    // Step 4: kSigning = HMAC-SHA256(kService, "aws4_request")
    const kSigning = hmacSha256ForAWS('aws4_request', kService);
    
    // Step 5: signature = HMAC-SHA256(kSigning, stringToSign)
    const signatureBytes = hmacSha256ForAWS(stringToSign, kSigning);
    
    // Convert signature bytes to hex string
    return signatureBytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  } catch (error) {
    console.error('Error in calculateSignature:', error);
    throw error;
  }
}

/**
 * Uploads a file to S3
 */
function uploadToS3(bucket, key, content, contentType = 'text/html; charset=utf-8') {
  try {
    const credentials = getAWSCredentials();
    const config = getAWSConfig();
    const region = config.region;
    
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const path = '/' + key;
    const url = `https://${host}${path}`;
    
    const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = datetime.substr(0, 8);
    
    const payloadHash = sha256Hex(content);
    
    // Build headers
    const headers = {
      'host': host,
      'x-amz-date': datetime,
      'x-amz-content-sha256': payloadHash,
      'content-type': contentType
    };
    
    // Create canonical request
    const sortedHeaderKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedHeaderKeys
      .map(key => key.toLowerCase() + ':' + headers[key].trim())
      .join('\n') + '\n';
    const signedHeaders = sortedHeaderKeys.map(key => key.toLowerCase()).join(';');
    
    const canonicalRequest = [
      'PUT',
      path,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');
    
    // Create string to sign
    const credentialScope = [date, region, 's3', 'aws4_request'].join('/');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      datetime,
      credentialScope,
      sha256Hex(canonicalRequest)
    ].join('\n');
    
    // Calculate signature
    const signature = calculateSignature(credentials.secretAccessKey, date, region, 's3', stringToSign);
    
    // Build authorization header
    const authHeader = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    // Make request
    const requestHeaders = {
      'Authorization': authHeader,
      'x-amz-date': datetime,
      'x-amz-content-sha256': payloadHash,
      'Content-Type': contentType
    };
    
    const options = {
      method: 'put',
      headers: requestHeaders,
      payload: content,
      contentType: contentType,
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200 && responseCode !== 204) {
      throw new Error(`S3 upload failed (${responseCode}): ${response.getContentText()}`);
    }
    
    console.log(`✓ Uploaded to S3: s3://${bucket}/${key}`);
    return true;
    
  } catch (error) {
    console.error(`✗ S3 upload failed for ${key}:`, error.message);
    throw error;
  }
}

/**
 * Syncs a single report from Google Drive to S3
 */
function syncReportToS3(userId, year, month) {
  try {
    const config = getAWSConfig();
    
    // Get report from Drive
    const reportsFolder = DriveApp.getFolderById(CONFIG.REPORTS_FOLDER_ID);
    const userFolders = reportsFolder.getFoldersByName(userId);
    
    if (!userFolders.hasNext()) {
      console.log(`No folder found for user ${userId}`);
      return { success: false, reason: 'No folder' };
    }
    
    const userFolder = userFolders.next();
    const analyticsFolders = userFolder.getFoldersByName('analytics-report');
    
    if (!analyticsFolders.hasNext()) {
      return { success: false, reason: 'No analytics folder' };
    }
    
    const analyticsFolder = analyticsFolders.next();
    const yearFolders = analyticsFolder.getFoldersByName(year);
    
    if (!yearFolders.hasNext()) {
      return { success: false, reason: 'No year folder' };
    }
    
    const yearFolder = yearFolders.next();
    const monthFolders = yearFolder.getFoldersByName(month);
    
    if (!monthFolders.hasNext()) {
      return { success: false, reason: 'No month folder' };
    }
    
    const monthFolder = monthFolders.next();
    const reportFiles = monthFolder.getFilesByName('report.html');
    
    if (!reportFiles.hasNext()) {
      return { success: false, reason: 'No report file' };
    }
    
    // Read report content
    const file = reportFiles.next();
    const content = file.getBlob().getDataAsString();
    
    // Upload to S3
    const s3Key = `${userId}/analytics-report/${year}/${month}/report.html`;
    uploadToS3(config.bucket, s3Key, content);
    
    console.log(`✓ Synced report for user ${userId} (${year}/${month})`);
    return { success: true };
    
  } catch (error) {
    console.error(`✗ Error syncing report for user ${userId}:`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Syncs all reports created in the last N days to S3
 */
function syncRecentReportsToS3(daysBack = 1) {
  console.log(`\n========================================`);
  console.log(`S3 SYNC JOB STARTED`);
  console.log(`========================================`);
  console.log(`Environment: ${AWS_CONFIG.ENVIRONMENT}`);
  console.log(`Days back: ${daysBack}`);
  console.log(`Start time: ${new Date().toISOString()}`);
  
  try {
    const config = getAWSConfig();
    console.log(`Bucket: ${config.bucket}`);
    console.log(`Region: ${config.region}`);
    console.log(`----------------------------------------\n`);
    
    const reportsFolder = DriveApp.getFolderById(CONFIG.REPORTS_FOLDER_ID);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`Scanning Google Drive folders...\n`);
    
    let syncedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const failedReports = [];
    
    const userFolders = reportsFolder.getFolders();
    
    while (userFolders.hasNext()) {
      const userFolder = userFolders.next();
      const userId = userFolder.getName();
      
      const analyticsFolders = userFolder.getFoldersByName('analytics-report');
      if (!analyticsFolders.hasNext()) continue;
      
      const analyticsFolder = analyticsFolders.next();
      const yearFolders = analyticsFolder.getFolders();
      
      while (yearFolders.hasNext()) {
        const yearFolder = yearFolders.next();
        const year = yearFolder.getName();
        const monthFolders = yearFolder.getFolders();
        
        while (monthFolders.hasNext()) {
          const monthFolder = monthFolders.next();
          const month = monthFolder.getName();
          
          // Check if folder was modified recently
          const lastModified = monthFolder.getLastUpdated();
          if (lastModified < cutoffDate) {
            skippedCount++;
            continue;
          }
          
          // Check for report.html
          const reportFiles = monthFolder.getFilesByName('report.html');
          if (!reportFiles.hasNext()) continue;
          
          const reportFile = reportFiles.next();
          
          // Check if file was created/modified recently
          const fileDate = reportFile.getLastUpdated();
          if (fileDate < cutoffDate) {
            skippedCount++;
            continue;
          }
          
          try {
            // Read and upload
            const content = reportFile.getBlob().getDataAsString();
            const s3Key = `${userId}/analytics-report/${year}/${month}/report.html`;
            
            uploadToS3(config.bucket, s3Key, content);
            syncedCount++;
            
            console.log(`✓ Synced: ${userId}/${year}/${month}`);
            
          } catch (error) {
            failedCount++;
            const errorMsg = `${userId}/${year}/${month}: ${error.message}`;
            failedReports.push(errorMsg);
            console.error(`✗ Failed: ${errorMsg}`);
          }
        }
      }
    }
    
    console.log(`\n========================================`);
    console.log(`S3 SYNC JOB COMPLETED`);
    console.log(`========================================`);
    console.log(`End time: ${new Date().toISOString()}`);
    console.log(`Results:`);
    console.log(`  ✓ Synced: ${syncedCount}`);
    console.log(`  ✗ Failed: ${failedCount}`);
    console.log(`  ⊘ Skipped (old): ${skippedCount}`);
    
    if (failedReports.length > 0) {
      console.log(`\nFailed reports:`);
      failedReports.forEach(report => console.log(`  - ${report}`));
    }
    
    console.log(`========================================\n`);
    
    return {
      synced: syncedCount,
      failed: failedCount,
      skipped: skippedCount,
      failedReports: failedReports
    };
    
  } catch (error) {
    console.error(`\n✗ FATAL ERROR in S3 sync:`, error);
    console.error(`Stack trace:`, error.stack);
    throw error;
  }
}

/**
 * Test function - upload a single file
 */
function testS3Upload() {
  console.log('========================================');
  console.log('TESTING S3 UPLOAD');
  console.log('========================================\n');
  
  // Change these to test with a real report from your Drive
  const testUserId = '6908b342b83f51b6572e6fb4'; // Use a real user ID
  const year = '2025';
  const month = '11';
  
  console.log(`Test parameters:`);
  console.log(`  Environment: ${AWS_CONFIG.ENVIRONMENT}`);
  console.log(`  User ID: ${testUserId}`);
  console.log(`  Year: ${year}`);
  console.log(`  Month: ${month}\n`);
  
  try {
    const result = syncReportToS3(testUserId, year, month);
    
    console.log('\n========================================');
    console.log('TEST RESULT');
    console.log('========================================');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✓ TEST PASSED - Report uploaded successfully!');
    } else {
      console.log(`\n✗ TEST FAILED - ${result.reason}`);
    }
    
  } catch (error) {
    console.error('\n✗ TEST FAILED WITH ERROR:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

/**
 * Test function - sync recent reports
 */
function testS3Sync() {
  console.log('Testing S3 sync for last 7 days...\n');
  
  try {
    const result = syncRecentReportsToS3(7);
    
    console.log('\n========================================');
    console.log('TEST SYNC SUMMARY');
    console.log('========================================');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n✗ SYNC TEST FAILED:');
    console.error(error.message);
  }
}
/**
 * Lists all available reports in Google Drive
 * Helps find valid user IDs for testing
 */
/**
 * Finds the first available report for testing
 * Stops after finding one to avoid timeout
 */
function findFirstAvailableReport() {
  console.log('Searching for first available report...\n');
  
  try {
    const reportsFolder = DriveApp.getFolderById(CONFIG.REPORTS_FOLDER_ID);
    const userFolders = reportsFolder.getFolders();
    
    while (userFolders.hasNext()) {
      const userFolder = userFolders.next();
      const userId = userFolder.getName();
      
      const analyticsFolders = userFolder.getFoldersByName('analytics-report');
      if (!analyticsFolders.hasNext()) continue;
      
      const analyticsFolder = analyticsFolders.next();
      const yearFolders = analyticsFolder.getFolders();
      
      while (yearFolders.hasNext()) {
        const yearFolder = yearFolders.next();
        const year = yearFolder.getName();
        const monthFolders = yearFolder.getFolders();
        
        while (monthFolders.hasNext()) {
          const monthFolder = monthFolders.next();
          const month = monthFolder.getName();
          
          const reportFiles = monthFolder.getFilesByName('report.html');
          if (reportFiles.hasNext()) {
            // Found one! Return it immediately
            console.log('✓ Found report:');
            console.log(`  User ID: ${userId}`);
            console.log(`  Year: ${year}`);
            console.log(`  Month: ${month}`);
            console.log('');
            
            return { userId, year, month };
          }
        }
      }
    }
    
    console.log('✗ No reports found');
    return null;
    
  } catch (error) {
    console.error('Error finding report:', error);
    throw error;
  }
}

/**
 * Automatic test - finds and uploads the first available report
 */
function autoTestS3Upload() {
  console.log('========================================');
  console.log('AUTO TEST S3 UPLOAD');
  console.log('========================================\n');
  console.log(`Environment: ${AWS_CONFIG.ENVIRONMENT}`);
  console.log(`Bucket: ${getAWSConfig().bucket}`);
  console.log(`Region: ${getAWSConfig().region}\n`);
  
  try {
    // Find first available report
    const report = findFirstAvailableReport();
    
    if (!report) {
      console.log('✗ No reports found to test with');
      return;
    }
    
    console.log('Testing upload...\n');
    
    // Upload it
    const result = syncReportToS3(report.userId, report.year, report.month);
    
    console.log('\n========================================');
    console.log('TEST RESULT');
    console.log('========================================');
    
    if (result.success) {
      console.log('✓ TEST PASSED - Report uploaded successfully!\n');
      console.log('Verify in AWS S3 Console:');
      console.log(`  Bucket: ${getAWSConfig().bucket}`);
      console.log(`  Region: ${getAWSConfig().region}`);
      console.log(`  Path: ${report.userId}/analytics-report/${report.year}/${report.month}/report.html`);
    } else {
      console.log(`✗ TEST FAILED - ${result.reason}`);
    }
    
  } catch (error) {
    console.error('\n✗ TEST FAILED WITH ERROR:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}