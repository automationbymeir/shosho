// ==================================
// Configuration
// ==================================
const KNOWN_HEADERS = [
  "Job Title", "Company", "Website", "Contact Email", "Contact Name",
  "Industry / Vertical", "Job Type", "Role Overview",
  "About the Project", "About Us", "Job Overview",
  "Key Responsibilities", "Requirements & Qualifications",
  "Engagement Model", "Payment & Compensation", "Timeline",
  "Workplace & Logistics", "Tools & Platforms", "Bonus Considerations"
];

// --- REQUIRED: SET THESE VALUES ---
const TARGET_FOLDER_ID = "1LtS8vajROQVQDBSicMKhogyHjw6TdsTO";
const BRIEF_METADATA_SHEET_ID = "1Ime4nTUTAkk4t95OwK8JRqV0DYGngg8EnUCeoMr6bTY";
const FEEDBACK_SPREADSHEET_ID = "1K21P8Hu5JNQ8YhNg6TnpyvVAgyXKVdvH_nF52l4etUc";

// Workato API Configuration
const WORKATO_API_URL = "https://apim.workato.com/prod_fiverr/integration-api-prod-v0/api-integration-prod";
const WORKATO_API_TOKEN = "232ff17d43a16a866d1c2861d74ac3b9505926b29cf3d58c37f59630d93b8c50";

// Dropdown values spreadsheet
const DROPDOWN_VALUES_SHEET_ID = "1TIt779EIG58oTdT-TL-6GnsrkfDOc4AZQghwHPWYgZQ";


// ==================================
// Main Menu & Sidebar
// ==================================

function onOpen() {
  const ui = DocumentApp.getUi();
  ui.createMenu("Job Post Pro")
    .addItem("Show Job Post Sidebar", "showSidebar")
    .addSeparator()
    .addItem("Set OpenAI API Key", "setOpenAIKey")
    .addItem("Verify OpenAI Key Setup", "verifyOpenAIKeySetup")
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Job Post Options");
  DocumentApp.getUi().showSidebar(html);
}


// ==================================
// Dropdown Values Loading
// ==================================

/**
 * Loads dropdown values from the Google Sheet
 */
function getDropdownValues() {
  try {
    const ss = SpreadsheetApp.openById(DROPDOWN_VALUES_SHEET_ID);

    return {
      roles: getColumnValues(ss, 'Role'),
      verticals: getColumnValues(ss, 'Vertical'),
      timeZones: getColumnValues(ss, 'preferredTimeZone'),
      locations: getColumnValues(ss, 'talentLocation'),
      languages: getColumnValues(ss, 'talentLanguage'),
      roleVerticalMapping: getRoleVerticalMapping(),
      purchaseReasons: getColumnValues(ss, 'purchaseReason')
    };
  } catch (e) {
    console.error("Error loading dropdown values:", e);
    return {
      roles: [],
      verticals: [],
      timeZones: [],
      locations: [],
      languages: [],
      roleVerticalMapping: {}
    };
  }
}

/**
 * Gets the Role-to-Vertical mapping from the dropdown values sheet
 * Assumes there's a sheet called "RoleVerticalMapping" with columns: Role, Vertical
 */
function getRoleVerticalMapping() {
  try {
    const ss = SpreadsheetApp.openById(DROPDOWN_VALUES_SHEET_ID);
    const sheet = ss.getSheetByName('RoleVerticalMapping');

    if (!sheet) {
      console.warn('RoleVerticalMapping sheet not found');
      return {};
    }

    const data = sheet.getDataRange().getValues();
    const mapping = {};

    // Skip header row, build mapping object
    for (let i = 1; i < data.length; i++) {
      const role = data[i][0];
      const vertical = data[i][1];
      if (role && vertical) {
        mapping[role] = vertical;
      }
    }

    return mapping;
  } catch (e) {
    console.error("Error loading role-vertical mapping:", e);
    return {};
  }
}

/**
 * Helper function to get values from a specific column/sheet
 */
function getColumnValues(spreadsheet, sheetName) {
  try {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      console.warn(`Sheet "${sheetName}" not found`);
      return [];
    }

    const data = sheet.getDataRange().getValues();
    // Skip header row and filter out empty values
    const values = data.slice(1)
      .map(row => row[0])
      .filter(value => value && String(value).trim() !== '');

    return values;
  } catch (e) {
    console.error(`Error getting values from sheet "${sheetName}":`, e);
    return [];
  }
}

// ==================================
// PREVIEW FUNCTIONALITY - ADD TO CODE.GS
// ==================================

/**
 * Generate a preview of the job description without saving or sending to Workato
 * This allows users to review the generated content before final submission
 */
function generatePreviewFromForm(formData) {
  try {
    if (!formData || Object.keys(formData).length === 0) {
      throw new Error("Form data is empty or invalid.");
    }

    // Generate job description using AI
    const prompt = createPromptFromFormData(formData);
    let enhancedText = callChatGPTWithRetry(prompt).trim();
    enhancedText = enhancedText.replace(/##/g, '\n');

    // Generate DES Questionnaire text (formatted for Salesforce)
    const desQuestionnaire = generateDESQuestionnaire(formData);

    // Return preview data without saving or sending to Workato
    return {
      success: true,
      jobDescription: enhancedText,
      desQuestionnaire: desQuestionnaire,
      formData: formData
    };

  } catch (error) {
    console.error("ERROR in generatePreviewFromForm:", error);
    let userMessage = "An unexpected error occurred: " + error.message;
    if (error.message.includes("OpenAI API key")) {
      userMessage = "Error: OpenAI API Key is not set up correctly. Please use the 'Job Post Pro' menu to set it.";
    } else if (error.message.includes("timed out") || error.message.includes("exceeded maximum execution time")) {
      userMessage = "Error: The request to the AI service timed out. This can happen with very long inputs. Please try again.";
    }
    return {
      success: false,
      error: userMessage
    };
  }
}

// ==================================
// INSTALLATION INSTRUCTIONS
// ==================================

/*
To add the preview functionality to your Job Post Pro script:

1. Copy the generatePreviewFromForm function above
2. Paste it into your Code.gs file (anywhere after the main configuration section)
3. The function uses existing helper functions:
   - createPromptFromFormData() - already exists
   - callChatGPT() - already exists
   - generateDESQuestionnaire() - already exists
4. No other changes to Code.gs are needed
5. Update your Sidebar.html with the new logo (use Sidebar.html from this package)
6. Update your QuestionnaireForm.html with the preview modal (see IMPLEMENTATION_GUIDE.md)

The preview function:
- Generates the job description using AI
- Generates the DES Questionnaire text
- Returns formatted preview data
- Does NOT save anything to documents
- Does NOT send anything to Workato/Salesforce
- Only after user approval will processQuestionnaireForm() be called for actual submission
*/
// ==================================
// Workato API Integration
// ==================================

/**
 * Sends data to Workato API to create a Project_Request__c in Salesforce
 */
function sendToWorkato(formData, desJobDescription, desQuestionnaire) {
  try {
    // Generate unique event ID
    const eventId = Utilities.getUuid();
    const eventTime = new Date().toISOString();

    // Build the Workato payload
    const payload = {
      eventId: eventId,
      eventType: "new_sourcing_request",
      eventTime: eventTime,
      new_sourcing_request: {
        // Basic Information
        company: formData.company || "",
        companyWebsite: formData.companyWebsite || "",

        // Salesforce Integration
        opportunityId: formData.opportunityId || "",
        dealProbability: formData.dealProbability || "",
        requestChannel: formData.requestChannel || "",

        // Role & Vertical
        role: formData.role || "",
        vertical: formData.vertical || "",

        // DES Content
        desJobDescription: desJobDescription || "",
        desQuestionnaire: desQuestionnaire || "",

        // Engagement Details
        engagementModel: formData.engagementModel || "",
        startDate: formData.startDate || "",
        submissionDeadline: formData.submissionDeadline || "",
        pricingType: formData.pricingType || "",
        pricingRange: formData.pricingRange || "",
        talentCapacity: formData.talentCapacity || "",

        // Workplace & Logistics
        workplaceType: formData.workplaceType || "",
        talentLocation: formData.talentLocation || "",
        preferredTimeZone: formData.preferredTimeZone || "",
        talentLanguage: Array.isArray(formData.talentLanguage) ? formData.talentLanguage.join(";") : "",

        // Priority & Reasons
        priority: formData.priority || "",
        priorityDES: formData.priorityDES || "",
        purchaseReason: formData.purchaseReason || "",
        reasonHighBudget: formData.reasonHighBudget === true,
        reasonInterestedInPJM: formData.reasonInterestedInPJM === true,
        reasonNeedsMultipleServices: formData.reasonNeedsMultipleServices === true,
        reasonOther: formData.reasonOther === true,
        reasonPotentiallyProblematicClient: formData.reasonPotentiallyProblematicClient === true,
        specialAttentionFreeText: formData.specialAttentionFreeText || "",

        // Sourcing Details
        preferredSourcingChannels: formData.preferredSourcingChannels || "",

        // Additional Notes
        additionalNotes: formData.additionalNotes || ""
      }
    };

    // Make API call to Workato
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "api-token": WORKATO_API_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    console.log("Sending to Workato:", JSON.stringify(payload, null, 2));

    const response = UrlFetchApp.fetch(WORKATO_API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log("Workato Response Code:", responseCode);
    console.log("Workato Response:", responseText);

    if (responseCode !== 200 && responseCode !== 201) {
      throw new Error(`Workato API returned status ${responseCode}: ${responseText}`);
    }

    // Parse and return response
    try {
      return {
        success: true,
        eventId: eventId,
        response: JSON.parse(responseText)
      };
    } catch (e) {
      return {
        success: true,
        eventId: eventId,
        response: responseText
      };
    }

  } catch (e) {
    console.error("Error sending to Workato:", e);
    throw new Error(`Failed to send to Workato: ${e.message}`);
  }
}


// ==================================
// Document Copying & PDF Generation
// ==================================

function createDocumentCopy(contactName, contactEmail, jobTitle) {
  try {
    const sourceDoc = DocumentApp.getActiveDocument();
    const sourceDocId = sourceDoc.getId();
    const filename = constructBriefFilename(contactName, contactEmail, jobTitle);
    const sourceFile = DriveApp.getFileById(sourceDocId);
    let targetFolder;

    try {
      targetFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    } catch (folderError) {
      console.warn(`Could not access target folder ${TARGET_FOLDER_ID}: ${folderError}. Defaulting to root.`);
      DocumentApp.getUi().alert(`Warning: Could not access the designated save folder (ID: ${TARGET_FOLDER_ID}). The document copy will be saved to your Google Drive root folder.`);
      targetFolder = DriveApp.getRootFolder();
    }

    const destinationFile = sourceFile.makeCopy(filename, targetFolder);
    const copiedDocId = destinationFile.getId();
    console.log(`Created document copy with ID: ${copiedDocId} in folder: ${targetFolder.getName()}`);
    return copiedDocId;
  } catch (e) {
    console.error("Error creating document copy:", e);
    let errorMsg = "An error occurred while creating the document copy.";
    if (e.message.includes("Access denied") || e.message.includes("does not have permission")) {
      errorMsg = "Error: Script does not have permission to create files in Google Drive. Please ensure permissions are granted.";
    } else if (e.message.includes("Invalid argument")) {
      errorMsg = "Error: Invalid argument provided for file copying, potentially an issue with the filename or folder.";
    }
    DocumentApp.getUi().alert(errorMsg);
    throw new Error(`Failed to create document copy: ${e.message}`);
  }
}
/**
 * Looks up Opportunity details from Salesforce via Workato
 * @param {string} opportunityId - The Salesforce Opportunity ID
 * @returns {object} - Contact name, email, company, and website if found
 */
function lookupOpportunityData(opportunityId) {
  if (!opportunityId || opportunityId.trim().length < 15) {
    return { success: false, error: "Invalid Opportunity ID" };
  }

  try {
    // Option 1: If you have a Workato endpoint for lookups
    const WORKATO_LOOKUP_URL = "https://apim.workato.com/prod_fiverr/integration-api-prod-v0/opportunity-lookup"; // Update this URL

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "api-token": WORKATO_API_TOKEN
      },
      payload: JSON.stringify({ opportunityId: opportunityId.trim() }),
      muteHttpExceptions: true,
      timeout: 15000
    };

    const response = UrlFetchApp.fetch(WORKATO_LOOKUP_URL, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      console.warn("Opportunity lookup failed:", response.getContentText());
      return { success: false, error: "Lookup failed" };
    }

    const data = JSON.parse(response.getContentText());

    return {
      success: true,
      contactName: data.contactName || "",
      contactEmail: data.contactEmail || "",
      company: data.accountName || data.company || "",
      companyWebsite: data.website || ""
    };

  } catch (e) {
    console.error("Error looking up opportunity:", e);
    return { success: false, error: e.message };
  }
}
function constructBriefFilename(contactName, contactEmail, jobTitle) {
  let filename = "Job Brief";
  if (contactName && contactName.trim()) filename = `Brief - ${contactName.trim()}`;
  if (jobTitle && jobTitle.trim()) filename += ` - ${jobTitle.trim()}`;
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  filename += ` (${dateStr})`;
  return filename;
}

function generateStyledPdfWithCopy() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    const text = body.getText();

    const startMarker = "===JOB_DESC_START===";
    const endMarker = "===JOB_DESC_END===";
    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("Job description markers (===JOB_DESC_START/END===) not found. Please generate a job post first using the questionnaire or meeting notes option.");
    }

    const jobDescText = text.substring(startIndex + startMarker.length, endIndex).trim();
    const data = parseJobDescriptionImproved(jobDescText);

    const docProps = PropertiesService.getDocumentProperties();
    data.contactName = docProps.getProperty("contactName") || data.contactName || "";
    data.contactEmail = docProps.getProperty("contactEmail") || data.contactEmail || "";
    data.website = docProps.getProperty("website") || data.website || "";
    data.jobTitle = docProps.getProperty("jobTitle") || data.jobTitle || "Position";

    let copiedDocId;
    try {
      copiedDocId = createDocumentCopy(data.contactName, data.contactEmail, data.jobTitle);
    } catch (e) {
      console.error("Error creating document copy during PDF generation:", e);
      DocumentApp.getUi().alert("Warning: Could not create a separate Google Doc copy of the brief. The PDF will be generated, but metadata linking might be affected.");
    }

    const htmlTemplate = HtmlService.createTemplateFromFile("brief");
    htmlTemplate.data = data;
    const htmlOutput = htmlTemplate.evaluate().getContent();

    const tempFile = DriveApp.createFile("temp_brief.html", htmlOutput, MimeType.HTML);
    const pdfBlob = tempFile.getAs(MimeType.PDF);

    let pdfFilename = constructBriefFilename(data.contactName, data.contactEmail, data.jobTitle) + ".pdf";
    pdfBlob.setName(pdfFilename);

    let targetFolder;
    try {
      targetFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    } catch (folderError) {
      console.warn(`Could not access target folder ${TARGET_FOLDER_ID} for PDF: ${folderError}. Defaulting to root.`);
      DocumentApp.getUi().alert(`Warning: Could not access the designated save folder (ID: ${TARGET_FOLDER_ID}). The PDF will be saved to your Google Drive root folder.`);
      targetFolder = DriveApp.getRootFolder();
    }

    const pdfFile = targetFolder.createFile(pdfBlob);
    tempFile.setTrashed(true);

    try {
      const docIdToStore = copiedDocId || doc.getId();
      const docProps = PropertiesService.getDocumentProperties();
      const existingBriefId = docProps.getProperty("briefId");

      // If metadata was already created during questionnaire submission, update it with PDF URL
      if (existingBriefId) {
        console.log("Updating existing metadata entry with PDF URL");
        const updated = updateBriefMetadataWithPdf(docIdToStore, pdfFile.getUrl());
        if (!updated) {
          console.warn("Failed to update existing metadata, creating new entry");
          const creatorEmail = Session.getActiveUser().getEmail();
          storeBriefMetadata(data.contactName, data.contactEmail, pdfFile.getUrl(), docIdToStore, data.jobTitle, creatorEmail);
        }
      } else {
        // No metadata exists yet, create new entry (for briefs created without questionnaire)
        console.log("Creating new metadata entry with PDF URL");
        const creatorEmail = Session.getActiveUser().getEmail();
        const briefId = storeBriefMetadata(data.contactName, data.contactEmail, pdfFile.getUrl(), docIdToStore, data.jobTitle, creatorEmail);
        docProps.setProperty("briefId", briefId);
      }
    } catch (e) {
      console.error("Error storing/updating brief metadata:", e);
      DocumentApp.getUi().alert("Warning: Could not save/update brief metadata to the spreadsheet.");
    }

    return { pdfUrl: pdfFile.getUrl(), docId: copiedDocId };

  } catch (error) {
    console.error("PDF Generation Error:", error);
    let userMessage = "Error generating PDF: " + error.message;
    if (error.message.includes("markers not found")) {
      userMessage = "Error: Could not find the job description markers (===JOB_DESC_START/END===). Please generate the job post content first using the questionnaire or meeting notes options before creating the PDF.";
    } else if (error.message.includes("Access denied") || error.message.includes("does not have permission")) {
      userMessage = "Error: Script does not have permission to access Google Drive folders or files. Please ensure the folder ID is correct and you have granted necessary permissions.";
    } else if (error.message.includes("Invalid argument")) {
      userMessage = "Error: Invalid argument provided for PDF generation, potentially related to file naming or Drive access.";
    }
    DocumentApp.getUi().alert(userMessage);
    return { error: userMessage };
  }
}


// ==================================
// Parsing
// ==================================

function parseJobDescriptionImproved(text) {
  const data = {
    jobTitle: "Position",
    company: "",
    website: "",
    contactEmail: "",
    contactName: "",
    vertical: "",
    jobType: "",
    roleOverview: "",
    aboutUs: "",
    jobOverview: "",
    responsibilities: [],
    requirements: "",
    engagement: "",
    paymentDetails: "",
    timeline: "",
    workplaceAndLogistics: "",
    toolsAndPlatforms: "",
    bonusConsiderations: "",
  };

  const lines = text.split('\n');
  let startLine = 0;
  if (lines[0] && lines[0].trim().toUpperCase() === "JOB DESCRIPTION") startLine = 1;

  const sectionMap = {
    "Job Title": "jobTitle",
    "Company": "company",
    "Website": "website",
    "Contact Email": "contactEmail",
    "Contact Name": "contactName",
    "Industry / Vertical": "vertical",
    "Job Type": "jobType",
    "Role Overview": "roleOverview",
    "About the Project": "aboutUs",
    "About Us": "aboutUs",
    "Job Overview": "jobOverview",
    "Key Responsibilities": "responsibilities",
    "Requirements & Qualifications": "requirements",
    "Engagement Model": "engagement",
    "Payment & Compensation": "paymentDetails",
    "Timeline": "timeline",
    "Workplace & Logistics": "workplaceAndLogistics",
    "Tools & Platforms": "toolsAndPlatforms",
    "Bonus Considerations": "bonusConsiderations"
  };

  let currentHeader = "";
  let currentContent = "";

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const boldMatch = line.match(/^\*\*(.+?):\*\*(.*)$/);
    let headerName, remainderContent;

    if (boldMatch) {
      headerName = boldMatch[1].trim();
      remainderContent = boldMatch[2].trim();
    } else {
      const regularMatch = line.match(/^([^:]+):(.*)$/);
      if (regularMatch && KNOWN_HEADERS.includes(regularMatch[1].trim())) {
        headerName = regularMatch[1].trim();
        remainderContent = regularMatch[2].trim();
      }
    }

    if (headerName) {
      if (currentHeader && sectionMap[currentHeader]) {
        const propName = sectionMap[currentHeader];
        processContentForSection(data, propName, currentContent);
      }
      currentHeader = headerName;
      currentContent = remainderContent;
    } else {
      currentContent = currentContent ? (currentContent + "\n" + line) : line;
    }
  }

  if (currentHeader && sectionMap[currentHeader]) {
    const propName = sectionMap[currentHeader];
    processContentForSection(data, propName, currentContent);
  }

  if (data.jobTitle === "Position") {
    const titlePatterns = [
      /\*\*Job Title:\*\*\s*([^\n]+)/i,
      /Job Title:\s*([^\n]+)/i,
    ];
    for (const pattern of titlePatterns) {
      const titleMatch = text.match(pattern);
      if (titleMatch && titleMatch[1]) {
        data.jobTitle = titleMatch[1].trim();
        break;
      }
    }
  }

  return data;
}

function processContentForSection(data, propName, content) {
  if (!content) return;
  content = content.trim();
  if (propName === "responsibilities") {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) data[propName] = lines;
  } else {
    data[propName] = content;
  }
}
/**
 * Gets the current user's email and attempts to get their name
 */
function getCurrentUserInfo() {
  try {
    const email = Session.getActiveUser().getEmail();
    const name = Session.getActiveUser().getEmail().split('@')[0]; // Fallback: use email prefix

    // Try to get the user's actual name from their Google profile
    let fullName = '';
    try {
      const people = People.People.get('people/me', { personFields: 'names' });
      if (people.names && people.names.length > 0) {
        fullName = people.names[0].displayName || '';
      }
    } catch (e) {
      console.log('Could not get name from People API, using email prefix');
    }

    return {
      email: email,
      name: fullName || name
    };
  } catch (e) {
    console.error('Error getting user info:', e);
    return {
      email: '',
      name: ''
    };
  }
}

// ==================================
// Job Post Generation
// ==================================

function formatMeetingNotesToJobPost() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();

  try {
    const originalContent = body.getText();

    if (!originalContent || originalContent.trim().length < 20) {
      body.clear();
      body.appendParagraph("Error: The document contains insufficient text to generate a brief. Please provide a project description or call transcript.");
      return "Error: Insufficient content.";
    }

    body.clear();

    const prompt = `
Create an internal brief from the text below.

Output MUST use exactly these headers in this order, each on its own line with the formula markdown markers (do NOT style or remove the asterisks):
**Job Title:**
**Company:**
**Website:**
**Contact Email:**
**Industry / Vertical:**
**Job Type:**
**Role Overview:**
**About the Project:**
**Key Responsibilities:**
**Requirements & Qualifications:**
**Engagement Model:**
**Payment & Compensation:**
**Deliverables:**
**References:**
**Timeline:**
**Workplace & Logistics:**
**Tools & Platforms:**
**Bonus Considerations:**

Rules:
- **TLDR**: Briefs must be concise. No redundant information.
- **Job Title**: If vague, refine it to be specific.
- **Company**: Only company info. NO project details here.
- **Project**: brief description + personal story/context.
- **Role Overview**: Short, goal-oriented. How talent helps achieve goals.
- **Key Responsibilities**: **USE BULLET POINTS**. To the point. No redundancy.
- **Requirements**: **USE BULLET POINTS**. To the point. No redundancy.
- **Deliverables**: Defined set of deliverables.
- **References**: Mandatory for verticals like G&D.
- **Timeline**: Start/End/ASAP/Flexible. Remove "potential for long-term".
- **Workplace**: Remove "No travel requirements" or similar "No..." statements.
- **Tools**: Classify as Mandatory or Preferred.
- **Bonus**: Only "good-ifs". No mandatory requirements.
- **Engagement**: Remove "No exclusivity requirement" or similar.
- Fill missing details with "To be determined".

=== SOURCE TEXT START ===
${originalContent}
=== SOURCE TEXT END ===
`;

    let enhancedText;
    try {
      enhancedText = callChatGPT(prompt).trim();
      if (!enhancedText) enhancedText = "No brief was generated. The source text may have been insufficient, or there was an API error.";
    } catch (e) {
      console.error("ERROR calling ChatGPT:", e);
      enhancedText = "Error generating brief: " + e.message;
    }

    body.appendParagraph("===JOB_DESC_START===").setFontSize(1).setForegroundColor("#ffffff");

    body.appendParagraph("JOB DESCRIPTION")
      .setHeading(DocumentApp.ParagraphHeading.HEADING1)
      .setBold(false)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    body.appendParagraph("");

    addFormattedContent(body, enhancedText);

    body.appendParagraph("===JOB_DESC_END===").setFontSize(1).setForegroundColor("#ffffff");

    body.appendPageBreak();
    body.appendParagraph("ORIGINAL INPUT")
      .setHeading(DocumentApp.ParagraphHeading.HEADING1)
      .setBold(true)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    body.appendParagraph("");
    body.appendParagraph(originalContent);

    return "Internal brief generated successfully!";
  } catch (error) {
    console.error("ERROR in formatMeetingNotesToJobPost:", error);
    body.appendParagraph("ERROR GENERATING BRIEF: " + error.message);
    return "Error creating brief: " + error.message;
  }
}


// ==================================
// Questionnaire Processing
// ==================================

function showQuestionnaireDialog() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('QuestionnaireForm.html')
      .setWidth(850)
      .setHeight(700);
    DocumentApp.getUi().showModalDialog(html, 'Domain Expert Sourcing Questionnaire');
    return true;
  } catch (e) {
    console.error("Error showing questionnaire dialog:", e);
    DocumentApp.getUi().alert("Error opening questionnaire: " + e.message);
    return false;
  }
}

function openQuestionnaire() {
  showQuestionnaireDialog();
}

/**
 * FIXED processQuestionnaireForm function
 * 
 * The issue: enhancedText and desQuestionnaire were never defined before being used.
 * 
 * Replace your existing processQuestionnaireForm function with this one.
 */

function processQuestionnaireForm(formData) {
  console.log("Starting processQuestionnaireForm...");
  console.log("Form data keys:", Object.keys(formData));

  try {
    // Validate form data
    if (!formData || Object.keys(formData).length === 0) {
      throw new Error("Form data is empty or invalid.");
    }

    // ============================================
    // FIX: Generate or use edited job description
    // ============================================
    let enhancedText;

    // Check if user edited the job description in preview modal
    if (formData.editedJobDescription && formData.editedJobDescription.trim()) {
      console.log("Using edited job description from preview...");
      enhancedText = formData.editedJobDescription.trim();
    } else {
      // Generate job description using AI
      console.log("Generating job description with AI...");
      const prompt = createPromptFromFormData(formData);
      enhancedText = callChatGPTWithRetry(prompt).trim();
    }

    // Clean up the text
    enhancedText = enhancedText.replace(/##/g, '\n');

    // Generate DES Questionnaire text (formatted for Salesforce)
    console.log("Generating DES questionnaire...");
    const desQuestionnaire = generateDESQuestionnaire(formData);
    // ============================================
    // END FIX
    // ============================================

    // Create a copy of the document for this brief
    console.log("Creating document copy...");
    const jobTitle = formData.role || "Position";
    const contactName = formData.contactName || "Unknown Contact";
    const contactEmail = formData.contactEmail || "";

    // Create the copy
    const copiedDocId = createDocumentCopy(contactName, contactEmail, jobTitle);
    const newDoc = DocumentApp.openById(copiedDocId);
    const body = newDoc.getBody();

    // Clear and populate the NEW document
    console.log("Populating new document...");
    body.clear();
    body.appendParagraph("===JOB_DESC_START===").setFontSize(1).setForegroundColor("#ffffff");

    body.appendParagraph("JOB DESCRIPTION")
      .setHeading(DocumentApp.ParagraphHeading.HEADING1)
      .setBold(false)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    body.appendParagraph("");

    addFormattedContent(body, enhancedText);

    body.appendParagraph("===JOB_DESC_END===").setFontSize(1).setForegroundColor("#ffffff");
    body.appendPageBreak();

    // Add questionnaire responses table
    console.log("Adding questionnaire table...");
    body.appendParagraph("QUESTIONNAIRE RESPONSES")
      .setHeading(DocumentApp.ParagraphHeading.HEADING1)
      .setBold(true)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    addQuestionnaireTable(body, formData);

    // Save and Close the new document
    newDoc.saveAndClose();
    const newDocUrl = `https://docs.google.com/document/d/${copiedDocId}/edit`;

    // Store brief metadata
    try {
      console.log("Storing brief metadata...");
      const creatorEmail = Session.getActiveUser().getEmail();
      const briefId = storeBriefMetadata(contactName, contactEmail, newDocUrl, copiedDocId, jobTitle, creatorEmail);
      console.log("Brief metadata saved with ID:", briefId);
    } catch (metadataError) {
      console.error("Error saving brief metadata:", metadataError);
    }

    // Send to Workato
    let workatoResult;
    try {
      console.log("Sending to Workato...");
      workatoResult = sendToWorkato(formData, enhancedText, desQuestionnaire);
      console.log("Workato submission successful:", workatoResult);

      return `Brief generated successfully! \n\nDocument: ${newDocUrl} \n\nSalesforce Event ID: ${workatoResult.eventId || 'N/A'}`;

    } catch (workatoError) {
      console.error("Workato submission failed:", workatoError);

      if (workatoError.message.includes("400")) {
        return `Brief generated, but Salesforce sync failed (Invalid Data). \n\nDocument: ${newDocUrl} \n\nError: ${workatoError.message}`;
      }

      return `Brief generated, but Salesforce sync failed. \n\nDocument: ${newDocUrl} \n\nError: ${workatoError.message}`;
    }

  } catch (error) {
    console.error("ERROR in processQuestionnaireForm:", error);
    console.error("Error stack:", error.stack);

    let userMessage = "An unexpected error occurred: " + error.message;

    if (error.message.includes("OpenAI API key")) {
      userMessage = "Error: OpenAI API Key is not set up correctly. Please use the 'Job Post Pro' menu to set it.";
    } else if (error.message.includes("timeout") ||
      error.message.includes("DEADLINE") ||
      error.message.includes("exceeded maximum execution time")) {
      userMessage = "Error: The request to the AI service timed out. This can happen with very long inputs (especially meeting transcripts). Please try again with shorter descriptions, or break up your content into smaller sections.";
    } else if (error.message.includes("rate limit")) {
      userMessage = "Error: API rate limit exceeded. Please wait a few minutes before trying again.";
    } else if (error.message.includes("Invalid value for") ||
      error.message.includes("not valid")) {
      userMessage = "Error: " + error.message + " Please ensure you select values from the dropdown lists rather than typing custom text.";
    }

    return userMessage;
  }
}


/**
 * Generates the DES Questionnaire formatted text for Salesforce
 */
function generateDESQuestionnaire(formData) {
  let questionnaire = "=== QUESTIONNAIRE RESPONSES ===\n\n";

  const sections = {
    "Salesforce Integration": [
      { label: "Opportunity ID", field: "opportunityId" },
      { label: "Deal Probability", field: "dealProbability" },
      { label: "Request Channel", field: "requestChannel" }
    ],
    "Basic Information": [
      { label: "Contact Name", field: "contactName" },
      { label: "Contact Email", field: "contactEmail" },
      { label: "Company", field: "company" },
      { label: "Company Website", field: "companyWebsite" },
      { label: "About the Company", field: "about" },
      { label: "Similar Companies", field: "similarCompanies" },
      { label: "Talent Type Preference", field: "talentTypePreference" }
    ],
    "Role Information": [
      { label: "Role", field: "role" },
      { label: "Vertical", field: "vertical" },
      { label: "The Need / Project Description", field: "theNeed" },
      { label: "Required Skills & Tools", field: "skillsAndExperience" }
    ],
    "Experience & Qualifications": [
      { label: "Industry Context", field: "industry" },
      { label: "Years of Experience & Qualifications", field: "experienceQualifications" },
      { label: "Portfolio Requirements", field: "portfolioRequirement" }
    ],
    "Engagement Details": [
      { label: "Engagement Model", field: "engagementModel" },
      { label: "Start Date", field: "startDate" },
      { label: "Submission Deadline", field: "submissionDeadline" },
      { label: "Timeline", field: "timeline" },
      { label: "Pricing Type", field: "pricingType" },
      { label: "Pricing Range", field: "pricingRange" },
      { label: "Payment Preferences", field: "paymentPreferences" },
      { label: "Talent Capacity", field: "talentCapacity" }
    ],
    "Workplace & Logistics": [
      { label: "Workplace Type", field: "workplaceType" },
      { label: "Talent Location", field: "talentLocation" },
      { label: "Preferred Time Zone", field: "preferredTimeZone" },
      { label: "Talent Language(s)", field: "talentLanguage" },
      { label: "Additional Logistics", field: "workplaceLogistics" }
    ],
    "Sourcing & Hiring": [
      { label: "Priority", field: "priority" },
      { label: "DES Priority", field: "priorityDES" },
      { label: "High Budget", field: "reasonHighBudget" },
      { label: "Interested in PJM", field: "reasonInterestedInPJM" },
      { label: "Needs Multiple Services", field: "reasonNeedsMultipleServices" },
      { label: "Potentially Problematic Client", field: "reasonPotentiallyProblematicClient" },
      { label: "Other Reason", field: "reasonOther" },
      { label: "Special Attention Details", field: "specialAttentionFreeText" },
      { label: "Preferred Sourcing Channels", field: "preferredSourcingChannels" },
      { label: "Hiring Challenges", field: "challengesInHiring" },
      { label: "Ideal Candidate Profile", field: "idealCandidateProfile" },
      { label: "Sourcing Priorities", field: "sourcingPriorities" },
      { label: "Screening Questions", field: "screeningQuestions" },
      { label: "Hiring Process", field: "hiringProcess" }
    ],
    "Additional Information": [
      { label: "Additional Notes", field: "additionalNotes" },
      { label: "Meeting Transcript", field: "meetingTranscript" }
    ]
  };

  for (const [sectionName, fields] of Object.entries(sections)) {
    questionnaire += `## ${sectionName}\n\n`;

    for (const fieldDef of fields) {
      const value = formData[fieldDef.field];

      if (value !== null && value !== undefined && value !== "") {
        let displayValue;

        if (typeof value === 'boolean') {
          displayValue = value ? "Yes" : "No";
        } else if (Array.isArray(value)) {
          displayValue = value.join(", ");
        } else {
          displayValue = String(value);
        }

        if (displayValue.trim()) {
          questionnaire += `**${fieldDef.label}:** ${displayValue}\n\n`;
        }
      }
    }
  }

  return questionnaire;
}


function addFormattedContent(body, text) {
  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, "");
    if (line === "") {
      body.appendParagraph("");
      continue;
    }
    body.appendParagraph(line);
  }
}


function createPromptFromFormData(formData) {
  let prompt =
    `You are an expert recruiter and job description writer. Your task is to create a comprehensive, detailed, but CONCISE and NON-REDUNDANT job description by thoroughly analyzing ALL provided information.

=== CRITICAL INSTRUCTIONS ===

1. **TLDR / CONCISENESS**: Briefs are often too long. Cut redundancy. Be direct.
2. **EXTRACT SPECIFICS**: Mine the transcript for specific details.
3. **NO FLUFF**: Do not include negative requirements like "No travel required" or "No exclusivity" unless explicitly emphasized as a unique selling point.
4. **BULLET POINTS**: Use bullet points for lists (Responsibilities, Requirements, tools) to ensure readability.

=== OUTPUT FORMAT ===

Output MUST contain these headers in this exact order, each on its own line with literal markdown (do NOT remove the asterisks):

**Job Title:**
[If the provided title is vague/irrelevant, refine it to be specific and accurate.]

**Company:**
[Brief description about the company and what they do. NO project details in this section.]

**Website:**
[Company website URL]

**Contact Email:**
[Primary contact email]

**Industry / Vertical:**
[Specific industry/vertical.]

**Job Type:**
[Full-time/Part-time/Contract/Freelance]

**Role Overview:**
[Short description of the role and how the talent can help the client achieve expected goals. Focus on impact.]

**About the Project:**
[Brief description of the project. Include any personal points/story the client wants to tell.]

**Key Responsibilities:**
[To the point. Use BULLET POINTS. No redundant info.]

**Requirements & Qualifications:**
[To the point. Use BULLET POINTS. No redundant info.]

**Engagement Model:**
[Engagement structure. Remove unnecessary info like "No exclusivity requirement".]

**Payment & Compensation:**
[Hourly structure (with expected hours) OR Fixed (monthly/per asset). Currency.]

**Deliverables:**
[A defined set of deliverables expected from the talent.]

**References:**
[Mandatory for verticals like G&D. List reference requirements.]

**Timeline:**
[Start date / End date / Immediate availability/ASAP. Flexible option if applicable. Do NOT put "potential for longer-term" here - put in Engagement.]

**Workplace & Logistics:**
[Remote/Hybrid etc. REMOVE unnecessary info like "No travel requirements".]

**Tools & Platforms:**
[Mention tools. Classify as MANDATORY or PREFERRED.]

**Bonus Considerations:**
[Only "good-to-haves". Do NOT include mandatory parts here.]

=== PROCESSING RULES ===

1. **Job Title**: Fix vague titles.
2. **Key Responsibilities/Requirements**: MUST use bullet points.
3. **About Company vs Project**: Keep them strictly separate.
4. **Deliverables/References**: Ensure these new sections are populated if info exists or marked "To be determined".
5. **Redundancy**: Verify that information is not repeated across sections.

=== QUESTIONNAIRE DATA BELOW ===

`;

  // Enhanced field mapping with context hints for the AI
  const promptFieldMap = {
    // Basic Information
    contactName: "CONTACT NAME (primary point of contact)",
    contactEmail: "CONTACT EMAIL",
    companyWebsite: "COMPANY WEBSITE",
    company: "COMPANY NAME",
    about: "ABOUT THE COMPANY (company background, culture, size, stage, mission)",
    similarCompanies: "SIMILAR/COMPARABLE COMPANIES (use to understand market positioning and talent profile)",
    talentTypePreference: "TALENT TYPE PREFERENCE (freelancer vs agency vs employee)",

    // Salesforce Integration
    opportunityId: "SALESFORCE OPPORTUNITY ID",
    dealProbability: "DEAL PROBABILITY",
    requestChannel: "REQUEST CHANNEL (how this request came in)",

    // Role & Vertical
    vertical: "CREATIVE VERTICAL / CATEGORY",
    verticalExamples: "VERTICAL EXAMPLES/LINKS (reference work or style guides)",
    role: "DESIRED JOB TITLE / ROLE",
    theNeed: "THE NEED / PROJECT DESCRIPTION (core problem to solve, why this role exists)",
    skillsAndExperience: "REQUIRED SKILLS, EXPERIENCE & TOOLS (technical requirements)",

    // Experience & Qualifications
    industry: "INDUSTRY CONTEXT AND BACKGROUND (domain expertise needed)",
    experienceQualifications: "YEARS OF EXPERIENCE AND QUALIFICATIONS (seniority level, credentials)",
    portfolioRequirement: "PORTFOLIO REQUIREMENTS (what work samples to show)",

    // Engagement Details
    engagementModel: "ENGAGEMENT MODEL (contract type, structure)",
    startDate: "START DATE",
    submissionDeadline: "SUBMISSION/HIRING DEADLINE",
    timeline: "PROJECT TIMELINE AND KEY MILESTONES",
    pricingType: "PRICING TYPE (hourly, project-based, retainer)",
    pricingRange: "PRICING/BUDGET RANGE",
    paymentPreferences: "PAYMENT PREFERENCES AND TERMS",
    talentCapacity: "TALENT CAPACITY (hours per week, availability)",

    // Workplace & Logistics
    workplaceType: "WORKPLACE TYPE (remote, hybrid, on-site)",
    talentLocation: "TALENT LOCATION REQUIREMENTS OR RESTRICTIONS",
    preferredTimeZone: "PREFERRED TIME ZONE AND OVERLAP REQUIREMENTS",
    talentLanguage: "REQUIRED LANGUAGE(S)",
    workplaceLogistics: "ADDITIONAL WORKPLACE LOGISTICS (equipment, travel, meetings)",

    // Priority & Special Attention
    priority: "PRIORITY LEVEL",
    priorityDES: "DES PRIORITY NOTES",
    specialAttentionFreeText: "SPECIAL ATTENTION NOTES (important context, concerns, or requirements)",

    // Sourcing & Hiring
    preferredSourcingChannels: "PREFERRED SOURCING CHANNELS",
    challengesInHiring: "PAST HIRING CHALLENGES (what hasn't worked, what to avoid)",
    idealCandidateProfile: "IDEAL CANDIDATE PROFILE (who would be perfect for this role)",
    sourcingPriorities: "SOURCING PRIORITIES (what matters most in selection)",
    screeningQuestions: "SUGGESTED SCREENING QUESTIONS (key things to assess)",
    hiringProcess: "HIRING PROCESS OVERVIEW (interview stages, decision makers)",

    // Additional Context
    additionalNotes: "ADDITIONAL IMPORTANT INFORMATION",
    meetingTranscript: "MEETING TRANSCRIPT / CALL NOTES (*** CRITICAL: Contains detailed context, expectations, and nuances - analyze thoroughly ***)"
  };

  // Add each field with its context
  for (const [key, label] of Object.entries(promptFieldMap)) {
    if (formData.hasOwnProperty(key) && formData[key]) {
      let value = formData[key];

      // Handle arrays (like talentLanguage)
      if (Array.isArray(value)) {
        value = value.join(", ");
      }

      // Handle booleans
      if (typeof value === 'boolean') {
        value = value ? "Yes" : "No";
      }

      if (String(value).trim()) {
        prompt += `--- ${label} ---\n${String(value).trim()}\n\n`;
      }
    }
  }

  // Add special attention flags as a summary
  const specialFlags = [];
  if (formData.reasonHighBudget) specialFlags.push("High Budget Client");
  if (formData.reasonInterestedInPJM) specialFlags.push("Interested in Project Management");
  if (formData.reasonNeedsMultipleServices) specialFlags.push("Needs Multiple Services/Roles");
  if (formData.reasonPotentiallyProblematicClient) specialFlags.push("Potentially Challenging Client - Handle with Care");
  if (formData.reasonOther) specialFlags.push("Other Special Consideration");

  if (specialFlags.length > 0) {
    prompt += `--- SPECIAL FLAGS & CONSIDERATIONS ---\n${specialFlags.join("\n")}\n\n`;
  }

  prompt += `
=== END OF QUESTIONNAIRE DATA ===

Now create the comprehensive job description following all instructions above. Remember:
- Extract EVERY relevant detail from the meeting transcript
- Be specific and avoid generic language
- Each section should be rich with information
- Do not lose any important context or requirements
`;

  return prompt;
}

function addQuestionnaireTable(body, formData) {
  body.appendParagraph("\nQuestionnaire Responses").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const table = body.appendTable();
  let headerRow = table.appendTableRow();
  headerRow.appendTableCell("Question").setBold(true);
  headerRow.appendTableCell("Response").setBold(true);

  const questions = {
    opportunityId: "Salesforce Opportunity ID",
    dealProbability: "Deal Probability",
    requestChannel: "Request Channel",
    contactName: "Contact Name",
    contactEmail: "Contact Email",
    company: "Company Name",
    companyWebsite: "Company Website",
    about: "About the Company",
    similarCompanies: "Similar Companies",
    talentTypePreference: "Talent Type Preference",
    role: "Role / Job Title",
    vertical: "Vertical",
    verticalExamples: "Examples/Links",
    theNeed: "The Need / Project Description",
    skillsAndExperience: "Required Skills & Tools",
    industry: "Industry Context",
    experienceQualifications: "Experience & Qualifications",
    portfolioRequirement: "Portfolio Requirements",
    engagementModel: "Engagement Model",
    startDate: "Start Date",
    submissionDeadline: "Submission Deadline",
    timeline: "Timeline",
    pricingType: "Pricing Type",
    pricingRange: "Pricing Range",
    paymentPreferences: "Payment Preferences",
    talentCapacity: "Talent Capacity",
    workplaceType: "Workplace Type",
    talentLocation: "Talent Location",
    preferredTimeZone: "Preferred Time Zone",
    talentLanguage: "Talent Language(s)",
    workplaceLogistics: "Workplace Logistics",
    priority: "Priority",
    priorityDES: "DES Priority",
    reasonHighBudget: "High Budget",
    reasonInterestedInPJM: "Interested in PJM",
    reasonNeedsMultipleServices: "Needs Multiple Services",
    reasonPotentiallyProblematicClient: "Potentially Problematic Client",
    reasonOther: "Other Reason",
    specialAttentionFreeText: "Special Attention Details",
    preferredSourcingChannels: "Preferred Sourcing Channels",
    challengesInHiring: "Hiring Challenges",
    idealCandidateProfile: "Ideal Candidate Profile",
    sourcingPriorities: "Sourcing Priorities",
    screeningQuestions: "Screening Questions",
    hiringProcess: "Hiring Process",
    additionalNotes: "Additional Notes",
    meetingTranscript: "Meeting Transcript Provided"
  };

  let rowsAdded = 0;

  for (const [key, title] of Object.entries(questions)) {
    let value = formData[key];

    // Handle special cases
    if (key === "meetingTranscript") {
      value = (value && String(value).trim()) ? "Yes" : "No";
    } else if (typeof value === 'boolean') {
      value = value ? "Yes" : "No";
    } else if (Array.isArray(value)) {
      value = value.join(", ");
    }

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      try {
        let dataRow = table.appendTableRow();
        dataRow.appendTableCell(title);
        dataRow.appendTableCell(String(value));
        rowsAdded++;
      } catch (cellError) {
        console.error(`Error adding cell for "${title}" (${key}).`, cellError);
      }
    }
  }

  if (rowsAdded > 0) {
    const style = {};
    style[DocumentApp.Attribute.BORDER_WIDTH] = 1;
    style[DocumentApp.Attribute.BORDER_COLOR] = '#CCCCCC';
    table.setAttributes(style);
    table.getRow(0).getCell(0).setBold(true);
    table.getRow(0).getCell(1).setBold(true);
  } else {
    const parent = table.getParent();
    const tableIndex = parent.getChildIndex(table);
    if (tableIndex !== -1) parent.removeChild(table);
    body.appendParagraph("No relevant questionnaire responses were provided.").setItalic(true);
  }
  body.appendParagraph("");
}


// ==================================
// Text Regeneration
// ==================================

function regenerateSectionWithPrompt(userPrompt) {
  const doc = DocumentApp.getActiveDocument();
  const selection = doc.getSelection();
  if (!selection) return "No text selected. Please highlight text to regenerate.";

  const rangeElements = selection.getRangeElements();
  if (rangeElements.length === 0) return "No text selected. Please highlight text to regenerate.";
  if (rangeElements.length !== 1) return "Please select a single block of text.";

  const element = rangeElements[0];
  if (!element.getElement().editAsText) return "Selected element is not editable text.";

  const textElement = element.getElement().asText();
  const startOffset = element.getStartOffset();

  if (element.isPartial()) {
    const endOffset = element.getEndOffsetInclusive();
    if (startOffset < 0 || endOffset < 0 || startOffset > endOffset) {
      return "Invalid text selection. Please try selecting text again.";
    }
    const originalText = textElement.getText().substring(startOffset, endOffset + 1);
    if (!originalText || originalText.trim() === "") return "Selected text is empty. Please select text to regenerate.";

    const prompt = `Please rewrite the following text according to these instructions: ${userPrompt}\n\nText: ${originalText}`;
    const newText = callChatGPT(prompt);
    textElement.deleteText(startOffset, endOffset);
    textElement.insertText(startOffset, newText);
    textElement.setBold(startOffset, startOffset + newText.length - 1, true);
    return { original: originalText, regenerated: newText };
  } else {
    const originalText = textElement.getText();
    if (!originalText || originalText.trim() === "") return "Selected text is empty. Please select text to regenerate.";
    const prompt = `Please rewrite the following text according to these instructions: ${userPrompt}\n\nText: ${originalText}`;
    const newText = callChatGPT(prompt);
    textElement.setText(newText);
    textElement.setBold(0, newText.length - 1, true);
    return { original: originalText, regenerated: newText };
  }
}


// ==================================
// OpenAI API Call
// ==================================

function callChatGPT(prompt) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const OPENAI_API_KEY = scriptProperties.getProperty("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not found. Please set it in script properties.");

  const payload = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a professional recruitment writer who follows formatting instructions exactly. Output the literal **Header:** lines as requested when asked."
      },
      { role: "user", content: prompt }
    ],
    max_tokens: 1500,
    temperature: 0.7
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + OPENAI_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    timeout: 60000  // ← ADD THIS: 60 second timeout (was default 30s)
  };

  try {
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      const msg = (() => {
        try { return (JSON.parse(responseText).error?.message || "Unknown error"); } catch (e) { return responseText; }
      })();
      throw new Error("Error from OpenAI API (Status " + responseCode + "): " + msg);
    }

    const data = JSON.parse(responseText);
    if (!data.choices || data.choices.length === 0) throw new Error("No content returned from OpenAI API");
    const content = data.choices[0].message?.content || "";
    return content.trim();
  } catch (e) {
    console.error("OpenAI API Error:", e);
    throw new Error("Failed to call OpenAI API: " + e.message);
  }
}

function callChatGPTWithRetry(prompt, maxRetries = 2) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`OpenAI API attempt ${attempt} of ${maxRetries}`);
      return callChatGPT(prompt);
    } catch (e) {
      lastError = e;
      console.error(`Attempt ${attempt} failed:`, e.message);

      if (attempt < maxRetries) {
        console.log(`Waiting before retry...`);
        Utilities.sleep(2000); // Wait 2 seconds before retry
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}
// ==================================
// Brief Storage & Retrieval
// ==================================

function getOrCreateStorageSheet() {
  try {
    return SpreadsheetApp.openById(BRIEF_METADATA_SHEET_ID);
  } catch (e) {
    console.error(`Failed to open Brief Metadata Sheet with ID ${BRIEF_METADATA_SHEET_ID}. Error: ${e.message}`);
    DocumentApp.getUi().alert(`Error: Could not access the Brief Storage Spreadsheet (ID: ${BRIEF_METADATA_SHEET_ID}). Check the ID and permissions.`);
    throw new Error(`Failed to access Brief Storage Sheet.`);
  }
}

function storeBriefMetadata(contactName, contactEmail, pdfUrl, docId, jobTitle, creatorEmail) {
  try {
    const ss = getOrCreateStorageSheet();
    const sheet = ss.getActiveSheet();
    const briefDate = new Date();
    const briefId = Utilities.getUuid();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Brief Entry ID", "Contact Name", "Contact Email", "Job Title", "Created Date", "Created By Email", "PDF URL", "Document ID"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([briefId, contactName || "N/A", contactEmail || "N/A", jobTitle || "N/A", briefDate.toISOString(), creatorEmail || "N/A", pdfUrl || "N/A", docId || "N/A"]);
    return briefId;
  } catch (e) {
    console.error("Error storing brief metadata:", e.message, e.stack);
    return null;
  }
}

/**
 * Update existing brief metadata with PDF URL
 */
function updateBriefMetadataWithPdf(docId, pdfUrl) {
  try {
    const ss = getOrCreateStorageSheet();
    const sheet = ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      console.warn("No data in metadata sheet to update");
      return false;
    }

    const headers = data[0].map(h => h.toString().trim());
    const docIdIndex = headers.indexOf("Document ID");
    const pdfUrlIndex = headers.indexOf("PDF URL");

    if (docIdIndex === -1 || pdfUrlIndex === -1) {
      console.error("Required columns not found in metadata sheet");
      return false;
    }

    // Find the row with matching Document ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][docIdIndex] === docId) {
        // Update the PDF URL in this row
        sheet.getRange(i + 1, pdfUrlIndex + 1).setValue(pdfUrl);
        console.log(`Updated PDF URL for document ${docId} at row ${i + 1}`);
        return true;
      }
    }

    console.warn(`No metadata entry found for document ${docId}`);
    return false;
  } catch (e) {
    console.error("Error updating brief metadata:", e.message, e.stack);
    return false;
  }
}

function openBriefDocument(docId) {
  if (!docId || typeof docId !== 'string' || docId.length < 10) {
    DocumentApp.getUi().alert("Cannot open document: Invalid or missing document ID.");
    return false;
  }
  try {
    const url = "https://docs.google.com/document/d/" + docId + "/edit";
    const html = HtmlService.createHtmlOutput(`<script>window.open("${url}", "_blank"); google.script.host.close();</script>`).setWidth(100).setHeight(50);
    DocumentApp.getUi().showModalDialog(html, 'Opening...');
    return true;
  } catch (e) {
    console.error("Error opening document:", e);
    DocumentApp.getUi().alert("Error preparing to open the document: " + e.message);
    return false;
  }
}

function searchBriefs(query) {
  try {
    const ss = getOrCreateStorageSheet();
    const sheet = ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return [];

    const headers = data[0].map(h => h.toString().trim());
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i; });

    const requiredHeaders = ["Contact Name", "Contact Email", "Job Title", "Created Date", "PDF URL", "Document ID"];
    for (const reqHeader of requiredHeaders) {
      if (headerMap[reqHeader] === undefined) throw new Error(`Metadata sheet is missing header: "${reqHeader}".`);
    }

    const briefs = data.slice(1).map(row => ({
      contactName: row[headerMap["Contact Name"]] || "N/A",
      contactEmail: row[headerMap["Contact Email"]] || "N/A",
      jobTitle: row[headerMap["Job Title"]] || "N/A",
      createdAt: row[headerMap["Created Date"]] || null,
      creatorEmail: row[headerMap["Created By Email"]] || "N/A",
      pdfUrl: row[headerMap["PDF URL"]] || "#",
      docId: row[headerMap["Document ID"]] || null
    }));

    query = query.toLowerCase().trim();
    const filteredBriefs = briefs.filter(brief =>
      (brief.contactName && brief.contactName.toLowerCase().includes(query)) ||
      (brief.contactEmail && brief.contactEmail.toLowerCase().includes(query)) ||
      (brief.jobTitle && brief.jobTitle.toLowerCase().includes(query)) ||
      (brief.creatorEmail && brief.creatorEmail.toLowerCase().includes(query))
    );

    return filteredBriefs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateB - dateA;
    });

  } catch (e) {
    console.error("Error searching briefs:", e);
    return { error: "Error searching briefs: " + e.message };
  }
}

function getPreviousBriefs(limit = 50) {
  try {
    const ss = getOrCreateStorageSheet();
    const sheet = ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return [];

    const headers = data[0].map(h => h.toString().trim());
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i; });

    const requiredHeaders = ["Contact Name", "Job Title", "Created Date", "PDF URL", "Document ID"];
    for (const reqHeader of requiredHeaders) {
      if (headerMap[reqHeader] === undefined) throw new Error(`Metadata sheet is missing header: "${reqHeader}".`);
    }

    const briefs = data.slice(1).map(row => ({
      contactName: row[headerMap["Contact Name"]] || "N/A",
      contactEmail: row[headerMap["Contact Email"]] || "N/A",
      jobTitle: row[headerMap["Job Title"]] || "N/A",
      createdAt: row[headerMap["Created Date"]] || null,
      creatorEmail: row[headerMap["Created By Email"]] || "N/A",
      pdfUrl: row[headerMap["PDF URL"]] || "#",
      docId: row[headerMap["Document ID"]] || null
    })).filter(brief => brief.docId);

    return briefs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateB - dateA;
    }).slice(0, limit);

  } catch (e) {
    console.error("Error retrieving briefs:", e);
    return { error: "Error retrieving previous briefs: " + e.message };
  }
}


// ==================================
// Feedback
// ==================================

function getOrCreateFeedbackSheet() {
  if (!FEEDBACK_SPREADSHEET_ID) throw new Error("Feedback Spreadsheet ID is not configured.");
  try {
    const ss = SpreadsheetApp.openById(FEEDBACK_SPREADSHEET_ID);
    let sheet = ss.getSheetByName("FeedbackResponses");
    if (!sheet) {
      sheet = ss.insertSheet("FeedbackResponses");
      sheet.appendRow(["Timestamp", "Feedback Submitted By", "Customer Name", "Customer Email", "Job Title", "Associated Brief Doc ID", "Feedback Content"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    return sheet;
  } catch (e) {
    console.error(`Failed to open or create Feedback Sheet with ID ${FEEDBACK_SPREADSHEET_ID}. Error: ${e.message}`);
    throw new Error(`Failed to access Feedback Storage Sheet. Check ID and permissions.`);
  }
}

function getBriefDataFromActiveDoc() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const docId = doc.getId();
    const docProps = PropertiesService.getDocumentProperties();
    const contactName = docProps.getProperty("contactName");
    const contactEmail = docProps.getProperty("contactEmail");
    const jobTitle = docProps.getProperty("jobTitle");

    return { contactName: contactName || null, contactEmail: contactEmail || null, jobTitle: jobTitle || null, docId };
  } catch (e) {
    console.error("Error getting brief data from active doc:", e);
    return { error: "Could not retrieve brief data from document: " + e.message };
  }
}

function saveJobFeedback(feedbackData) {
  if (!feedbackData || !feedbackData.feedbackContent || !feedbackData.docId) {
    console.error("Incomplete data for saveJobFeedback:", feedbackData);
    return "Error: Missing feedback content or associated document ID.";
  }
  try {
    const feedbackSheet = getOrCreateFeedbackSheet();
    const timestamp = new Date().toISOString();
    const submitterEmail = Session.getActiveUser().getEmail();

    feedbackSheet.appendRow([
      timestamp, submitterEmail,
      feedbackData.contactName || "N/A", feedbackData.contactEmail || "N/A", feedbackData.jobTitle || "N/A",
      feedbackData.docId, feedbackData.feedbackContent.trim()
    ]);
    return "Feedback saved successfully!";
  } catch (e) {
    console.error("Error saving job feedback:", e);
    let errorMsg = "Error saving feedback: " + e.message;
    if (e.message.includes("You do not have permission") || e.message.includes("Access denied")) {
      errorMsg = "Error: Script does not have permission to write to the Feedback Spreadsheet. Please check sheet ID and permissions.";
    }
    return errorMsg;
  }
}

function showFeedbackDialogServerSide(briefData) {
  if (!briefData || typeof briefData !== 'object' || !briefData.docId) {
    console.error("showFeedbackDialogServerSide called with invalid briefData:", briefData);
    DocumentApp.getUi().alert("Error: Could not load brief data for the feedback form.");
    return;
  }
  try {
    const dataString = JSON.stringify(briefData);
    const htmlTemplate = HtmlService.createTemplateFromFile('FeedbackForm');
    htmlTemplate.briefDataJson = dataString;
    const htmlOutput = htmlTemplate.evaluate().setWidth(500).setHeight(450);
    DocumentApp.getUi().showModalDialog(htmlOutput, 'Provide Feedback on Brief');
  } catch (e) {
    console.error("Error creating/showing FeedbackForm dialog:", e);
    DocumentApp.getUi().alert("Error opening the feedback form: " + e.message + ". Please ensure 'FeedbackForm.html' exists in the script project.");
  }
}


// ==================================
// Budget Estimation
// ==================================

function estimateBudgetForBrief(briefText) {
  if (!briefText || briefText.trim().length < 50) return "Error: Brief text is too short to estimate a budget.";

  const scriptProperties = PropertiesService.getScriptProperties();
  const OPENAI_API_KEY = scriptProperties.getProperty("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return "Error: OpenAI API key not set. Please configure it via the menu.";

  const prompt = `Based on the brief below, provide a realistic estimated budget range.
Return ONLY the range (e.g., "$5,000 - $8,000 project based" or "$75 - $100 per hour").

---
${briefText}
---
Estimated Budget Range:`;

  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You estimate budgets concisely." },
      { role: "user", content: prompt }
    ],
    max_tokens: 100,
    temperature: 0.5
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + OPENAI_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    if (responseCode !== 200) {
      let errorMessage = "Unknown error from OpenAI.";
      try {
        const errorObj = JSON.parse(responseText);
        if (errorObj.error && errorObj.error.message) errorMessage = errorObj.error.message;
      } catch (parseError) { errorMessage = responseText; }
      return "Error from OpenAI API (Status " + responseCode + "): " + errorMessage;
    }
    const data = JSON.parse(responseText);
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
      return "Error: No budget estimation content returned from OpenAI.";
    }
    return data.choices[0].message.content.trim();
  } catch (e) {
    return "Error: Failed to call OpenAI API for budget estimation: " + e.message;
  }
}

function getBriefTextFromDocument() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    const text = body.getText();

    const startMarker = "===JOB_DESC_START===";
    const endMarker = "===JOB_DESC_END===";
    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return "Error: Job description markers (===JOB_DESC_START/END===) not found or are in the wrong order. Please generate a job post first.";
    }
    const briefText = text.substring(startIndex + startMarker.length, endIndex).trim();
    return briefText;
  } catch (e) {
    return "Error: Could not retrieve brief text from the document: " + e.message;
  }
}


// ==================================
// Utilities
// ==================================

function clearDocument() {
  const ui = DocumentApp.getUi();
  const response = ui.alert(
    "Clear Document",
    "This will delete all content in the current document. Are you sure?",
    ui.ButtonSet.YES_NO
  );
  if (response === ui.Button.YES) {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    body.clear();
    body.appendParagraph("Document cleared for testing");
  }
}
/**
 * Researches a company using their website to gather business context
 * @param {string} companyName - The company name
 * @param {string} websiteUrl - The company website URL
 * @returns {object} - Research results with company info
 */
function researchCompany(companyName, websiteUrl) {
  console.log(`Researching company: ${companyName}, Website: ${websiteUrl}`);

  if (!websiteUrl && !companyName) {
    return { success: false, data: null, error: "No company name or website provided" };
  }

  try {
    let websiteContent = "";

    // Try to fetch website content if URL provided
    if (websiteUrl) {
      websiteContent = fetchWebsiteContent(websiteUrl);
    }

    // If we have content, analyze it with AI
    if (websiteContent || companyName) {
      const companyInfo = analyzeCompanyWithAI(companyName, websiteUrl, websiteContent);
      return { success: true, data: companyInfo };
    }

    return { success: false, data: null, error: "Could not gather company information" };

  } catch (e) {
    console.error("Error researching company:", e);
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Fetches and extracts text content from a website
 */
function fetchWebsiteContent(url) {
  try {
    // Clean up URL
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }

    // Remove trailing slash
    url = url.replace(/\/+$/, "");

    console.log("Fetching URL:", url);

    const options = {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true,
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobPostPro/1.0)"
      }
    };

    // Fetch main page
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      console.warn(`Website returned status ${responseCode}`);
      return "";
    }

    let html = response.getContentText();

    // Try to also fetch About page if it exists
    const aboutUrls = ["/about", "/about-us", "/company", "/who-we-are"];
    for (const aboutPath of aboutUrls) {
      try {
        const aboutResponse = UrlFetchApp.fetch(url + aboutPath, options);
        if (aboutResponse.getResponseCode() === 200) {
          html += "\n\n--- ABOUT PAGE ---\n\n" + aboutResponse.getContentText();
          break;
        }
      } catch (e) {
        // Continue to next URL
      }
    }

    // Extract meaningful text from HTML
    const cleanText = extractTextFromHtml(html);

    // Limit content length to avoid token issues
    const maxLength = 8000;
    if (cleanText.length > maxLength) {
      return cleanText.substring(0, maxLength) + "...";
    }

    return cleanText;

  } catch (e) {
    console.error("Error fetching website:", e);
    return "";
  }
}

/**
 * Extracts clean text from HTML content
 */
function extractTextFromHtml(html) {
  if (!html) return "";

  // Remove script and style tags with their content
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  html = html.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");

  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, " ");

  // Remove all HTML tags
  html = html.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  html = html.replace(/&nbsp;/g, " ");
  html = html.replace(/&amp;/g, "&");
  html = html.replace(/&lt;/g, "<");
  html = html.replace(/&gt;/g, ">");
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&#39;/g, "'");
  html = html.replace(/&[a-z]+;/gi, " ");

  // Clean up whitespace
  html = html.replace(/\s+/g, " ");
  html = html.trim();

  return html;
}

/**
 * Uses AI to analyze and summarize company information
 */
function analyzeCompanyWithAI(companyName, websiteUrl, websiteContent) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const OPENAI_API_KEY = scriptProperties.getProperty("OPENAI_API_KEY");

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Analyze the following company information and provide a structured summary.

Company Name: ${companyName || "Unknown"}
Website: ${websiteUrl || "Not provided"}

Website Content:
${websiteContent || "No website content available"}

Based ONLY on the information above, provide a JSON response with these fields:
{
  "companyDescription": "2-3 sentence description of what the company does",
  "industry": "Primary industry/sector",
  "products_services": "Main products or services offered",
  "companySize": "Company size if mentioned (startup, SMB, enterprise, etc.)",
  "targetMarket": "Who their customers are",
  "companyStage": "Stage if apparent (startup, growth, established)",
  "headquarters": "Location if mentioned",
  "keyDifferentiators": "What makes them unique",
  "relevantContext": "Any other relevant context for hiring"
}

IMPORTANT: 
- Only include information that is clearly stated or strongly implied in the content
- If information is not available, use "Not specified" 
- Do not invent or assume details
- Keep each field concise (1-2 sentences max)

Respond with valid JSON only, no other text.`;

  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a business analyst. Extract and summarize company information accurately. Never invent information." },
      { role: "user", content: prompt }
    ],
    max_tokens: 800,
    temperature: 0.3 // Lower temperature for more factual output
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + OPENAI_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    timeout: 30000
  };

  try {
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      throw new Error("OpenAI API error: " + response.getContentText());
    }

    const data = JSON.parse(response.getContentText());
    let content = data.choices[0].message.content.trim();

    // Clean up JSON if wrapped in markdown
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return JSON.parse(content);

  } catch (e) {
    console.error("Error analyzing company with AI:", e);
    return {
      companyDescription: "Could not analyze - " + (companyName || "Unknown company"),
      industry: "Not specified",
      products_services: "Not specified",
      companySize: "Not specified",
      targetMarket: "Not specified",
      companyStage: "Not specified",
      headquarters: "Not specified",
      keyDifferentiators: "Not specified",
      relevantContext: "Not specified"
    };
  }
}
// ==================================
// WEB APP ENTRY POINTS
// ==================================

/**
 * Serve the web app - main entry point
 * Replaces sidebar with full-page application
 */
function doGet(e) {
  try {
    console.log("doGet accessed with parameters:", JSON.stringify(e.parameter));

    const page = e.parameter.page || 'main';
    const briefId = e.parameter.briefId || null;

    // DEBUG: Immediate sanity check
    if (page === 'ping') {
      return HtmlService.createHtmlOutput("<h1>PONG - Server is Alive</h1>");
    }

    let template;

    switch (page) {
      case 'qa-review':
        template = HtmlService.createTemplateFromFile('QAReview');
        template.briefId = briefId;
        break;
      case 'analytics':
        template = HtmlService.createTemplateFromFile('Analytics');
        break;
      default:
        template = HtmlService.createTemplateFromFile('MainUI');
    }

    return template.evaluate()
      .setTitle('Job Post Pro v2.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } catch (globalError) {
    console.error("CRITICAL ERROR IN doGet:", globalError);
    return HtmlService.createHtmlOutput(
      '<div style="color:red; font-family:monospace; padding:20px;">' +
      '<h1>CRITICAL SERVER ERROR</h1>' +
      '<p>' + globalError.toString() + '</p>' +
      '<p>Stack: ' + globalError.stack + '</p>' +
      '</div>'
    );
  }
}

/**
 * Include HTML partials
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get current user info
 */
function getCurrentUser() {
  return {
    email: Session.getActiveUser().getEmail(),
    isAdmin: Session.getActiveUser().getEmail() === getConfigValue('ADMIN_EMAIL')
  };
}
