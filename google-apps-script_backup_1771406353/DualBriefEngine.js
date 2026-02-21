/**
 * DualBriefEngine.gs
 * Handles generation of both standard and vertical-specific briefs
 */

/**
 * Generate both briefs from form data
 * @param {Object} formData - Complete form data including dynamic questions
 * @returns {Object} Both briefs and metadata
 */
function generateDualBriefs(formData) {
  try {
    // Validate transcript is present (mandatory)
    // Validate transcript is present (mandatory) - DISABLED
    // if (!formData.meetingTranscript || formData.meetingTranscript.trim().length < 50) {
    //   throw new Error('Meeting transcript is required and must be at least 50 characters.');
    // }

    console.log('Starting dual brief generation...');
    console.log('Vertical:', formData.selectedVertical);
    console.log('Category:', formData.selectedCategory);

    // Generate Standard Brief (existing process)
    const standardPrompt = createPromptFromFormData(formData);
    const standardBrief = callChatGPTWithRetry(standardPrompt);

    console.log('Standard brief generated successfully');

    // Generate Vertical-Specific Brief (new process)
    const verticalPrompt = createVerticalSpecificPrompt(formData);
    const verticalBrief = callChatGPTWithRetry(verticalPrompt);

    console.log('Vertical brief generated successfully');

    // Generate unique brief ID
    const briefId = 'BRF-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Store both briefs
    const submissionData = {
      briefId: briefId,
      timestamp: new Date().toISOString(),
      agentEmail: Session.getActiveUser().getEmail(),
      agentName: formData.agentName || '',
      contactName: formData.contactName || '',
      contactEmail: formData.contactEmail || '',
      company: formData.company || '',
      vertical: formData.selectedVertical || '',
      category: formData.selectedCategory || '',
      subCategory: formData.selectedSubCategory || '',
      standardBrief: standardBrief,
      verticalBrief: verticalBrief,
      selectedBrief: null, // Will be set after expert selection
      workatoEventId: null,
      status: 'PENDING_REVIEW',
      purchaseReason: formData.purchaseReason || ''
    };

    saveBriefSubmission(submissionData);

    // Send notification email
    sendBriefReadyNotification(submissionData);

    return {
      success: true,
      briefId: briefId,
      standardBrief: standardBrief,
      verticalBrief: verticalBrief,
      metadata: {
        vertical: formData.selectedVertical,
        category: formData.selectedCategory,
        subCategory: formData.selectedSubCategory,
        timestamp: submissionData.timestamp
      }
    };

  } catch (e) {
    console.error('Error in generateDualBriefs:', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Manually trigger the QA notification email for testing
 */
function triggerManualNotification(briefId) {
  try {
    const briefDataResult = getBriefSubmission(briefId);
    if (!briefDataResult.success) {
      throw new Error(briefDataResult.error);
    }

    const success = sendBriefReadyNotification(briefDataResult.data);
    return { success: success, message: success ? 'Notification sent!' : 'Failed to send notification' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Create the vertical-specific prompt with dynamic questions
 */
function createVerticalSpecificPrompt(formData) {
  const vertical = formData.selectedVertical || 'General';
  const category = formData.selectedCategory || 'General';
  const subCategory = formData.selectedSubCategory || '';
  const dynamicQuestions = formData.dynamicQuestionsAnswered || [];

  let prompt = `You are an expert recruiter and job description writer specializing in ${vertical}, specifically ${category}${subCategory ? ' > ' + subCategory : ''}.

=== CRITICAL INSTRUCTIONS FOR ${vertical.toUpperCase()} BRIEFS ===

You are generating a brief specifically tailored for the ${vertical} vertical. This requires:

1. **VERTICAL-SPECIFIC TERMINOLOGY**: Use industry-standard terms for ${category}
2. **RELEVANT DELIVERABLES**: Focus on deliverables typical for ${category} projects
3. **APPROPRIATE TOOLS**: Mention tools commonly used in ${category}
4. **PORTFOLIO REQUIREMENTS**: Specify what portfolio pieces are relevant for ${category}
5. **EVALUATION CRITERIA**: Include ${vertical}-specific evaluation points

`;

  // Add vertical-specific guidelines
  prompt += getVerticalSpecificGuidelines(vertical, category);

  // Add dynamic questions and answers
  if (dynamicQuestions && dynamicQuestions.length > 0) {
    prompt += `
=== ${vertical.toUpperCase()} SPECIFIC QUESTIONS & ANSWERS ===

The expert asked the following ${category}-specific questions and received these answers:

`;

    for (const section of dynamicQuestions) {
      if (section.title) {
        prompt += `\n### ${section.title}\n\n`;
      }

      if (section.questions) {
        for (const q of section.questions) {
          if (q.answer || q.checked) {
            if (q.type === 'checkbox') {
              prompt += `- [${q.checked ? 'X' : ' '}] ${q.text}\n`;
            } else {
              prompt += `**Q:** ${q.text}\n**A:** ${q.answer || 'Not specified'}\n\n`;
            }
          }
        }
      }

      if (section.checkboxItems) {
        prompt += `\nSelected options:\n`;
        for (const item of section.checkboxItems) {
          if (item.checked) {
            prompt += `- ✓ ${item.label}\n`;
          }
        }
      }
    }
  }

  // Add standard form data
  prompt += `
=== STANDARD PROJECT INFORMATION ===

**Contact Name:** ${formData.contactName || 'Not provided'}
**Contact Email:** ${formData.contactEmail || 'Not provided'}
**Company:** ${formData.company || 'Not provided'}
**Company Website:** ${formData.companyWebsite || 'Not provided'}
**About the Company:** ${formData.about || 'Not provided'}

**Role/Job Title:** ${formData.role || category}
**Vertical:** ${vertical}
**Category:** ${category}
${subCategory ? `**Sub-Category:** ${subCategory}` : ''}

**The Need / Project Description:**
${formData.theNeed || 'Not provided'}

**Required Skills & Tools:**
${formData.skillsAndExperience || 'Not provided'}

**Industry Context:**
${formData.industry || 'Not provided'}

**Experience & Qualifications:**
${formData.experienceQualifications || 'Not provided'}

**Portfolio Requirements:**
${formData.portfolioRequirement || 'Not provided'}

**Engagement Model:** ${formData.engagementModel || 'Not provided'}
**Start Date:** ${formData.startDate || 'Not provided'}
**Submission Deadline:** ${formData.submissionDeadline || 'Not provided'}
**Timeline Details:** ${formData.timeline || 'Not provided'}

**Pricing Type:** ${formData.pricingType || 'Not provided'}
**Pricing Range:** ${formData.pricingRange || 'Not provided'}
**Payment Preferences:** ${formData.paymentPreferences || 'Not provided'}
**Talent Capacity:** ${formData.talentCapacity || 'Not provided'}

**Workplace Type:** ${formData.workplaceType || 'Remote'}
**Talent Location:** ${formData.talentLocation || 'Flexible'}
**Preferred Time Zone:** ${formData.preferredTimeZone || 'Flexible'}
**Languages:** ${Array.isArray(formData.talentLanguage) ? formData.talentLanguage.join(', ') : formData.talentLanguage || 'English'}

**Priority:** ${formData.priority || 'Medium'}
**Additional Notes:** ${formData.additionalNotes || 'None'}

=== MEETING TRANSCRIPT ===
*** CRITICAL: This transcript contains the client's actual words, requirements, and context. Extract all relevant details. ***

${formData.meetingTranscript}

=== END OF INPUT DATA ===

`;

  // Add output format specific to vertical
  prompt += getVerticalOutputFormat(vertical, category);

  return prompt;
}

/**
 * Get vertical-specific guidelines for prompt
 */
function getVerticalSpecificGuidelines(vertical, category) {
  const guidelines = {
    'Programming & Tech': `
=== PROGRAMMING & TECH SPECIFIC GUIDELINES ===

For ${category} projects, ensure the brief addresses:
- Specific programming languages and frameworks required
- Development methodology (Agile, Scrum, etc.)
- Code quality expectations (testing, documentation)
- Integration requirements with existing systems
- Security and compliance considerations
- DevOps and deployment requirements
- API documentation needs
- Technical debt considerations

`,
    'Graphics & Design': `
=== GRAPHICS & DESIGN SPECIFIC GUIDELINES ===

For ${category} projects, ensure the brief addresses:
- Visual style and aesthetic direction (modern, minimalist, bold, etc.)
- Brand guidelines compliance requirements
- File format deliverables (AI, PSD, SVG, PNG, etc.)
- Resolution and size specifications
- Color palette requirements (RGB, CMYK, Pantone)
- Typography specifications
- Number of concepts/revisions included
- Source file delivery requirements
- Usage rights and licensing

`,
    'Video & Animation': `
=== VIDEO & ANIMATION SPECIFIC GUIDELINES ===

For ${category} projects, ensure the brief addresses:
- Video length and format specifications
- Resolution requirements (1080p, 4K, etc.)
- Frame rate requirements
- Aspect ratios needed (16:9, 9:16, 1:1)
- Audio requirements (music, voiceover, SFX)
- Storyboard/script requirements
- Animation style (2D, 3D, motion graphics)
- Delivery formats (MP4, MOV, GIF)
- Platform-specific versions needed
- Revision rounds included

`,
    'Digital Marketing': `
=== DIGITAL MARKETING SPECIFIC GUIDELINES ===

For ${category} projects, ensure the brief addresses:
- Marketing channels and platforms
- Target audience and buyer personas
- KPIs and success metrics
- Campaign goals (awareness, leads, conversions)
- Budget allocation expectations
- Reporting and analytics requirements
- A/B testing needs
- Integration with existing marketing stack
- Compliance requirements (GDPR, etc.)
- Timeline for results/optimization

`
  };

  return guidelines[vertical] || `
=== ${vertical.toUpperCase()} GUIDELINES ===

Ensure the brief is tailored specifically for ${category} projects with relevant industry terminology and expectations.

`;
}

/**
 * Get vertical-specific output format
 */
function getVerticalOutputFormat(vertical, category) {
  return `
=== REQUIRED OUTPUT FORMAT ===

Generate the brief with EXACTLY these headers (use literal markdown **Header:**):

**Job Title:**
[Specific ${category} role title]

**Company:**
[Company description - NO project details here]

**Website:**
[Company website]

**Contact Email:**
[Contact email]

**Industry / Vertical:**
${vertical} - ${category}

**Job Type:**
[Contract/Freelance/Full-time/Part-time]

**Role Overview:**
[${category}-specific role description focused on impact and goals]

**About the Project:**
[Detailed project description with ${vertical}-specific context]

**Key Responsibilities:**
[BULLET POINTS - ${category}-specific tasks]

**Requirements & Qualifications:**
[BULLET POINTS - ${vertical}-specific requirements]

**${vertical === 'Graphics & Design' || vertical === 'Video & Animation' ? 'Portfolio Requirements' : 'Technical Requirements'}:**
[Specific ${category} portfolio/technical needs]

**Deliverables:**
[${vertical}-specific deliverables list]

**Tools & Platforms:**
[Required: ... | Preferred: ...]

**Engagement Model:**
[Structure without unnecessary negatives]

**Payment & Compensation:**
[Pricing structure with currency]

**Timeline:**
[Start date, milestones, deadlines]

**Workplace & Logistics:**
[Remote/hybrid/onsite - relevant ${vertical} considerations]

**Bonus Considerations:**
[Nice-to-haves only, no mandatory items]

=== GENERATION RULES ===

1. Use ${vertical}-appropriate terminology throughout
2. Be concise - no redundancy between sections
3. Use bullet points for lists
4. Extract specific details from the transcript
5. Include ${category}-specific evaluation criteria
6. Mention relevant ${vertical} tools and platforms
7. Specify ${vertical}-standard deliverable formats
`;
}

/**
 * Save brief submission to spreadsheet
 */
function saveBriefSubmission(data) {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    let sheet = ss.getSheetByName('BriefSubmissions');

    if (!sheet) {
      sheet = ss.insertSheet('BriefSubmissions');
      sheet.appendRow([
        'BriefID', 'Timestamp', 'AgentEmail', 'AgentName', 'ContactName',
        'ContactEmail', 'Company', 'Vertical', 'Category', 'SubCategory',
        'StandardBrief', 'VerticalBrief', 'SelectedBrief', 'WorkatoEventID', 'Status', 'PurchaseReason'
      ]);
      sheet.getRange(1, 1, 1, 16).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else {
      // Migration: Check if PurchaseReason header exists, if not add it
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (!headers.includes('PurchaseReason')) {
        sheet.getRange(1, headers.length + 1).setValue('PurchaseReason');
      }
    }

    sheet.appendRow([
      data.briefId,
      data.timestamp,
      data.agentEmail,
      data.agentName,
      data.contactName,
      data.contactEmail,
      data.company,
      data.vertical,
      data.category,
      data.subCategory,
      data.standardBrief,
      data.verticalBrief,
      data.selectedBrief || '',
      data.workatoEventId || '',
      data.status,
      data.purchaseReason || ''
    ]);

    console.log('Brief submission saved:', data.briefId);
    return true;
  } catch (e) {
    console.error('Error saving brief submission:', e);
    return false;
  }
}

/**
 * Update brief submission after expert selection
 */
function submitSelectedBrief(briefId, selectedBriefType, editedBriefContent, formData) {
  try {
    // Get the original submission
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('BriefSubmissions');
    const data = sheet.getDataRange().getValues();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === briefId) {
        rowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Brief submission not found: ' + briefId);
    }

    // Determine which brief content to use
    const briefContent = editedBriefContent ||
      (selectedBriefType === 'standard' ? data[rowIndex - 1][10] : data[rowIndex - 1][11]);

    // Send to Workato
    const desQuestionnaire = generateDESQuestionnaire(formData);
    let workatoResult = { eventId: null };
    let workatoError = null;

    try {
      workatoResult = sendToWorkato(formData, briefContent, desQuestionnaire);
    } catch (we) {
      console.warn("Workato submission failed (continuing execution):", we);
      workatoError = we.message;
    }

    // Update the submission record
    sheet.getRange(rowIndex, 13).setValue(selectedBriefType); // SelectedBrief
    sheet.getRange(rowIndex, 14).setValue(workatoResult.eventId || 'ERROR'); // WorkatoEventID
    // If Workato failed, we might still want to mark as submitted locally, or maybe 'SUBMITTED_WITH_ERRORS'
    // For now, keeping 'SUBMITTED' as per standard flow, or maybe just proceed.
    sheet.getRange(rowIndex, 15).setValue('SUBMITTED'); // Status

    // Trigger "AI Talent Lake Finder" Search
    // This is a non-blocking attempt (errors are logged but don't fail the submission)
    const finderResult = triggerFinderSearch(formData, briefContent, briefId);
    if (!finderResult.success) {
      console.warn("Finder search trigger warning:", finderResult.error);
    }

    return {
      success: true,
      briefId: briefId,
      workatoEventId: workatoResult.eventId,
      workatoError: workatoError,
      finderTriggered: finderResult.success,
      finderResults: finderResult.results || [],
      message: 'Brief processed (Workato: ' + (workatoError ? 'Failed' : 'Success') + ', Finder: ' + (finderResult.success ? 'Success' : 'Failed') + ')'
    };

  } catch (e) {
    console.error('Error submitting selected brief:', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get brief submission by ID
 */
function getBriefSubmission(briefId) {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('BriefSubmissions');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === briefId) {
        const submission = {};
        for (let j = 0; j < headers.length; j++) {
          submission[headers[j]] = data[i][j];
        }
        return { success: true, data: submission };
      }
    }

    return { success: false, error: 'Brief not found' };
  } catch (e) {
    console.error('Error getting brief submission:', e);
    return { success: false, error: e.message };
  }
}
