// ==================================
// AI BRIEF QUERY SYSTEM FOR SOURCING TEAM
// Add this code to your existing Code.gs file
// ==================================

/**
 * Configuration for the query system
 */
const QUERY_SYSTEM_CONFIG = {
  maxBriefsToSearch: 50,
  maxContextBriefs: 5,
  similarityThreshold: 0.3
};

// Salesforce Expert Sourcing Requests Spreadsheet
const SALESFORCE_REQUESTS_SHEET_ID = "1sjBDvnpbrVP7CZQF9Qjr7rWGhPbFw75qcWAoKIEfMgI";
const SALESFORCE_REQUESTS_TAB_NAME = "Expert Sourcing Requests";

/**
 * Web app entry point for the sourcing team query interface
 */
function doGet(e) {
  try {
    const page = e.parameter.page || 'query';
    
    if (page === 'query') {
      const template = HtmlService.createTemplateFromFile('SourcingQueryInterface');
      return template.evaluate()
        .setTitle('Brief Query System - Sourcing Team')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    return HtmlService.createHtmlOutput('Invalid page requested');
  } catch (error) {
    console.error('Error in doGet:', error);
    return HtmlService.createHtmlOutput('Error loading page: ' + error.message);
  }
}

/**
 * Parse the structured data from Salesforce "Comments / E-mail thread" field
 */
function parseSalesforceComments(commentsText) {
  if (!commentsText) {
    return {
      clientName: "",
      role: "",
      vertical: "",
      clientWebsite: "",
      engagementModel: "",
      expectedStartDate: "",
      industry: "",
      priority: "",
      jobDescription: ""
    };
  }
  
  const parsed = {
    clientName: extractField(commentsText, /\*Client \(Company Name\)\*:\s*([^\*\n]+)/),
    role: extractField(commentsText, /\*Role\*:\s*([^\*\n]+)/),
    vertical: extractField(commentsText, /\*Vertical\*:\s*([^\*\n]+)/),
    clientWebsite: extractField(commentsText, /\*Client Website\*:\s*([^\*\n]+)/),
    engagementModel: extractField(commentsText, /\*Engagement Model\*:\s*([^\*\n]+)/),
    expectedStartDate: extractField(commentsText, /\*Expected Start Date\*:\s*([^\*\n]+)/),
    industry: extractField(commentsText, /\*Industry\*:\s*([^\*\n]+)/),
    priority: extractField(commentsText, /\*﻿?Priority\*:\s*([^\*\n_]+)/),
    jobDescription: ""
  };
  
  // First, try to extract content between ===JOB_DESC_START=== and ===JOB_DESC_END===
  const jobDescStartMarker = "===JOB_DESC_START===";
  const jobDescEndMarker = "===JOB_DESC_END===";
  
  const startIndex = commentsText.indexOf(jobDescStartMarker);
  const endIndex = commentsText.indexOf(jobDescEndMarker);
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    // Extract content between markers
    parsed.jobDescription = commentsText.substring(
      startIndex + jobDescStartMarker.length, 
      endIndex
    ).trim();
  } else {
    // Fallback: Try to extract from *Job Description*: pattern
    const jobDescMatch = commentsText.match(/\*Job Description\*:\s*([\s\S]*?)(?=__https:\/\/mail\.google\.com|$)/);
    if (jobDescMatch && jobDescMatch[1]) {
      parsed.jobDescription = jobDescMatch[1].trim();
    } else {
      // Final fallback: use entire comments text
      parsed.jobDescription = commentsText;
    }
  }
  
  return parsed;
}

/**
 * Helper function to extract a field value using regex
 */
function extractField(text, regex) {
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : "";
}

/**
 * Search briefs with enhanced capabilities for AI querying
 */
/**
 * Search briefs - UPDATED to use Salesforce Expert Sourcing Requests sheet
 * ENHANCED with extensive logging and null safety
 */
function searchBriefsForQuery(searchParams) {
  console.log('=== searchBriefsForQuery START ===');
  console.log('Input params:', JSON.stringify(searchParams));
  
  try {
    // Validate input
    if (!searchParams) {
      console.log('No searchParams provided, using defaults');
      searchParams = {};
    }
    
    console.log('Opening spreadsheet:', SALESFORCE_REQUESTS_SHEET_ID);
    const ss = SpreadsheetApp.openById(SALESFORCE_REQUESTS_SHEET_ID);
    console.log('Spreadsheet opened successfully');
    
    console.log('Getting sheet:', SALESFORCE_REQUESTS_TAB_NAME);
    const sheet = ss.getSheetByName(SALESFORCE_REQUESTS_TAB_NAME);
    
    if (!sheet) {
      const errorResult = { 
        success: false, 
        error: `Sheet "${SALESFORCE_REQUESTS_TAB_NAME}" not found in spreadsheet` 
      };
      console.error('Sheet not found, returning:', JSON.stringify(errorResult));
      return errorResult;
    }
    console.log('Sheet found successfully');
    
    console.log('Getting data range...');
    const data = sheet.getDataRange().getValues();
    console.log('Data retrieved. Total rows:', data.length);

    if (data.length <= 1) {
      const emptyResult = { success: true, results: [], totalFound: 0 };
      console.log('No data rows found, returning:', JSON.stringify(emptyResult));
      return emptyResult;
    }

    // Map Salesforce headers
    console.log('Mapping headers...');
    const headers = data[0].map(h => h.toString().trim());
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i; });
    console.log('Headers found:', Object.keys(headerMap).length, 'columns');

    // Required columns from Salesforce
    const projectRequestIdIndex = headerMap["Project Request Id"];
    const projectRequestNameIndex = headerMap["Project Request Name"];
    const clientNameIndex = headerMap["Client (Company Name)"];
    const roleIndex = headerMap["Role"];
    const statusIndex = headerMap["Status"];
    const receivedDateIndex = headerMap["Received Date"];
    const commentsIndex = headerMap["Comments / E-mail thread"];
    
    console.log('Processing briefs from rows 2 to', data.length);
    // Get all requests with metadata
    const briefs = data.slice(1).map((row, index) => {
      try {
        // Extract the full job description from Comments / E-mail thread field
        const commentsField = row[commentsIndex] || "";
        
        // Parse the structured data from the comments field
        const parsedData = parseSalesforceComments(commentsField);
        
        return {
          // Salesforce identifiers
          projectRequestId: row[projectRequestIdIndex] || "N/A",
          projectRequestName: row[projectRequestNameIndex] || "N/A",
          
          // Basic info
          clientName: row[clientNameIndex] || parsedData.clientName || "N/A",
          role: row[roleIndex] || parsedData.role || "N/A",
          status: row[statusIndex] || "N/A",
          receivedDate: row[receivedDateIndex] || null,
          
          // Parsed data from comments field
          jobDescription: parsedData.jobDescription || "",
          fullComments: commentsField,
          
          // Additional parsed fields
          vertical: parsedData.vertical || "",
          clientWebsite: parsedData.clientWebsite || "",
          engagementModel: parsedData.engagementModel || "",
          expectedStartDate: parsedData.expectedStartDate || "",
          industry: parsedData.industry || "",
          priority: parsedData.priority || ""
        };
      } catch (rowError) {
        console.error('Error processing row', index + 2, ':', rowError);
        return null; // Will be filtered out
      }
    }).filter(brief => brief && brief.projectRequestId && brief.projectRequestId !== "N/A");
    
    console.log('Briefs after initial processing:', briefs.length);

    // Filter based on search parameters
    let filteredBriefs = briefs;
    
    if (searchParams.query && searchParams.query.trim()) {
      const query = searchParams.query.toLowerCase().trim();
      console.log('Applying text query filter:', query);
      filteredBriefs = filteredBriefs.filter(brief =>
        (brief.projectRequestName && brief.projectRequestName.toLowerCase().includes(query)) ||
        (brief.projectRequestId && brief.projectRequestId.toLowerCase().includes(query)) ||
        (brief.clientName && brief.clientName.toLowerCase().includes(query)) ||
        (brief.role && brief.role.toLowerCase().includes(query)) ||
        (brief.jobDescription && brief.jobDescription.toLowerCase().includes(query)) ||
        (brief.fullComments && brief.fullComments.toLowerCase().includes(query))
      );
      console.log('After query filter:', filteredBriefs.length);
    }

    if (searchParams.role && searchParams.role.trim()) {
      const role = searchParams.role.toLowerCase().trim();
      console.log('Applying role filter:', role);
      filteredBriefs = filteredBriefs.filter(brief =>
        brief.role && brief.role.toLowerCase().includes(role)
      );
      console.log('After role filter:', filteredBriefs.length);
    }

    if (searchParams.company && searchParams.company.trim()) {
      const company = searchParams.company.toLowerCase().trim();
      console.log('Applying company filter:', company);
      filteredBriefs = filteredBriefs.filter(brief =>
        brief.clientName && brief.clientName.toLowerCase().includes(company)
      );
      console.log('After company filter:', filteredBriefs.length);
    }

    if (searchParams.dateFrom) {
      const dateFrom = new Date(searchParams.dateFrom);
      console.log('Applying dateFrom filter:', dateFrom);
      filteredBriefs = filteredBriefs.filter(brief => {
        if (!brief.receivedDate) return false;
        const briefDate = new Date(brief.receivedDate);
        return briefDate >= dateFrom;
      });
      console.log('After dateFrom filter:', filteredBriefs.length);
    }

    if (searchParams.dateTo) {
      const dateTo = new Date(searchParams.dateTo);
      console.log('Applying dateTo filter:', dateTo);
      filteredBriefs = filteredBriefs.filter(brief => {
        if (!brief.receivedDate) return false;
        const briefDate = new Date(brief.receivedDate);
        return briefDate <= dateTo;
      });
      console.log('After dateTo filter:', filteredBriefs.length);
    }

    // Sort by date (most recent first)
    console.log('Sorting briefs by date...');
    filteredBriefs.sort((a, b) => {
      const dateA = a.receivedDate ? new Date(a.receivedDate) : new Date(0);
      const dateB = b.receivedDate ? new Date(b.receivedDate) : new Date(0);
      return dateB - dateA;
    });

    // Limit results
    const maxResults = searchParams.limit || QUERY_SYSTEM_CONFIG.maxBriefsToSearch;
    console.log('Limiting to', maxResults, 'results');
    filteredBriefs = filteredBriefs.slice(0, maxResults);

    const successResult = {
      success: true,
      results: filteredBriefs,
      totalFound: filteredBriefs.length
    };
    
    console.log('=== searchBriefsForQuery SUCCESS ===');
    console.log('Returning', filteredBriefs.length, 'briefs');
    console.log('Result object type:', typeof successResult);
    console.log('Result.success:', successResult.success);
    
    return successResult;

  } catch (e) {
    const errorResult = {
      success: false,
      error: 'Error searching briefs: ' + e.message,
      stack: e.stack
    };
    console.error('=== searchBriefsForQuery ERROR ===');
    console.error('Error:', e);
    console.error('Stack:', e.stack);
    console.error('Returning error result:', JSON.stringify(errorResult));
    return errorResult;
  }
}

/**
 * Extract metadata from document text by parsing the job description
 */
function extractMetadataFromText(fullText, jobDescription) {
  const metadata = {
    contactName: "",
    contactEmail: "",
    companyWebsite: "",
    jobTitle: "",
    company: "",
    opportunityId: "",
    workatoEventId: ""
  };
  
  // Extract from the structured job description
  const lines = jobDescription.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Job Title
    if (line.startsWith('**Job Title:**') || line.startsWith('Job Title:')) {
      metadata.jobTitle = line.replace(/\*\*Job Title:\*\*|Job Title:/g, '').trim();
    }
    
    // Company
    if (line.startsWith('**Company:**') || line.startsWith('Company:')) {
      metadata.company = line.replace(/\*\*Company:\*\*|Company:/g, '').trim();
    }
    
    // Website
    if (line.startsWith('**Website:**') || line.startsWith('Website:')) {
      metadata.companyWebsite = line.replace(/\*\*Website:\*\*|Website:/g, '').trim();
    }
    
    // Contact Email
    if (line.startsWith('**Contact Email:**') || line.startsWith('Contact Email:')) {
      metadata.contactEmail = line.replace(/\*\*Contact Email:\*\*|Contact Email:/g, '').trim();
    }
    
    // Contact Name
    if (line.startsWith('**Contact Name:**') || line.startsWith('Contact Name:')) {
      metadata.contactName = line.replace(/\*\*Contact Name:\*\*|Contact Name:/g, '').trim();
    }
  }
  
  return metadata;
}

/**
 * Get full brief content from Salesforce data
 * Note: projectRequestId is used instead of docId since we're now using Salesforce data
 */
function getBriefContent(projectRequestId) {
  try {
    console.log('getBriefContent called with projectRequestId:', projectRequestId);
    
    if (!projectRequestId) {
      console.error('No project request ID provided');
      return { success: false, error: 'No project request ID provided' };
    }

    // Get the brief data from Salesforce spreadsheet
    const ss = SpreadsheetApp.openById(SALESFORCE_REQUESTS_SHEET_ID);
    const sheet = ss.getSheetByName(SALESFORCE_REQUESTS_TAB_NAME);
    
    if (!sheet) {
      console.error('Sheet not found:', SALESFORCE_REQUESTS_TAB_NAME);
      return { 
        success: false, 
        error: `Sheet "${SALESFORCE_REQUESTS_TAB_NAME}" not found` 
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.error('No data found in Salesforce sheet');
      return { success: false, error: 'No data found in Salesforce sheet' };
    }
    
    // Map headers
    const headers = data[0].map(h => h.toString().trim());
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i; });
    
    console.log('Headers found:', headers);
    
    const projectRequestIdIndex = headerMap["Project Request Id"];
    const commentsIndex = headerMap["Comments / E-mail thread"];
    const clientNameIndex = headerMap["Client (Company Name)"];
    const roleIndex = headerMap["Role"];
    
    if (projectRequestIdIndex === undefined) {
      console.error('Project Request Id column not found');
      return { 
        success: false, 
        error: 'Project Request Id column not found in spreadsheet' 
      };
    }
    
    // Find the row with matching Project Request ID
    let briefRow = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][projectRequestIdIndex] === projectRequestId) {
        briefRow = data[i];
        console.log('Found matching brief at row:', i);
        break;
      }
    }
    
    if (!briefRow) {
      console.error('Project request not found:', projectRequestId);
      return { 
        success: false, 
        error: `Project request ${projectRequestId} not found` 
      };
    }
    
    // Parse the comments field
    const commentsText = briefRow[commentsIndex] || "";
    const parsedData = parseSalesforceComments(commentsText);
    
    // Build metadata
    const metadata = {
      projectRequestId: projectRequestId,
      projectRequestName: briefRow[headerMap["Project Request Name"]] || "",
      contactName: parsedData.clientName || briefRow[clientNameIndex] || "",
      contactEmail: "",
      companyWebsite: parsedData.clientWebsite || "",
      jobTitle: parsedData.role || briefRow[roleIndex] || "",
      vertical: parsedData.vertical || "",
      engagementModel: parsedData.engagementModel || "",
      industry: parsedData.industry || "",
      priority: parsedData.priority || "",
      status: briefRow[headerMap["Status"]] || ""
    };
    
    console.log('Successfully retrieved brief content');
    
    return {
      success: true,
      content: parsedData.jobDescription,
      metadata: metadata,
      fullText: commentsText
    };

  } catch (e) {
    console.error('Error getting brief content:', e);
    console.error('Error stack:', e.stack);
    return {
      success: false,
      error: 'Error retrieving brief content: ' + e.message
    };
  }
}

/**
 * Process a natural language query using AI with brief context
 */
function processAIQuery(userQuery, searchParams = {}) {
  // CRITICAL: This function MUST ALWAYS return an object, never null
  try {
    console.log('processAIQuery called with:', userQuery, searchParams);
    
    if (!userQuery || userQuery.trim().length < 5) {
      return {
        success: false,
        error: 'Query is too short. Please provide a more detailed question.'
      };
    }

    // Step 1: Search for relevant briefs
    const searchResults = searchBriefsForQuery({
      ...searchParams,
      limit: QUERY_SYSTEM_CONFIG.maxBriefsToSearch
    });

    if (!searchResults.success) {
      return searchResults;
    }

    if (searchResults.results.length === 0) {
      return {
        success: true,
        answer: "I couldn't find any briefs matching your search criteria. Please try different search terms or contact the expert sourcing team directly.",
        briefsUsed: [],
        totalBriefsSearched: 0
      };
    }

    // Step 2: Get content from top briefs
    const briefsToAnalyze = searchResults.results.slice(0, QUERY_SYSTEM_CONFIG.maxContextBriefs);
    const briefContents = [];
    
    for (const brief of briefsToAnalyze) {
      if (brief.projectRequestId) {
        const content = getBriefContent(brief.projectRequestId);
        if (content.success) {
          briefContents.push({
            brief: brief,
            content: content.content,
            metadata: content.metadata
          });
        }
      }
    }

    if (briefContents.length === 0) {
      return {
        success: true,
        answer: "I found relevant briefs but couldn't access their content. Please contact the expert sourcing team for assistance.",
        briefsUsed: [],
        totalBriefsSearched: searchResults.totalFound
      };
    }

    // Step 3: Build context for AI
    let contextText = "Here are the relevant job briefs from our database:\n\n";
    
    briefContents.forEach((item, index) => {
      contextText += `=== BRIEF ${index + 1} ===\n`;
      contextText += `Project Request ID: ${item.brief.projectRequestId}\n`;
      contextText += `Project Request Name: ${item.brief.projectRequestName}\n`;
      contextText += `Client: ${item.brief.clientName}\n`;
      contextText += `Role: ${item.brief.role}\n`;
      contextText += `Status: ${item.brief.status}\n`;
      contextText += `Received: ${item.brief.receivedDate ? new Date(item.brief.receivedDate).toLocaleDateString() : 'Unknown'}\n`;
      contextText += `\nBrief Content:\n${item.content}\n\n`;
    });

    // Step 4: Call AI with context
    const prompt = `You are an expert sourcing assistant helping a sourcing team find information about job briefs. 
    
Based on the following job briefs from our database, please answer the user's question accurately and concisely.

${contextText}

User Question: ${userQuery}

Guidelines:
1. Base your answer ONLY on the information provided in the briefs above
2. If the briefs don't contain enough information to fully answer the question, say so
3. Reference specific briefs when providing information (e.g., "According to the brief for [Client Name]...")
4. Be specific and include relevant details like requirements, budgets, timelines when applicable
5. If multiple briefs are relevant, synthesize the information
6. Keep your answer concise but comprehensive

Answer:`;

    let aiResponse;
    try {
      aiResponse = callChatGPTForQuery(prompt);
      
      if (!aiResponse || aiResponse.trim() === '') {
        aiResponse = "I was unable to generate an answer. Please try rephrasing your question.";
      }
    } catch (aiError) {
      console.error('Error calling ChatGPT:', aiError);
      return {
        success: false,
        error: 'Error generating AI response: ' + aiError.message
      };
    }

    return {
      success: true,
      answer: aiResponse,
      briefsUsed: briefContents.map(item => ({
        projectRequestId: item.brief.projectRequestId,
        projectRequestName: item.brief.projectRequestName,
        clientName: item.brief.clientName,
        role: item.brief.role,
        status: item.brief.status,
        receivedDate: item.brief.receivedDate
      })),
      totalBriefsSearched: searchResults.totalFound
    };

  } catch (e) {
    console.error('Error in processAIQuery:', e);
    console.error('Error stack:', e.stack);
    
    // CRITICAL: Always return valid object, never null
    return {
      success: false,
      error: 'Error processing query: ' + (e.message || 'Unknown error'),
      briefsUsed: [],
      totalBriefsSearched: 0
    };
  }
}

/**
 * Specialized ChatGPT call for query system with better context handling
 */
function callChatGPTForQuery(prompt) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const OPENAI_API_KEY = scriptProperties.getProperty("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not found. Please set it in script properties.");
  }

  const payload = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant for a sourcing team at Fiverr Pro. You help them find information about job briefs and client requirements. Always be accurate, concise, and reference specific briefs when providing information."
      },
      { 
        role: "user", 
        content: prompt 
      }
    ],
    max_tokens: 2000,
    temperature: 0.3 // Lower temperature for more consistent, factual responses
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
      const errorMsg = (() => {
        try { 
          return JSON.parse(responseText).error?.message || "Unknown error"; 
        } catch (e) { 
          return responseText; 
        }
      })();
      throw new Error("Error from OpenAI API (Status " + responseCode + "): " + errorMsg);
    }
    
    const data = JSON.parse(responseText);
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No content returned from OpenAI API");
    }
    
    return data.choices[0].message?.content || "";
    
  } catch (e) {
    throw new Error("Failed to call OpenAI API: " + e.message);
  }
}

/**
 * Get quick stats about the brief database
 */
/**
 * Get stats - UPDATED to use Salesforce Expert Sourcing Requests
 */
function getBriefDatabaseStats() {
  try {
    const ss = SpreadsheetApp.openById(SALESFORCE_REQUESTS_SHEET_ID);
    const sheet = ss.getSheetByName(SALESFORCE_REQUESTS_TAB_NAME);
    
    if (!sheet) {
      return {
        success: false,
        error: `Sheet "${SALESFORCE_REQUESTS_TAB_NAME}" not found`
      };
    }
    
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return {
        success: true,
        stats: {
          totalBriefs: 0,
          recentBriefs: 0,
          uniqueRoles: 0,
          uniqueCompanies: 0
        }
      };
    }

    const headers = data[0].map(h => h.toString().trim());
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i; });

    const briefs = data.slice(1);
    const roles = new Set();
    const companies = new Set();
    let recentBriefs = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    briefs.forEach(row => {
      const role = row[headerMap["Role"]];
      const clientName = row[headerMap["Client (Company Name)"]];
      const receivedDate = row[headerMap["Received Date"]];

      if (role) roles.add(role);
      if (clientName) companies.add(clientName);
      
      if (receivedDate) {
        const briefDate = new Date(receivedDate);
        if (briefDate >= thirtyDaysAgo) {
          recentBriefs++;
        }
      }
    });

    return {
      success: true,
      stats: {
        totalBriefs: briefs.length,
        recentBriefs: recentBriefs,
        uniqueRoles: roles.size,
        uniqueCompanies: companies.size
      }
    };

  } catch (e) {
    console.error('Error getting database stats:', e);
    return {
      success: false,
      error: 'Error retrieving stats: ' + e.message
    };
  }
}

/**
 * Ask a specific question about a single brief
 */
function askQuestionAboutBrief(projectRequestId, userQuestion) {
  try {
    if (!userQuestion || userQuestion.trim().length < 5) {
      return {
        success: false,
        error: 'Question is too short. Please provide a more detailed question.'
      };
    }
    
    if (!projectRequestId) {
      return {
        success: false,
        error: 'No project request ID provided.'
      };
    }
    
    // Get the specific brief content
    const briefContent = getBriefContent(projectRequestId);
    
    if (!briefContent.success) {
      return {
        success: false,
        error: 'Could not retrieve brief content: ' + (briefContent.error || 'Unknown error')
      };
    }
    
    // Build context for AI
    let contextText = "Here is the job brief you need to answer questions about:\n\n";
    contextText += `=== PROJECT REQUEST ===\n`;
    contextText += `Project Request ID: ${briefContent.metadata.projectRequestId}\n`;
    contextText += `Project Request Name: ${briefContent.metadata.projectRequestName}\n`;
    contextText += `Client: ${briefContent.metadata.contactName}\n`;
    contextText += `Role: ${briefContent.metadata.jobTitle}\n`;
    contextText += `Vertical: ${briefContent.metadata.vertical}\n`;
    contextText += `Status: ${briefContent.metadata.status}\n`;
    contextText += `\nFull Job Description:\n${briefContent.content}\n\n`;
    
    // Create the AI prompt
    const prompt = `You are an expert sourcing assistant helping a sourcing team understand job briefs.

Based on the following job brief from our database, please answer the user's question accurately and concisely.

${contextText}

User Question: ${userQuestion}

Guidelines:
1. Base your answer ONLY on the information provided in the brief above
2. If the brief doesn't contain enough information to answer the question, say so clearly
3. Be specific and include relevant details from the brief
4. If the information is unclear or ambiguous in the brief, mention that
5. Keep your answer concise but comprehensive
6. Do not make assumptions beyond what's stated in the brief

Answer:`;

    const aiResponse = callChatGPTForQuery(prompt);

    return {
      success: true,
      answer: aiResponse,
      briefUsed: {
        projectRequestId: briefContent.metadata.projectRequestId,
        projectRequestName: briefContent.metadata.projectRequestName,
        clientName: briefContent.metadata.contactName,
        role: briefContent.metadata.jobTitle
      }
    };

  } catch (e) {
    console.error('Error in askQuestionAboutBrief:', e);
    return {
      success: false,
      error: 'Error processing question: ' + e.message
    };
  }
}

/**
 * Get common questions and answers (can be customized)
 */
function getCommonQuestions() {
  return {
    success: true,
    questions: [
      {
        category: "Budget & Pricing",
        examples: [
          "What's the typical budget range for web designer roles?",
          "Show me briefs with budgets over $10,000",
          "What are the payment terms for recent projects?"
        ]
      },
      {
        category: "Skills & Requirements",
        examples: [
          "What skills are most commonly required for developer roles?",
          "Find briefs requiring Adobe After Effects",
          "What qualifications do clients typically want?"
        ]
      },
      {
        category: "Timeline & Urgency",
        examples: [
          "Show me urgent briefs from the last week",
          "What are typical project timelines?",
          "Which briefs need immediate attention?"
        ]
      },
      {
        category: "Location & Remote Work",
        examples: [
          "Are there any on-site requirements?",
          "Show me remote-only positions",
          "What time zones are clients looking for?"
        ]
      }
    ]
  };
}
function testSearch() {
  const result = searchBriefsForQuery({
    query: "designer",
    limit: 5
  });
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Test function to verify Salesforce connection and data
 */
function testSalesforceConnection() {
  try {
    console.log('Testing Salesforce connection...');
    console.log('Spreadsheet ID:', SALESFORCE_REQUESTS_SHEET_ID);
    console.log('Tab Name:', SALESFORCE_REQUESTS_TAB_NAME);
    
    const ss = SpreadsheetApp.openById(SALESFORCE_REQUESTS_SHEET_ID);
    console.log('Spreadsheet opened successfully');
    
    const sheet = ss.getSheetByName(SALESFORCE_REQUESTS_TAB_NAME);
    if (!sheet) {
      console.error('Sheet not found!');
      console.log('Available sheets:', ss.getSheets().map(s => s.getName()));
      return { success: false, error: 'Sheet not found' };
    }
    
    console.log('Sheet opened successfully');
    
    const data = sheet.getDataRange().getValues();
    console.log('Total rows:', data.length);
    console.log('Headers:', data[0]);
    
    if (data.length > 1) {
      console.log('Sample row 1:', data[1]);
      const projectRequestId = data[1][data[0].indexOf("Project Request Id")];
      console.log('Testing getBriefContent with ID:', projectRequestId);
      
      const briefResult = getBriefContent(projectRequestId);
      console.log('getBriefContent result:', briefResult);
      
      return briefResult;
    }
    
    return { success: true, message: 'Connection successful', rowCount: data.length };
    
  } catch (e) {
    console.error('Test failed:', e);
    console.error('Stack:', e.stack);
    return { success: false, error: e.message, stack: e.stack };
  }
}

/**
 * Test processAIQuery function
 */
function testProcessAIQuery() {
  try {
    console.log('Testing processAIQuery...');
    
    const result = processAIQuery("Show me web designer roles", {
      limit: 5
    });
    
    console.log('processAIQuery result:', JSON.stringify(result, null, 2));
    
    if (!result) {
      console.error('CRITICAL: processAIQuery returned null!');
      return { success: false, error: 'Function returned null' };
    }
    
    if (typeof result !== 'object') {
      console.error('CRITICAL: processAIQuery did not return an object!');
      return { success: false, error: 'Function returned ' + typeof result };
    }
    
    if (!result.hasOwnProperty('success')) {
      console.error('CRITICAL: Result object missing success property!');
      return { success: false, error: 'Result missing success property' };
    }
    
    console.log('processAIQuery test passed!');
    return result;
    
  } catch (e) {
    console.error('Test failed:', e);
    console.error('Stack:', e.stack);
    return { success: false, error: e.message, stack: e.stack };
  }
}

/**
 * Test searchBriefsForQuery function directly
 */
function testSearchBriefsForQuery() {
  console.log('=== STARTING searchBriefsForQuery TEST ===');
  
  const result = searchBriefsForQuery({
    query: '',
    limit: 10
  });
  
  console.log('=== TEST RESULT ===');
  console.log('Result type:', typeof result);
  console.log('Result is null?', result === null);
  console.log('Result is undefined?', result === undefined);
  
  if (result) {
    console.log('Result.success:', result.success);
    console.log('Result.results length:', result.results ? result.results.length : 'N/A');
    console.log('Full result:', JSON.stringify(result, null, 2));
  } else {
    console.error('CRITICAL: Function returned null or undefined!');
  }
  
  return result;
}

/**
 * Get brief list for sidebar - LIGHTWEIGHT version without full content
 * This function returns only essential fields to avoid data size issues
 */
function getBriefListForSidebar(searchParams) {
  console.log('=== getBriefListForSidebar START ===');
  console.log('Input params:', JSON.stringify(searchParams));
  
  try {
    // Use the full search function
    const fullResult = searchBriefsForQuery(searchParams);
    
    if (!fullResult || !fullResult.success) {
      console.log('searchBriefsForQuery failed:', fullResult);
      return fullResult;
    }
    
    console.log('Got', fullResult.results.length, 'briefs, creating lightweight version');
    
    // Create lightweight version - remove heavy fields
    const lightweightResults = fullResult.results.map(brief => ({
      projectRequestId: brief.projectRequestId,
      projectRequestName: brief.projectRequestName,
      clientName: brief.clientName,
      role: brief.role,
      status: brief.status,
      receivedDate: brief.receivedDate,
      vertical: brief.vertical,
      // DO NOT include jobDescription and fullComments - too heavy!
    }));
    
    const lightweightResult = {
      success: true,
      results: lightweightResults,
      totalFound: lightweightResults.length
    };
    
    console.log('=== getBriefListForSidebar SUCCESS ===');
    console.log('Returning', lightweightResults.length, 'lightweight briefs');
    
    // Calculate approximate size
    const jsonSize = JSON.stringify(lightweightResult).length;
    console.log('Approximate response size:', jsonSize, 'characters');
    console.log('Approximate response size:', Math.round(jsonSize/1024), 'KB');
    
    return lightweightResult;
    
  } catch (e) {
    const errorResult = {
      success: false,
      error: 'Error getting brief list: ' + e.message,
      stack: e.stack
    };
    console.error('=== getBriefListForSidebar ERROR ===');
    console.error('Error:', e);
    return errorResult;
  }
}

/**
 * Test the lightweight function
 */
function testGetBriefListForSidebar() {
  console.log('=== TESTING getBriefListForSidebar ===');
  
  const result = getBriefListForSidebar({
    query: '',
    limit: 100
  });
  
  console.log('Result type:', typeof result);
  console.log('Result is null?', result === null);
  console.log('Result success?', result ? result.success : 'N/A');
  console.log('Result count:', result && result.results ? result.results.length : 'N/A');
  
  if (result && result.results && result.results.length > 0) {
    console.log('Sample brief:', JSON.stringify(result.results[0], null, 2));
  }
  
  return result;
}

/**
 * ULTRA MINIMAL version - just IDs and names for testing
 */
function getBriefListMinimal(searchParams) {
  console.log('=== getBriefListMinimal START ===');
  
  try {
    const ss = SpreadsheetApp.openById(SALESFORCE_REQUESTS_SHEET_ID);
    const sheet = ss.getSheetByName(SALESFORCE_REQUESTS_TAB_NAME);
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, results: [], totalFound: 0 };
    }
    
    const headers = data[0].map(h => h.toString().trim());
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i; });
    
    console.log('Headers:', headers);
    console.log('Looking for "Project Request Id" at index:', headerMap["Project Request Id"]);
    console.log('Looking for "Project Request Name" at index:', headerMap["Project Request Name"]);
    
    const projectRequestIdIndex = headerMap["Project Request Id"];
    const projectRequestNameIndex = headerMap["Project Request Name"];
    const clientNameIndex = headerMap["Client (Company Name)"];
    const roleIndex = headerMap["Role"];
    const statusIndex = headerMap["Status"];
    const receivedDateIndex = headerMap["Received Date"];
    
    // Log first data row to see what we're getting
    if (data.length > 1) {
      console.log('First data row sample:');
      console.log('  Project Request Id:', data[1][projectRequestIdIndex]);
      console.log('  Project Request Name:', data[1][projectRequestNameIndex]);
      console.log('  Client:', data[1][clientNameIndex]);
    }
    
    // Get only essential fields - NO parsing of comments field
    // CRITICAL: Convert Date objects to ISO strings for serialization
    const briefs = data.slice(1)
      .map(row => {
        const dateValue = row[receivedDateIndex];
        const dateString = dateValue ? (dateValue instanceof Date ? dateValue.toISOString() : dateValue.toString()) : null;
        
        return {
          projectRequestId: row[projectRequestIdIndex] || "",
          projectRequestName: row[projectRequestNameIndex] || "",
          clientName: row[clientNameIndex] || "",
          role: row[roleIndex] || "",
          status: row[statusIndex] || "",
          receivedDate: dateString
        };
      })
      .filter(brief => brief.projectRequestId && brief.projectRequestId !== "N/A");
    
    console.log('Total briefs before sorting:', briefs.length);
    
    // Sort by date - most recent first (BEFORE limiting)
    briefs.sort((a, b) => {
      const dateA = a.receivedDate ? new Date(a.receivedDate) : new Date(0);
      const dateB = b.receivedDate ? new Date(b.receivedDate) : new Date(0);
      return dateB - dateA; // Descending (newest first)
    });
    
    console.log('After sorting, first brief date:', briefs.length > 0 ? briefs[0].receivedDate : 'none');
    console.log('After sorting, last brief date:', briefs.length > 0 ? briefs[briefs.length - 1].receivedDate : 'none');
    
    // Now limit the results
    const limitedBriefs = briefs.slice(0, searchParams.limit || 200);
    
    const result = {
      success: true,
      results: limitedBriefs,
      totalFound: limitedBriefs.length
    };
    
    const jsonSize = JSON.stringify(result).length;
    console.log('Ultra minimal response size:', jsonSize, 'characters (', Math.round(jsonSize/1024), 'KB)');
    console.log('Returning', limitedBriefs.length, 'briefs');
    
    if (limitedBriefs.length > 0) {
      console.log('Sample brief in result:', JSON.stringify(limitedBriefs[0]));
    }
    
    return result;
    
  } catch (e) {
    console.error('Error in getBriefListMinimal:', e);
    return {
      success: false,
      error: 'Error: ' + e.message
    };
  }
}

/**
 * Test the ultra minimal version
 */
function testGetBriefListMinimal() {
  console.log('=== TESTING ULTRA MINIMAL ===');
  
  const result = getBriefListMinimal({
    limit: 100
  });
  
  console.log('Result:', result);
  console.log('Count:', result.results ? result.results.length : 'N/A');
  
  return result;
}

/**
 * Simple echo test to verify google.script.run communication works
 */
function echoTest() {
  console.log('echoTest called');
  return {
    success: true,
    message: 'Echo test successful!',
    timestamp: new Date().toISOString()
  };
}

/**
 * Get a single brief by ID for testing
 */
function getSingleBriefTest() {
  console.log('=== getSingleBriefTest ===');
  
  try {
    const ss = SpreadsheetApp.openById(SALESFORCE_REQUESTS_SHEET_ID);
    const sheet = ss.getSheetByName(SALESFORCE_REQUESTS_TAB_NAME);
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: false, error: 'No data' };
    }
    
    const headers = data[0];
    const row = data[1]; // Just get the first row
    
    const result = {
      success: true,
      brief: {
        id: row[headers.indexOf("Project Request Id")] || "",
        name: row[headers.indexOf("Project Request Name")] || "",
        client: row[headers.indexOf("Client (Company Name)")] || ""
      }
    };
    
    console.log('Returning single brief:', JSON.stringify(result));
    return result;
    
  } catch (e) {
    console.error('Error:', e);
    return { success: false, error: e.message };
  }
}
// ==================================
// AI BRIEF QUERY SYSTEM FOR SOURCING TEAM
// ... (All your existing code remains here) ...
// ==================================

// ==================================
// SLACK BOT INTEGRATION (SECURED)
// Add this to the bottom of your Code.gs file
// ==================================

// Retrieve tokens from Script Properties for security
const SLACK_BOT_TOKEN = PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN");
const SLACK_VERIFICATION_TOKEN = PropertiesService.getScriptProperties().getProperty("SLACK_VERIFICATION_TOKEN");

/**
 * Main entry point for Slack Webhooks
 * This function receives POST requests from Slack
 */
function doPost(e) {
  try {
    // 1. Basic Parse
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("No post data").setMimeType(ContentService.MimeType.TEXT);
    }
    
    const payload = JSON.parse(e.postData.contents);

    // 2. URL Verification Challenge
    // Slack sends this when you first paste the URL. It doesn't always contain the token.
    if (payload.type === "url_verification") {
      console.log('Responding to Slack URL verification');
      return ContentService.createTextOutput(payload.challenge).setMimeType(ContentService.MimeType.TEXT);
    }

    // 3. SECURITY GUARD: Verify the Request
    // Since we deployed as "Anyone", we MUST check if the token matches our Slack App's token.
    if (payload.token !== SLACK_VERIFICATION_TOKEN) {
      console.error("⛔ Unauthorized request blocked. Invalid verification token.");
      return ContentService.createTextOutput("Unauthorized").setMimeType(ContentService.MimeType.TEXT);
    }

    // 4. Handle a real event
    if (payload.type === "event_callback") {
      const event = payload.event;
      
      // We only care about direct mentions to the bot
      if (event.type === "app_mention") {
        
        // Check if it's in a thread. If not, guide the user to use threads.
        if (!event.thread_ts) {
          postSlackMessage(
            event.channel, 
            "Hi! Please reply to a project request *in a thread* and @mention me there so I can find the Request ID context.",
            event.ts 
          );
          return ContentService.createTextOutput("OK");
        }
        
        // Acknowledge immediately to prevent Slack timeout errors (3s limit).
        // We spawn a separate trigger to do the heavy AI work.
        console.log('Valid Slack mention received. Scheduling processing...');
        
        CacheService.getScriptCache().put("slackEvent", JSON.stringify(event), 60);
        
        // Run the "processSlackMention" function 100ms from now
        ScriptApp.newTrigger("processSlackMention")
          .timeBased()
          .after(100)
          .create();
      }
    }

    return ContentService.createTextOutput("OK");

  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * This function does the heavy lifting (AI & Search)
 * It runs asynchronously to avoid timing out the Slack webhook
 */
function processSlackMention() {
  let event;
  try {
    // Retrieve the event data from cache
    const eventData = CacheService.getScriptCache().get("slackEvent");
    if (!eventData) {
      console.error('No slackEvent found in cache.');
      return;
    }
    event = JSON.parse(eventData);

    const channelId = event.channel;
    const userQuestion = event.text; // e.g., "<@U12345> what is the post frequency?"
    const threadTs = event.thread_ts; // The timestamp of the PARENT message (Project Request)
    const replyTs = event.ts; // The timestamp of the USER'S question

    console.log('Processing mention for thread:', threadTs);

    // 1. Get the parent message to find the Request ID
    const parentMessageText = getSlackMessageText(channelId, threadTs);
    if (!parentMessageText) {
      postSlackMessage(channelId, "Sorry, I couldn't read the context from the original message.", replyTs);
      return;
    }

    // 2. Extract Request ID 
    // Looks for "Request Id: a1iPn00000CHtyrIAD" (Case insensitive, handles 15 or 18 chars)
    const regex = /Request Id:\s*([a-zA-Z0-9]{15,18})/i;
    const match = parentMessageText.match(regex);
    
    if (!match || !match[1]) {
      postSlackMessage(channelId, "I can't find a valid **Request Id** in the original message above. Please make sure the parent message contains 'Request Id: XXXXX'.", replyTs);
      return;
    }
    const projectRequestId = match[1];
    console.log('Found Project Request ID:', projectRequestId);

    // 3. Clean the user's question (remove the @mention <@U123> part)
    const cleanedQuestion = userQuestion.replace(/<@[^>]+>/g, "").trim();
    
    if (cleanedQuestion.length < 5) {
      postSlackMessage(channelId, "Your question seems a bit short. Could you elaborate?", replyTs);
      return;
    }

    // 4. Send "Thinking" indicator
    postSlackMessage(channelId, `🔍 *Checking Brief ${projectRequestId}...*`, replyTs);

    // 5. Call the AI Sourcing System
    // (This calls the existing function from your SourcingQueryInterface code)
    const aiResult = askQuestionAboutBrief(projectRequestId, cleanedQuestion);

    // 6. Post the final answer
    let answer;
    if (aiResult.success) {
      answer = aiResult.answer;
    } else {
      // If the AI/Search failed (e.g., ID not found in sheet)
      answer = `⚠️ **Could not answer:** ${aiResult.error}`;
    }
    
    postSlackMessage(channelId, answer, replyTs);

  } catch (error) {
    console.error('Error in processSlackMention:', error);
    // Don't post to Slack on generic crash to avoid loop spam, just log it.
  }
}

/**
 * Helper: Post message to Slack
 */
function postSlackMessage(channelId, text, threadTs) {
  const url = "https://slack.com/api/chat.postMessage";
  const payload = {
    channel: channelId,
    text: text,
    thread_ts: threadTs // Ensures we reply in the thread
  };

  const options = {
    method: "post",
    contentType: "application/json; charset=utf-8",
    headers: { "Authorization": "Bearer " + SLACK_BOT_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    if (!json.ok) {
      console.error("Slack Post Error:", json.error);
    }
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}

/**
 * Helper: Get parent message text
 */
function getSlackMessageText(channelId, messageTs) {
  // Requires 'channels:history' or 'groups:history' scope in Slack App
  const url = `https://slack.com/api/conversations.history?channel=${channelId}&latest=${messageTs}&oldest=${messageTs}&inclusive=true&limit=1`;
  
  const options = {
    method: "get",
    contentType: "application/json; charset=utf-8",
    headers: { "Authorization": "Bearer " + SLACK_BOT_TOKEN },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());
    
    if (jsonResponse.ok && jsonResponse.messages && jsonResponse.messages.length > 0) {
      return jsonResponse.messages[0].text;
    } else {
      console.error('Error getting Slack message:', jsonResponse.error || 'No message found');
      return null;
    }
  } catch (e) {
    console.error("Fetch Error History:", e);
    return null;
  }
}