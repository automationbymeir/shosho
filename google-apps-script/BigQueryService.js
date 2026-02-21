/**
 * BigQueryService.gs
 * Handles syncing category data from BigQuery for AI mapping
 */

const BQ_PROJECT_ID_PROPERTY = 'BQ_PROJECT_ID';
const CATEGORY_MAP_SHEET_NAME = "Category_BQ_Map";
// Use the same spreadsheet for dropdowns and category mapping
const MAPPING_SHEET_ID = "1TIt779EIG58oTdT-TL-6GnsrkfDOc4AZQghwHPWYgZQ";

/**
 * Sync categories from BigQuery to a Google Sheet
 * to enable AI-powered category mapping.
 */
function syncCategoriesFromBigQuery() {
    const projectId = PropertiesService.getScriptProperties().getProperty(BQ_PROJECT_ID_PROPERTY);

    if (!projectId) {
        console.error(`Script Property '${BQ_PROJECT_ID_PROPERTY}' is not set.`);
        return { success: false, error: "BigQuery Project ID not configured." };
    }

    const sql = `
  with categories as (
  select c.id  vertical_id,c.name  vertical_name,sc.id  sc_id,sc.name sc_name,sc.cached_slug sc_slug, date(sc.created_at) sc_created,
  sc.available_to_sellers, 
  nsc.id nsc_id,nsc.name nsc_name,date(nsc.created_at) nsc_created, nsc.cached_slug nsc_slug,
  sc.visible sc_visible,nsc.visible nsc_visible,sc.nested_required
  from \`fiverr-bigquery.dwh.categories\`  c
  join \`fiverr-bigquery.dwh.sub_categories\` sc on sc.category_id =c.id
  join \`fiverr-bigquery.dwh.nested_sub_categories\` nsc on nsc.parent_id =sc.id and nsc.visible ='true'
  where c.show_in_menus  =1
union all
  select c.id  vertical_id,c.name  vertical_name,sc.id  sc_id,sc.name sc_name,sc.cached_slug sc_slug,date(sc.created_at) sc_created,
  sc.available_to_sellers,
  -1 nsc_id,"" nsc_name , null nsc_created,null nsc_slug,
  sc.visible sc_visible,"" nsc_visible,sc.nested_required
  from \`fiverr-bigquery.dwh.categories\`  c
  join \`fiverr-bigquery.dwh.sub_categories\` sc on sc.category_id =c.id
  where c.show_in_menus  =1

), 
gigs as (
  select gig_id,gi.attributes.category.sub_category_id sc_id, case when gi.attributes.category.nested_sub_category_id in (select id from \`fiverr-bigquery.dwh.nested_sub_categories\` where parent_id=gi.attributes.category.sub_category_id) then gi.attributes.category.nested_sub_category_id  else -1 end nsc_id
 from \`fiverr-bigquery.dwh.gig_id\` gi 
  where date(gi._partitiontime)=current_date-2
  and gi.attributes.status='approved'
  )

select 
  c.* ,
  count(distinct g.gig_id) gigs, 
  case when c.nsc_id=-1 then concat( c.vertical_name," | ",c.sc_name) else concat( c.vertical_name," | ", c.sc_name ," | ",nsc_name) end full_path,
  case when c.nsc_id=-1 then c.sc_name else c.nsc_name end leaf_name,
  case when c.nsc_id=-1 then c.sc_name else concat( c.sc_name ," | ",nsc_name) end leaf_path,
  case when c.nsc_id=-1 then c.sc_id else c.nsc_id end leaf_id

from categories c
left join gigs g on g.sc_id=c.sc_id and g.nsc_id=c.nsc_id
group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
  `;

    try {
        const request = {
            query: sql,
            useLegacySql: false
        };

        console.log(`Running BigQuery query on project: ${projectId}...`);
        const queryResults = BigQuery.Jobs.query(request, projectId);
        const jobId = queryResults.jobReference.jobId;

        // Wait for completion if needed (though Jobs.query is synchronous primarily, large queries might need status check loop if using insert job)
        // BigQuery.Jobs.query is synchronous and waits a limited time. For larger queries, insert job is better.
        // Given this query joins large tables, let's play safe and check if jobComplete is true.

        let rows = [];
        let pageToken = null;

        if (!queryResults.jobComplete) {
            // Ideally implement polling here, but for now assuming it completes or we use runQueryJob pattern if needed
            // Let's assume Jobs.query handles it generally for this size of result or throws timeout
            console.log("Query not complete immediately. Fetching results...");
            // Fetch results loop
            do {
                const results = BigQuery.Jobs.getQueryResults(projectId, jobId, { pageToken: pageToken });
                if (results.rows) {
                    rows = rows.concat(results.rows);
                }
                pageToken = results.pageToken;
            } while (pageToken);

        } else {
            rows = queryResults.rows || [];
            // Handle pagination for immediate complete
            while (queryResults.pageToken) {
                const nextResults = BigQuery.Jobs.getQueryResults(projectId, jobId, { pageToken: queryResults.pageToken });
                if (nextResults.rows) rows = rows.concat(nextResults.rows);
                queryResults.pageToken = nextResults.pageToken;
            }
        }

        if (!rows || rows.length === 0) {
            console.log("No rows returned from BigQuery.");
            return { success: true, message: "Query returned no data." };
        }

        // Convert BQ rows to 2D array
        // Schema: 14 cols from 'categories' (c.*) + gigs (15) + full_path (16) + leaf_name (17) + leaf_path (18) + leaf_id (19) based on SQL
        // Actually relying on schema order is risky. Let's inspect schema.
        const schema = queryResults.schema.fields;
        const headers = schema.map(f => f.name);

        const values = [headers];
        rows.forEach(row => {
            const rowData = row.f.map(col => col.v);
            values.push(rowData);
        });

        // Write to Sheet
        const ss = SpreadsheetApp.openById(MAPPING_SHEET_ID);
        let sheet = ss.getSheetByName(CATEGORY_MAP_SHEET_NAME);
        if (!sheet) {
            sheet = ss.insertSheet(CATEGORY_MAP_SHEET_NAME);
        }

        sheet.clear();
        if (values.length > 0) {
            sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
        }

        console.log(`Synced ${values.length - 1} categories to '${CATEGORY_MAP_SHEET_NAME}'.`);
        return { success: true, count: values.length - 1 };

    } catch (e) {
        console.error("BigQuery Sync Error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Retrieves the full category paths for AI usage
 * Reads from the synced sheet to avoid repeated BQ calls
 */
function getCategoryPathsForAI() {
    try {
        const ss = SpreadsheetApp.openById(MAPPING_SHEET_ID);
        const sheet = ss.getSheetByName(CATEGORY_MAP_SHEET_NAME);

        if (!sheet) {
            console.warn("Category Map sheet not found. Run syncCategoriesFromBigQuery first.");
            return [];
        }

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return [];

        // Find 'full_path' column index
        const headers = data[0];
        const fpIndex = headers.indexOf('full_path');
        if (fpIndex === -1) return [];

        // Map entries
        return data.slice(1).map(row => row[fpIndex]).filter(p => p);

    } catch (e) {
        console.error("Error reading category paths:", e);
        return [];
    }
}
