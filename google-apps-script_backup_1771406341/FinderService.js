/**
 * FinderService.gs
 * Handles communication with the AI Talent Lake Finder project
 */

// Configuration
// The user must set this Script Property with the Web App URL of the deployed Finder project
const FINDER_URL_PROPERTY = 'FINDER_WEB_APP_URL';

/**
 * Triggers a search in the external AI Talent Lake Finder
 * @param {Object} formData - The original form data
 * @param {string} briefContent - The final brief text
 * @param {string} briefId - The relevant brief ID
 * @returns {Object} Result of the operation
 */
function triggerFinderSearch(formData, briefContent, briefId) {
  try {
    const finderUrl = PropertiesService.getScriptProperties().getProperty(FINDER_URL_PROPERTY);
    
    if (!finderUrl) {
      console.warn('Finder Web App URL not set. Skipping search trigger.');
      return { success: false, error: 'Finder URL not configured' };
    }

    console.log('Triggering Finder search for brief:', briefId);

    // Construct the payload
    // We send relevant fields that might be useful for the search query
    const payload = {
      action: 'search_and_notify',
      briefId: briefId,
      role: formData.role || '',
      vertical: formData.selectedVertical || '',
      category: formData.selectedCategory || '',
      subCategory: formData.selectedSubCategory || '',
      skills: formData.skillsAndExperience || '',
      jobDescription: briefContent,
      // Pass the agent and contact emails for notification context if needed
      agentEmail: Session.getActiveUser().getEmail(),
      contactEmail: formData.contactEmail || ''
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      }
    };

    const response = UrlFetchApp.fetch(finderUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log('Finder response:', responseCode, responseText);

    if (responseCode !== 200) {
      throw new Error(`Finder API returned ${responseCode}: ${responseText}`);
    }

    const responseData = JSON.parse(responseText);
    
    // Return successes plus the actual results array if provided
    return { 
      success: true, 
      response: responseText,
      results: responseData.results || [],
      count: responseData.count || 0
    };

  } catch (e) {
    console.error('Error triggering Finder search:', e);
    // We don't want to break the main submission flow if this fails
    return { success: false, error: e.message };
  }
}
