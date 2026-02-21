/**
 * IntakeService.gs (Updated 2026-02-11)
 * Handles the "Tell us about your project" flow from the intake spreadsheet.
 */

const INTAKE_SHEET_ID = "1MxvL1ykrfHpsR51OQrVi2n4iWujmluKDwlrM5QdeFaM"; // Provided by user
const INTAKE_SHEET_TAB_NAME = "Sheet1"; // Default, consistent with gid=0

/**
 * TRIGGER FUNCTION: Run this on a time-driven trigger (e.g. every 5 or 10 minutes)
 * Checks for new rows in the intake sheet, processes them with AI, and sends notifications.
 */
function processNewIntakeRequests() {
    console.log("Starting processNewIntakeRequests...");
    try {
        const ss = SpreadsheetApp.openById(INTAKE_SHEET_ID);
        // FIX: Use the Tab Name if possible, otherwise default to first
        let sheet = ss.getSheetByName(INTAKE_SHEET_TAB_NAME);
        if (!sheet) {
            console.warn(`Sheet "${INTAKE_SHEET_TAB_NAME}" not found. Defaulting to first sheet.`);
            sheet = ss.getSheets()[0];
        }
        console.log(`Using Sheet: "${sheet.getName()}"`);

        const data = sheet.getDataRange().getValues();
        console.log(`Total Rows Found: ${data.length}`);

        if (data.length <= 1) {
            console.log("No data found in intake sheet (only headers or empty).");
            return;
        }

        // Headers are in row 1
        // Headers are in row 1
        const headers = data[0];
        const headerMap = createFuzzyHeaderMap(headers);

        // Check if we have the necessary status/output columns. If not, create them.
        let statusColIndex = getColumnIndex(headerMap, ["Status", "State"]);

        if (statusColIndex === undefined) {
            console.log("Initializing output columns...");
            const lastCol = sheet.getLastColumn();
            sheet.getRange(1, lastCol + 1).setValue("AI_Summary");
            sheet.getRange(1, lastCol + 2).setValue("AI_Questions");
            sheet.getRange(1, lastCol + 3).setValue("AI_JSON");
            sheet.getRange(1, lastCol + 4).setValue("Status");
            // Re-read data to get new headers
            return processNewIntakeRequests();
        }

        const aiSummaryIndex = getColumnIndex(headerMap, ["AI_Summary", "AI Summary"]);
        const aiQuestionsIndex = getColumnIndex(headerMap, ["AI_Questions", "AI Questions"]);
        const aiJsonIndex = getColumnIndex(headerMap, ["AI_JSON", "AI JSON"]);

        // Iterate through rows (skipping header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const status = String(row[statusColIndex] || "").trim();

            // DEBUG: Log status for every row to see why it skips
            console.log(`Row ${i + 1} Status Check: "${status}"`);

            if (!status || status === "") {
                console.log(`Processing Row ${i + 1}...`);

                // Robust Column Lookup
                const userIdIdx = getColumnIndex(headerMap, ["User_id", "ID"]);
                const emailIdx = getColumnIndex(headerMap, ["Email", "Email Address"]);
                const descIdx = getColumnIndex(headerMap, ["Project Description", "Description"]);
                const timeIdx = getColumnIndex(headerMap, ["TimeStamp", "Timestamp"]);
                const expertIdx = getColumnIndex(headerMap, ["Expert", "Sourcing Expert", "Expert Name"]);
                const meetingDateIdx = getColumnIndex(headerMap, ["Meeting Date", "Meeting"]);

                // Extract Input Data
                const userId = userIdIdx !== undefined ? row[userIdIdx] : "";
                const email = emailIdx !== undefined ? row[emailIdx] : "";
                const description = descIdx !== undefined ? row[descIdx] : "";
                const timestamp = timeIdx !== undefined ? row[timeIdx] : "";

                // Extra Columns Logic
                const expertCol = expertIdx !== undefined ? expertIdx : -1;
                const meetingDateCol = meetingDateIdx !== undefined ? meetingDateIdx : -1;

                const expertName = expertCol > -1 ? String(row[expertCol]) : "";
                const meetingDate = meetingDateCol > -1 ? String(row[meetingDateCol]) : "";

                console.log(`DEBUG: Row ${i + 1} | ExpertCol: ${expertCol} | MeetingCol: ${meetingDateCol}`);
                console.log(`DEBUG: Row ${i + 1} | Extracted Expert: "${expertName}" | Extracted Date: "${meetingDate}"`);

                if (!description) {
                    console.log(`Row ${i + 1} has no description. Skipping.`);
                    continue;
                }

                // 1. Run AI Analysis
                const aiResult = analyzeRequestWithAI(description, email);

                if (aiResult.success) {
                    // 2. Update Spreadsheet
                    sheet.getRange(i + 1, aiSummaryIndex + 1).setValue(aiResult.summary);
                    sheet.getRange(i + 1, aiQuestionsIndex + 1).setValue(aiResult.questions);
                    sheet.getRange(i + 1, aiJsonIndex + 1).setValue(JSON.stringify(aiResult.json));
                    sheet.getRange(i + 1, statusColIndex + 1).setValue("Processed");

                    // 3. Send Notification Email
                    sendIntakeNotification(email, description, aiResult.summary, aiResult.questions, expertName, meetingDate);

                    console.log(`Row ${i + 1} processed successfully.`);
                } else {
                    console.error(`AI Analysis failed for Row ${i + 1}: ${aiResult.error}`);
                    sheet.getRange(i + 1, statusColIndex + 1).setValue("Error: " + aiResult.error);
                }
            }
        }

    } catch (e) {
        console.error("Error in processNewIntakeRequests:", e);
    }
}

/**
 * Helper to map headers to column indices (robust)
 */
function mapHeaders(headers) {
    const map = {};
    headers.forEach((h, i) => {
        const key = String(h).trim();
        if (key) map[key] = i;
    });
    console.log("Header Map:", JSON.stringify(map));
    return map;
}

/**
 * Helper to map headers to column indices matching loosely
 * Normalizes to lowercase and removes non-alphanumeric characters for matching
 */
function createFuzzyHeaderMap(headers) {
    const map = {};
    headers.forEach((h, i) => {
        // Normalize: "User ID" -> "userid", "AI_Summary" -> "aisummary", "Project Description" -> "projectdescription"
        const key = String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key) map[key] = i;
    });
    console.log("Fuzzy Header Map:", JSON.stringify(map));
    // Allow debugging by logging the raw headers too
    console.log("Raw Headers:", JSON.stringify(headers));
    return map;
}

/**
 * Gets the index from the map using potentially different known variations
 */
function getColumnIndex(map, possibleNames) {
    for (const name of possibleNames) {
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (map.hasOwnProperty(key)) {
            console.log(`DEBUG: Found column for "${name}" (key: "${key}") -> Index ${map[key]}`);
            return map[key];
        }
    }
    return undefined;
}

/**
 * Called by the UI to fetch pending requests for the Expert to pick up.
 */
function getPendingIntakeRequests() {
    try {
        const ss = SpreadsheetApp.openById(INTAKE_SHEET_ID);
        const sheet = ss.getSheets()[0];
        const data = sheet.getDataRange().getValues();

        if (data.length <= 1) {
            // If no data or only headers, return a debug item
            return [{
                rowId: 0,
                userId: "DEBUG_MODE",
                email: "⚠️ DEBUG: No Data in Sheet",
                description: `Diagnostics:\n- Sheet is empty or only contains headers.\n- Total Rows: ${data.length}`,
                timestamp: new Date().toISOString(),
                aiSummary: "The sheet is empty or only contains headers. Please add some data.",
                aiQuestions: "Ensure your sheet has at least one row of data below the headers.",
                aiJson: {}
            }];
        }

        const headers = data[0];
        const headerMap = createFuzzyHeaderMap(headers);

        // Define the keys we are looking for
        const statusIdx = getColumnIndex(headerMap, ["Status", "State"]);
        const emailIdx = getColumnIndex(headerMap, ["Email", "Email Address", "User Email"]);
        const descIdx = getColumnIndex(headerMap, ["Project Description", "Description", "Brief"]);
        const timeIdx = getColumnIndex(headerMap, ["TimeStamp", "Timestamp", "Date"]);
        const summaryIdx = getColumnIndex(headerMap, ["AI_Summary", "AI Summary", "Summary"]);
        const questionsIdx = getColumnIndex(headerMap, ["AI_Questions", "AI Questions", "Questions"]);
        const jsonIdx = getColumnIndex(headerMap, ["AI_JSON", "AI JSON", "JSON"]);
        const userIdIdx = getColumnIndex(headerMap, ["User_id", "User Id", "ID", "UserId"]);
        const nameIdx = getColumnIndex(headerMap, ["Contact Name", "User Name", "Name", "Client Name"]);
        const expertIdx = getColumnIndex(headerMap, ["Expert", "Assigned Expert", "Sourcing Expert"]);
        const meetingDateIdx = getColumnIndex(headerMap, ["Meeting Date", "Meeting", "Date of Meeting"]);

        const pendingRequests = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            // Check status if column exists
            const status = statusIdx !== undefined ? String(row[statusIdx] || "").trim() : "MISSING_COL";

            // We accept "Processed" (case insensitive comparison)
            if (status.toLowerCase() === "processed") {

                let aiJson = {};
                if (jsonIdx !== undefined) {
                    try {
                        const rawJson = row[jsonIdx];
                        if (rawJson && rawJson !== "") aiJson = JSON.parse(rawJson);
                    } catch (err) { }
                }

                let dateStr = "";
                if (timeIdx !== undefined && row[timeIdx]) {
                    try { dateStr = new Date(row[timeIdx]).toISOString(); } catch (e) { dateStr = String(row[timeIdx]); }
                }

                let contactName = nameIdx !== undefined ? String(row[nameIdx]) : "";

                // Fallback: Check if AI extracted a contact name if column is missing
                if (!contactName && aiJson['contactName']) {
                    contactName = aiJson['contactName'];
                }

                // If contact name is extracted, ensure it's in the AI JSON for the frontend
                if (contactName && !aiJson.contactName) {
                    aiJson.contactName = contactName;
                }

                pendingRequests.push({
                    rowId: i + 1,
                    userId: userIdIdx !== undefined ? String(row[userIdIdx]) : "",
                    email: emailIdx !== undefined ? String(row[emailIdx]) : "Unknown Email",
                    contactName: contactName,
                    description: descIdx !== undefined ? String(row[descIdx]) : "",
                    timestamp: dateStr,
                    aiSummary: summaryIdx !== undefined ? String(row[summaryIdx]) : "",
                    aiQuestions: questionsIdx !== undefined ? String(row[questionsIdx]) : "",
                    aiJson: aiJson,
                    expert: expertIdx !== undefined ? String(row[expertIdx]) : "",
                    meetingDate: meetingDateIdx !== undefined ? String(row[meetingDateIdx]) : ""
                });
            }
        }

        // DEBUG: If empty, return a fake item with diagnostic info
        if (pendingRequests.length === 0) {
            const firstRowStatus = data.length > 1 && statusIdx !== undefined ? String(data[1][statusIdx]) : "N/A";
            return [{
                rowId: 0,
                userId: "DEBUG_MODE",
                email: "⚠️ DEBUG: No Pending Requests Found",
                description: `Diagnostics:\n- Headers Found: ${headers.join(", ")}\n- Status Col Index: ${statusIdx}\n- First Row Status Val: "${firstRowStatus}"\n- Total Rows: ${data.length}`,
                timestamp: new Date().toISOString(),
                aiSummary: "The system found 0 rows with 'Processed' status. Check the 'Questions' section for details.",
                aiQuestions: `Status Column Index: ${statusIdx} (undefined means column missing)\nExpected Headers: Status, State\nActual Headers: ${JSON.stringify(headers)}\n\nIf Status Col is present, check if values are exactly "Processed".`,
                aiJson: {}
            }];
        }

        return pendingRequests.reverse();

    } catch (e) {
        console.error("Error getting pending requests:", e);
        return [{
            rowId: 0,
            email: "⚠️ SYSTEM ERROR",
            description: String(e),
            timestamp: new Date().toISOString(),
            aiSummary: "Error executing script.",
            aiQuestions: String(e.stack),
            aiJson: {}
        }];
    }
}

/**
 * Uses ChatGPT to analyze the raw project description.
 */
/**
 * Uses ChatGPT to analyze the raw project description.
 */
/**
 * Uses ChatGPT to analyze the raw project description.
 */
function analyzeRequestWithAI(description, userEmail) {
    // 1. Fetch available hierarchy for context
    // CHANGED: Use the BigQuery synced paths if available
    let validPathsText = "";

    try {
        // Try to get paths from the new BQ sync
        // We assume BigQueryService.gs is loaded in the project
        if (typeof getCategoryPathsForAI === 'function') {
            const paths = getCategoryPathsForAI();
            if (paths && paths.length > 0) {
                // Limit to avoiding token overflow if necessary, but 1000 paths is typically fine for gpt-4
                validPathsText = paths.slice(0, 1000).join("\n");
                console.log(`Using ${paths.length} category paths from BigQuery Sync.`);
            }
        }
    } catch (e) {
        console.warn("Failed to load BQ paths, falling back to legacy hierarchy", e);
    }

    // Fallback if BQ sync failed or empty
    if (!validPathsText) {
        console.log("Using legacy VerticalService hierarchy.");
        const hierarchyResult = getVerticalHierarchy(); // From VerticalService.gs
        if (hierarchyResult.success) {
            const hierarchy = hierarchyResult.data;
            const paths = [];
            for (const [v, vData] of Object.entries(hierarchy)) {
                for (const [c, cData] of Object.entries(vData.categories)) {
                    if (cData.subCategories && cData.subCategories.length > 0) {
                        for (const s of cData.subCategories) {
                            const sName = typeof s === 'object' ? s.name : s;
                            paths.push(`${v} > ${c} > ${sName}`);
                        }
                    } else {
                        paths.push(`${v} > ${c}`);
                    }
                }
            }
            validPathsText = paths.join("\n");
        }
    }

    const prompt = `
  You are an expert Talent Success Manager at Fiverr Pro. You are analyzing a raw "Tell us about your project" request from a client.
  
  Client Email: ${userEmail}
  Project Description: "${description}"
  
  Your goal is to prepare the Sourcing Expert for a meeting with this client by categorizing the request and drafting a brief.
  
  VALID CATEGORY PATHS (Strictly choose one of these):
  ${validPathsText}
  
  Output a JSON object with the following structure:
  {
    "summary": "**Project Summary:** [Concise 1-2 sentence summary]\\n**Client:** [Name] - [Position/Role]\\n**Company:** [Company Name]\\n**Budget:** [Budget info]",
    "questions": "A list of 3-5 sharp, strategic clarification questions.",
    "prefillData": {
       "contactName": "Client Name if mentioned (or extract from email if obvious)",
       "company": "Company Name if mentioned",
       "role": "Suggested Job Title",
       "vertical": "The EXACT Vertical from the chosen path (First part of path)",
       "category": "The EXACT Category from the chosen path (Second part of path)",
       "subCategory": "The EXACT SubCategory from the chosen path (Third part of path, or null)",
       "theNeed": "Refined project description",
       "skillsAndExperience": "Comma-separated list of required skills/tools",
       "industry": "Industry context (e.g. FinTech, E-commerce)",
       "about": "A short 1-sentence description of what the company does (inferred from context)",
       "engagementModel": "Strictly 'Gig' or 'Ongoing engagement'",
       "pricingType": "Strictly 'Fixed' or 'Hourly' (Default to 'Fixed' if unsure)",
       "workplaceType": "Strictly 'Remote', 'On-site', or 'Hybrid' (Default to 'Remote')"
    }
  }
  
  Return ONLY the valid JSON, no markdown formatting.
  `;

    try {
        const jsonString = callChatGPT(prompt);
        // Cleanup JSON if needed (remove markdown)
        const cleanJson = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleanJson);

        return {
            success: true,
            summary: result.summary,
            questions: Array.isArray(result.questions) ? result.questions.join("\n") : result.questions,
            json: result.prefillData
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Sends the formatted email to simba@fiverr.com
 */
function sendIntakeNotification(clientEmail, description, summary, questions, expertName, meetingDate) {
    const recipient = "simba@fiverr.com";
    const subject = "Initial expert sourcing request received";

    // Format meeting date if present
    let meetingHtml = "";
    if (meetingDate) {
        let dateVal = meetingDate;
        try { dateVal = new Date(meetingDate).toLocaleDateString(); } catch (e) { }
        meetingHtml = `<p><strong>📅 Scheduled Meeting:</strong> ${dateVal}</p>`;
    }

    let expertHtml = "";
    if (expertName) {
        expertHtml = `<p><strong>👤 Assigned Expert:</strong> ${expertName}</p>`;
    }

    const htmlBody = `
    <h2>&#128640; New Sourcing Request Received</h2>
    ${expertHtml}
    ${meetingHtml}
    <p><strong>Client:</strong> ${clientEmail}</p>
    <hr>
    <h3>&#128204; AI Summary</h3>
    <p>${summary}</p>
    <hr>
    <h3>&#10067; Suggested Clarity Questions</h3>
    <pre style="font-family: inherit; white-space: pre-wrap;">${questions}</pre>
    <hr>
    <h3>&#128196; Original Request</h3>
    <p><em>"${description}"</em></p>
    <hr>
    <p><small>This request is now available in the Job Post Pro Dashboard for processing.</small></p>
  `;

    // Use GmailApp to send with 'from' alias
    try {
        GmailApp.sendEmail(recipient, subject, "Please view this email in a client that supports HTML.", {
            from: "simba@fiverr.com",
            name: "Simba (Fiverr Pro)",
            htmlBody: htmlBody
        });
    } catch (e) {
        console.error("Error sending email via GmailApp (alias check):", e);
        // Fallback if alias is not configured or permissions missing
        MailApp.sendEmail({
            to: recipient,
            subject: subject,
            htmlBody: htmlBody
        });
    }
}


/**
 * Step 3: Refine Project Data using Meeting Transcript
 * Merges existing data with new insights from a client meeting.
 */
function processTranscriptWithAI(currentData, transcript) {
    let validPathsText = "";

    // Try to get paths from the new BQ sync
    try {
        if (typeof getCategoryPathsForAI === 'function') {
            const paths = getCategoryPathsForAI();
            if (paths && paths.length > 0) {
                validPathsText = paths.slice(0, 1000).join("\n");
            }
        }
    } catch (e) { console.warn("BQ Path load failed", e); }

    // Fallback to legacy
    if (!validPathsText) {
        const hierarchyResult = getVerticalHierarchy();
        if (hierarchyResult && hierarchyResult.success) {
            const paths = [];
            for (const [vName, vData] of Object.entries(hierarchyResult.data)) {
                if (vData.categories) {
                    for (const [cName, cData] of Object.entries(vData.categories)) {
                        paths.push(`${vName} > ${cName}`);
                    }
                }
            }
            validPathsText = paths.slice(0, 300).join("\n");
        }
    }

    const prompt = `
  You are an expert Talent Success Manager at Fiverr Pro.
  
  CONTEXT:
  We have an initial project request (possibly incomplete). 
  A meeting was held with the client to clarify scope.
  
  CURRENT KNOWN DATA:
  ${JSON.stringify(currentData, null, 2)}
  
  NEW MEETING TRANSCRIPT / NOTES:
  "${transcript}"
  
  TASK:
  Update the project/job details based on the NEW information.
  - The Transcript is the authoritative source. Overwrite old data if it conflicts.
  - Extract specific details: Role Title, Skills, Budget, Timeline.
  - Re-evaluate the 'vertical', 'category' if needed based on the new info.
  
  VALID CATEGORY PATHS (Strictly choose one):
  ${validPathsText}
  ... (Assume truncated list is representative)
  
  Output a JSON object:
  {
    "summary": "Updated concise summary incorporating meeting insights.",
    "questions": "Remaining clarification questions (if any, otherwise empty string).",
    "prefillData": {
       "contactName": "Client Name",
       "contactEmail": "Client email if mentioned",
       "company": "Company Name",
       "role": "Job Title",
       "vertical": "The EXACT Vertical",
       "category": "The EXACT Category",
       "subCategory": "The EXACT SubCategory (or null)",
       "theNeed": "Detailed project description from transcript",
       "skillsAndExperience": "Required skills",
       "industry": "Industry context",
       "about": "Company description",
       "engagementModel": "Gig or Ongoing",
       "pricingType": "Fixed or Hourly",
       "workplaceType": "Remote, On-site, or Hybrid"
    }
  }
  
  Return ONLY the valid JSON.
  `;

    try {
        const jsonString = callChatGPT(prompt);
        const cleanJson = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleanJson);

        return {
            success: true,
            summary: result.summary,
            questions: result.questions,
            json: result.prefillData
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
