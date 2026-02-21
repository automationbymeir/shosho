/**
 * NotificationService.gs
 * Handles email notifications and QA workflow
 */

/**
 * Get configuration value from Config tab
 */
function getConfigValue(key) {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('Config');

    if (!sheet) {
      console.error('Config sheet not found');
      return null;
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }

    return null;
  } catch (e) {
    console.error('Error getting config value:', e);
    return null;
  }
}

/**
 * Send email notification when briefs are ready for QA review
 */
function sendBriefReadyNotification(briefData) {
  try {
    const notificationEmail = getConfigValue('NOTIFICATION_EMAIL');

    if (!notificationEmail) {
      console.warn('Notification email not configured');
      return false;
    }

    // Get the web app URL for QA review
    const webAppUrl = ScriptApp.getService().getUrl();
    const qaReviewUrl = webAppUrl + '?page=qa-review&briefId=' + briefData.briefId;

    const subject = `[QA Review Required] New Brief: ${briefData.company} - ${briefData.category}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #222325; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { background: #f7f7f7; padding: 20px; border: 1px solid #e4e5e7; }
    .info-row { margin: 10px 0; }
    .info-label { font-weight: 600; color: #555; }
    .info-value { color: #222; }
    .cta-button { 
      display: inline-block; 
      background: #222325; 
      color: white !important; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 8px; 
      margin-top: 20px;
      font-weight: 600;
    }
    .cta-button:hover { background: #404145; }
    .footer { background: #fff; padding: 15px 20px; border: 1px solid #e4e5e7; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 New Brief Ready for QA Review</h1>
    </div>
    <div class="content">
      <div class="info-row">
        <span class="info-label">Brief ID:</span>
        <span class="info-value">${briefData.briefId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Created:</span>
        <span class="info-value">${new Date(briefData.timestamp).toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Expert:</span>
        <span class="info-value">${briefData.agentName} (${briefData.agentEmail})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Client:</span>
        <span class="info-value">${briefData.contactName} - ${briefData.company}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Vertical:</span>
        <span class="info-value">${briefData.vertical} > ${briefData.category}${briefData.subCategory ? ' > ' + briefData.subCategory : ''}</span>
      </div>
      
      <p style="margin-top: 20px;">Two briefs have been generated for this request:</p>
      <ul>
        <li><strong>Standard Brief</strong> - Generated using the standard process</li>
        <li><strong>Vertical-Specific Brief</strong> - Generated using ${briefData.vertical}-specific questions</li>
      </ul>
      
      <p>Please review both briefs and rate which one is better in terms of accuracy, relevancy, and structure.</p>
      
      <a href="${qaReviewUrl}" class="cta-button">Review Briefs Now →</a>
    </div>
    <div class="footer">
      This is an automated notification from Job Post Pro v2.0. 
      <br>Brief comparison data helps improve our generation algorithms.
    </div>
  </div>
</body>
</html>
`;

    // Use GmailApp to send with 'from' alias
    try {
      GmailApp.sendEmail(notificationEmail, subject, "Please view this email in a client that supports HTML.", {
        from: "simba@fiverr.com",
        name: "Simba (Fiverr Pro)",
        htmlBody: htmlBody
      });
    } catch (e) {
      console.error("Error sending email via GmailApp (alias check):", e);
      // Fallback if alias is not configured or permissions missing
      MailApp.sendEmail({
        to: notificationEmail,
        subject: subject,
        htmlBody: htmlBody
      });
    }

    console.log('Notification email sent to:', notificationEmail);
    return true;

  } catch (e) {
    console.error('Error sending notification email:', e);
    return false;
  }
}
