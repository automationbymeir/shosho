/**
 * VerticalService.gs
 * Handles vertical/category data fetching and dynamic question loading
 */

const VERTICAL_CATEGORIES_SHEET_ID = "1TIt779EIG58oTdT-TL-6GnsrkfDOc4AZQghwHPWYgZQ";
const TECH_QUESTIONS_SHEET_ID = "1xp47bSnKFfwjIlTdWnMOXnriZn7My852KejNJe1f_1c";
const GD_VA_QUESTIONS_DOC_ID = "1T9wWjSGeoMHgRTHKIhabZDSIKtybo5w5t8B93N3rtos";
const DM_QUESTIONS_DOC_ID = "11Nx9CcqZzWFn5Zye6gaeRkd1Nxc6uU_SeRWxjAmluRE";

/**
 * Get all verticals with their categories and subcategories for the selection UI
 * Returns hierarchical structure for rendering the selection tree
 */
function getVerticalHierarchy() {
  try {
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('VerticalCategories');

    if (!sheet) {
      console.error('VerticalCategories sheet not found');
      return { success: false, error: 'Configuration sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const hierarchy = {};

    // Build hierarchical structure
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const vertical = row[0];
      const category = row[1];
      const subCategory = row[2] || null;
      const questionsSource = row[3];

      if (!hierarchy[vertical]) {
        hierarchy[vertical] = { categories: {} };
      }

      if (!hierarchy[vertical].categories[category]) {
        hierarchy[vertical].categories[category] = {
          subCategories: [],
          questionsSource: questionsSource
        };
      }

      if (subCategory && subCategory !== '-') {
        hierarchy[vertical].categories[category].subCategories.push({
          name: subCategory,
          questionsSource: questionsSource
        });
      }
    }

    return { success: true, data: hierarchy };
  } catch (e) {
    console.error('Error fetching vertical hierarchy:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Search verticals, categories, and subcategories
 * @param {string} query - Search query
 * @returns {Array} Matching results with full path
 */
function searchVerticals(query) {
  const hierarchyResult = getVerticalHierarchy();
  if (!hierarchyResult.success) return [];

  const hierarchy = hierarchyResult.data;
  const results = [];
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) return [];

  for (const [vertical, verticalData] of Object.entries(hierarchy)) {
    // Check vertical name
    if (vertical.toLowerCase().includes(queryLower)) {
      results.push({
        type: 'vertical',
        vertical: vertical,
        category: null,
        subCategory: null,
        displayText: vertical
      });
    }

    for (const [category, categoryData] of Object.entries(verticalData.categories)) {
      // Check category name
      if (category.toLowerCase().includes(queryLower)) {
        results.push({
          type: 'category',
          vertical: vertical,
          category: category,
          subCategory: null,
          displayText: `${vertical} > ${category}`
        });
      }

      // Check subcategories
      for (const subCat of categoryData.subCategories) {
        if (subCat.name.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'subcategory',
            vertical: vertical,
            category: category,
            subCategory: subCat.name,
            displayText: `${vertical} > ${category} > ${subCat.name}`
          });
        }
      }
    }
  }

  return results.slice(0, 20); // Limit results
}

/**
 * Get dynamic questions for a specific vertical/category/subcategory
 * Parses questions from either spreadsheet or Google Doc based on source
 */
function getDynamicQuestions(vertical, category, subCategory) {
  try {
    // Get the questions source from VerticalCategories
    const ss = SpreadsheetApp.openById(VERTICAL_CATEGORIES_SHEET_ID);
    const sheet = ss.getSheetByName('VerticalCategories');
    const data = sheet.getDataRange().getValues();



    let exactMatchSource = null;
    let categoryMatchSource = null;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Match Vertical and Category
      if (row[0] === vertical && row[1] === category) {
        const rowSub = row[2];
        const rowSource = row[3];

        // 1. Check for Exact SubCategory Match
        if (subCategory && (rowSub === subCategory)) {
          if (rowSource) {
            exactMatchSource = rowSource;
            break; // Found exact match, stop looking
          }
        }

        // 2. Capture Category Level Match (empty subcategory or '-')
        // We capture the first one we find as a fallback
        if ((!rowSub || rowSub === ' -' || rowSub === '-') && !categoryMatchSource) {
          if (rowSource) {
            categoryMatchSource = rowSource;
          }
        }
      }
    }

    // Use exact match if found, otherwise use category fallback
    const questionsSource = exactMatchSource || categoryMatchSource;

    if (!questionsSource) {
      console.warn(`No questions found for ${vertical} > ${category} > ${subCategory}`);
      return { success: false, error: 'Questions source not found for this selection (and no category default found)' };
    }

    // Parse questions source and fetch questions
    if (questionsSource.startsWith('SPREADSHEET:')) {
      return getQuestionsFromSpreadsheet(questionsSource);
    } else if (questionsSource.startsWith('DOC:')) {
      return getQuestionsFromDoc(questionsSource);
    }

    return { success: false, error: 'Unknown questions source format' };
  } catch (e) {
    console.error('Error getting dynamic questions:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Parse questions from a spreadsheet tab
 * Format: SPREADSHEET:spreadsheetId:tabName
 */
function getQuestionsFromSpreadsheet(source) {
  try {
    const parts = source.replace('SPREADSHEET:', '').split(':');
    const spreadsheetId = parts[0];
    const tabName = parts[1];

    const ss = SpreadsheetApp.openById(TECH_QUESTIONS_SHEET_ID);
    const sheet = ss.getSheetByName(tabName);

    if (!sheet) {
      // Try to find a sheet that contains the tab name
      const sheets = ss.getSheets();
      for (const s of sheets) {
        if (s.getName().toLowerCase().includes(tabName.toLowerCase())) {
          return parseSpreadsheetQuestions(s);
        }
      }
      return { success: false, error: `Tab "${tabName}" not found` };
    }

    return parseSpreadsheetQuestions(sheet);
  } catch (e) {
    console.error('Error parsing spreadsheet questions:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Parse a spreadsheet tab into structured questions
 */
function parseSpreadsheetQuestions(sheet) {
  const data = sheet.getDataRange().getValues();
  const questions = [];
  let currentSection = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const cellA = String(row[0] || '').trim();
    const cellB = String(row[1] || '').trim();

    // Check if this is a section header (e.g., "1. Project Overview")
    if (cellA && /^\d+\.\s/.test(cellA)) {
      currentSection = {
        title: cellA,
        questions: [],
        checkboxItems: []
      };
      questions.push(currentSection);
      continue;
    }

    // Check if this is a checkbox item (column A has a checkbox indicator)
    if (cellA === '☐' || cellA === '□' || cellA === 'FALSE' || cellA === false) {
      if (currentSection && cellB) {
        currentSection.checkboxItems.push({
          label: cellB,
          type: 'checkbox',
          checked: false
        });
      }
      continue;
    }

    // Check if this is a regular question
    if (cellA && !cellA.startsWith('☐') && cellA.length > 10) {
      if (currentSection) {
        currentSection.questions.push({
          text: cellA,
          type: 'text',
          answer: ''
        });
      }
    }
  }

  return { success: true, data: questions };
}

/**
 * Parse questions from a Google Doc
 * Format: DOC:docId:sectionName
 */
function getQuestionsFromDoc(source) {
  try {
    const parts = source.replace('DOC:', '').split(':');
    const docId = parts[0];
    const sectionName = parts[1];

    let actualDocId = docId;
    if (docId.length < 20) {
      // It's a reference, map to actual ID
      if (docId.includes('1T9wWj')) actualDocId = GD_VA_QUESTIONS_DOC_ID;
      else if (docId.includes('11Nx9C')) actualDocId = DM_QUESTIONS_DOC_ID;
    }

    const doc = DocumentApp.openById(actualDocId);
    const body = doc.getBody();
    const text = body.getText();

    return parseDocQuestions(text, sectionName);
  } catch (e) {
    console.error('Error parsing doc questions:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Parse a Google Doc into structured questions for a specific section
 */
function parseDocQuestions(docText, sectionName) {
  const lines = docText.split('\n');
  const questions = [];
  let currentSection = null;
  let inTargetSection = false;
  let foundSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this is a main section header (e.g., "Graphics & Design" or "1. Growth Marketing Strategist")
    const isMainHeader = /^(\d+\.\s)?[A-Z]/.test(line) && line.length < 100 && !line.includes('?');

    if (isMainHeader) {
      // Check if we're entering the target section
      if (line.toLowerCase().includes(sectionName.toLowerCase())) {
        inTargetSection = true;
        foundSection = true;
        currentSection = {
          title: line,
          questions: []
        };
        questions.push(currentSection);
        continue;
      } else if (inTargetSection && foundSection) {
        // We've moved past the target section
        break;
      }
    }

    // If we're in the target section, collect questions
    if (inTargetSection) {
      // Check if this is a subsection header
      if (/^\d+\.\s/.test(line) && !line.includes('?')) {
        currentSection = {
          title: line,
          questions: []
        };
        questions.push(currentSection);
        continue;
      }

      // Check if this is a numbered question
      if (/^\d+\.\s/.test(line) && line.includes('?')) {
        if (currentSection) {
          currentSection.questions.push({
            text: line,
            type: 'text',
            answer: ''
          });
        }
        continue;
      }

      // Check if this is a question without number
      if (line.includes('?') && line.length > 15) {
        if (currentSection) {
          currentSection.questions.push({
            text: line,
            type: 'text',
            answer: ''
          });
        }
      }

      // Check for bullet/checkbox items
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('☐')) {
        if (currentSection) {
          currentSection.questions.push({
            text: line.replace(/^[•\-☐]\s*/, ''),
            type: 'checkbox',
            checked: false
          });
        }
      }
    }
  }

  // If no specific section found, return all questions
  if (!foundSection) {
    return parseAllDocQuestions(docText);
  }

  return { success: true, data: questions };
}

/**
 * Parse all questions from a doc when no specific section is targeted
 */
function parseAllDocQuestions(docText) {
  const lines = docText.split('\n');
  const questions = [];
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Section headers
    if (/^\d+\.\s[A-Z]/.test(trimmed) && !trimmed.includes('?')) {
      currentSection = { title: trimmed, questions: [] };
      questions.push(currentSection);
      continue;
    }

    // Questions
    if (trimmed.includes('?') && currentSection) {
      currentSection.questions.push({
        text: trimmed.replace(/^\d+\.\s*/, ''),
        type: 'text',
        answer: ''
      });
    }
  }

  return { success: true, data: questions };
}
