const {HttpsError} = require("firebase-functions/v2/https");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const DEFAULT_BASE_URL = "https://cloud-function-bookpod-festjdz7ga-ey.a.run.app";
const DEFAULT_BUCKET = "bookpod-profile-images";
const DEFAULT_EPOST_SPOTS_URL = "https://www.hfd.co.il/wp-content/plugins/epostList/service.php";

/**
 * Sleep helper (used for retry backoff).
 * @param {number} ms
 * @return {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Best-effort parse of E-post pickup point service response.
 * Their endpoint returns either raw XML or a JSON-string-wrapped XML.
 * @param {string} text
 * @return {string} xml
 */
function normalizeEpostXml(text) {
  if (!text) return "";
  const t = String(text).trim();
  // If it's a JSON string like "\"<?xml ...>\"", unwrap it.
  if (t.startsWith("\"") && t.endsWith("\"")) {
    try {
      const parsed = JSON.parse(t);
      if (typeof parsed === "string") return parsed;
    } catch (e) {
      // fallthrough
    }
  }
  return t;
}

/**
 * Extract CDATA text content for a given tag in a chunk.
 * @param {string} chunk
 * @param {string} tag
 * @return {string}
 */
function extractCdata(chunk, tag) {
  const re = new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[(.*?)\\]\\]>|(.*?))\\s*</${tag}>`, "is");
  const m = re.exec(chunk);
  const v = (m && (m[1] || m[2])) ? String(m[1] || m[2]) : "";
  return v.trim();
}

/**
 * Parse pickup points from E-post XML.
 * @param {string} xml
 * @return {Array<Object>}
 */
function parseEpostPickupPoints(xml) {
  const points = [];
  if (!xml) return points;
  const blocks = xml.match(/<spot_detail>[\s\S]*?<\/spot_detail>/g) || [];
  blocks.forEach((b) => {
    const id = extractCdata(b, "n_code");
    const lat = Number(extractCdata(b, "latitude"));
    const lng = Number(extractCdata(b, "longitude"));
    // Skip invalid coordinates
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    points.push({
      id,
      n_code: id,
      name: extractCdata(b, "name"),
      city: extractCdata(b, "city"),
      street: extractCdata(b, "street"),
      house: extractCdata(b, "house"),
      postalCode: extractCdata(b, "zip_code"),
      type: extractCdata(b, "type"), // Hebrew: "לוקר" / "חנות"
      remarks: extractCdata(b, "remarks"),
      lat,
      lng,
    });
  });
  return points;
}

/**
 * Compute Haversine distance in KM.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @return {number}
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

let _epostCache = {
  fetchedAtMs: 0,
  points: null,
};

/**
 * Fetch and cache E-post pickup points list.
 * @param {number=} ttlMs
 * @return {Promise<Array<Object>>}
 */
async function getEpostPickupPoints(ttlMs = 6 * 60 * 60 * 1000) {
  const now = Date.now();
  if (_epostCache.points && (now - _epostCache.fetchedAtMs) < ttlMs) {
    return _epostCache.points;
  }

  const loadBundled = () => {
    try {
      const bundledPath = path.join(__dirname, "epost-pickup-points.json");
      const raw = fs.readFileSync(bundledPath, "utf8");
      const parsed = JSON.parse(raw);
      const pts = Array.isArray(parsed?.pickupPoints) ? parsed.pickupPoints : [];
      return pts;
    } catch (e) {
      return [];
    }
  };

  try {
    const res = await fetch(DEFAULT_EPOST_SPOTS_URL, {method: "GET"});
    if (!res.ok) {
      // Some origins block datacenter IPs; fall back to bundled dataset.
      const fallback = loadBundled();
      if (fallback.length > 0) {
        _epostCache = {fetchedAtMs: now, points: fallback};
        return fallback;
      }
      throw new HttpsError(
          "internal",
          `Failed to fetch pickup points list: ${res.status} ${res.statusText}`,
      );
    }
    const text = await res.text();
    const xml = normalizeEpostXml(text);
    const points = parseEpostPickupPoints(xml);
    if (!points || points.length === 0) {
      const fallback = loadBundled();
      if (fallback.length > 0) {
        _epostCache = {fetchedAtMs: now, points: fallback};
        return fallback;
      }
    }
    _epostCache = {fetchedAtMs: now, points};
    return points;
  } catch (e) {
    const fallback = loadBundled();
    if (fallback.length > 0) {
      _epostCache = {fetchedAtMs: now, points: fallback};
      return fallback;
    }
    throw e;
  }
}

/**
 * Geocode an address using Nominatim (OpenStreetMap).
 * @param {Object} addr
 * @param {string=} addr.country
 * @param {string=} addr.city
 * @param {string=} addr.address1
 * @param {string=} addr.postalCode
 * @return {Promise<Object|null>} {lat:number, lng:number} or null
 */
async function geocodeAddress(addr) {
  const country = String(addr?.country || "Israel").trim();
  const city = String(addr?.city || "").trim();
  const address1 = String(addr?.address1 || "").trim();
  const postalCode = String(addr?.postalCode || "").trim();

  const q = [address1, city, postalCode, country].filter(Boolean).join(", ");
  if (!q) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);
  // Prefer Israel; if user picks another country we still let it try.
  if (/^israel$/i.test(country) || /^il$/i.test(country)) {
    url.searchParams.set("countrycodes", "il");
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      // Nominatim requires a real UA; keep it generic (do not include secrets).
      "User-Agent": "Shoso/1.0 (pickup points lookup)",
    },
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0];
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {lat, lng};
}

/**
 * Search pickup points near an address.
 * Returns E-post/HFD pickup points (used by BookPod shipping method "Pickup point delivery").
 *
 * @param {Object} params
 * @param {Object} params.address
 * @param {number=} params.limit
 * @return {Promise<Object>} {success:boolean, pickupPoints:Array, message?:string}
 */
async function searchPickupPoints(params) {
  const address = params?.address || {};
  const limit = Math.max(1, Math.min(25, Number(params?.limit || 10)));

  const points = await getEpostPickupPoints();
  const geo = await geocodeAddress(address);

  // Fallback: filter by city if we can't geocode.
  if (!geo) {
    const city = String(address?.city || "").trim();
    const filtered = city ?
      points.filter((p) => String(p.city || "").toLowerCase().includes(city.toLowerCase())) :
      points;
    return {
      success: true,
      pickupPoints: filtered.slice(0, limit).map((p) => ({...p})),
      message: city ? "Geocoding unavailable; returning pickup points filtered by city." :
        "Geocoding unavailable; returning a general pickup points list (first results).",
    };
  }

  const scored = points.map((p) => {
    const d = haversineKm(geo.lat, geo.lng, p.lat, p.lng);
    return {...p, distanceKm: d};
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    success: true,
    pickupPoints: scored.slice(0, limit),
  };
}

/**
 * Reads BookPod configuration from environment variables.
 * @return {{baseUrl: string, userId: (string|undefined), token: (string|undefined), bucket: string}}
 */
function getBookPodConfig() {
  const baseUrl = (process.env.BOOKPOD_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const userId = process.env.BOOKPOD_USER_ID || process.env.BOOKPOD_X_USER_ID;
  const token =
    process.env.BOOKPOD_CUSTOM_TOKEN ||
    process.env.BOOKPOD_TOKEN ||
    process.env.BOOKPOD_X_CUSTOM_TOKEN;
  const bucket = process.env.BOOKPOD_GCS_BUCKET || DEFAULT_BUCKET;

  return {baseUrl, userId, token, bucket};
}

/**
 * Ensures BookPod auth headers are configured server-side.
 * @return {{userId: string, token: string}}
 */
function requireAuthHeaders() {
  const {userId, token} = getBookPodConfig();
  if (!userId) {
    throw new HttpsError(
        "failed-precondition",
        "BookPod user id is not configured. Set BOOKPOD_USER_ID in functions env.",
    );
  }
  if (!token) {
    throw new HttpsError(
        "failed-precondition",
        "BookPod token is not configured. Set BOOKPOD_CUSTOM_TOKEN in functions env.",
    );
  }
  return {userId, token};
}

/**
 * Perform a JSON request against BookPod API with required headers.
 * @param {string} path API path (e.g. /api/v1/books)
 * @param {string} method HTTP method
 * @param {Object=} body Optional JSON body
 * @return {Promise<Object>} Parsed JSON response
 */
async function bookpodJson(path, method, body) {
  const {baseUrl} = getBookPodConfig();
  const {userId, token} = requireAuthHeaders();

  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-custom-token": token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch (e) {
    payload = null;
  }

  if (!res.ok) {
    // Try to capture raw response text for easier debugging (BookPod sometimes
    // returns non-JSON error bodies).
    let rawText = null;
    try {
      rawText = await res.text();
    } catch (e) {
      rawText = null;
    }

    const message =
      payload?.message ||
      payload?.error ||
      `BookPod request failed: ${res.status} ${res.statusText}`;
    const payloadStr = payload ? JSON.stringify(payload, null, 2) : null;
    // Log additional context for debugging in Cloud Logs.
    // eslint-disable-next-line no-console
    console.error("BookPod API error", {
      url,
      method,
      status: res.status,
      payload: payloadStr,
      rawText: rawText ? String(rawText).slice(0, 2000) : null,
    });
    throw new HttpsError("internal", message, {
      status: res.status,
      payload: payloadStr,
      rawText: rawText ? String(rawText).slice(0, 2000) : null,
    });
  }

  // BookPod often returns { success: false, ... } with HTTP 200
  if (payload && payload.success === false) {
    const message = payload.message || "BookPod request failed";
    throw new HttpsError("internal", message, payload);
  }

  return payload;
}

/**
 * Convert an arbitrary string to a safe filename part (lowercase, a-z0-9 and dashes).
 * @param {*} input Any value
 * @return {string} Slugged value
 */
function slugifyFilenamePart(input) {
  const s = String(input || "")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return s || "book";
}

/**
 * Return current YYYYMM using UTC.
 * @return {string}
 */
function yyyymmNow() {
  const d = new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}${mm}`;
}

/**
 * Generate default BookPod PDF filenames according to their convention.
 * @param {{title: string, versionMajor: number, versionMinor: number}} opts
 * @return {{contentFileName: string, coverFileName: string}}
 */
function buildDefaultFilenames({title, versionMajor = 1, versionMinor = 0}) {
  const slug = slugifyFilenamePart(title);
  const yyyymm = yyyymmNow();
  const version = `v${Number(versionMajor) || 1}.${Number(versionMinor) || 0}`;
  return {
    contentFileName: `${slug}_${yyyymm}_${version}.pdf`,
    coverFileName: `${slug}_Cover_${yyyymm}_${version}.pdf`,
  };
}

/**
 * Call BookPod \"generate upload urls\" endpoint.
 * @param {{contentFileName: string, coverFileName: string}} params
 * @return {Promise<Object>}
 */
async function generateUploadUrls({contentFileName, coverFileName}) {
  if (!contentFileName || !coverFileName) {
    throw new HttpsError(
        "invalid-argument",
        "contentFileName and coverFileName are required",
    );
  }
  return await bookpodJson("/api/v1/books/upload-url", "POST", {
    contentFileName,
    coverFileName,
  });
}

/**
 * Upload a PDF to a BookPod signed upload URL by fetching a source URL and streaming it.
 * @param {{uploadUrl: string, sourceUrl: string}} params
 * @return {Promise<{success: boolean}>}
 */
async function uploadPdfFromUrl({uploadUrl, sourceUrl}) {
  if (!uploadUrl || !sourceUrl) {
    throw new HttpsError("invalid-argument", "uploadUrl and sourceUrl are required");
  }

  // Download from source (your Firebase Storage / CDN) and stream to BookPod signed URL.
  const src = await fetch(sourceUrl);
  if (!src.ok) {
    throw new HttpsError(
        "invalid-argument",
        `Failed to fetch source PDF: ${src.status} ${src.statusText}`,
    );
  }

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {"Content-Type": "application/pdf"},
    body: src.body,
  });

  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new HttpsError(
        "internal",
        `BookPod upload failed: ${putRes.status} ${putRes.statusText}`,
        {body: txt.slice(0, 2000)},
    );
  }

  return {success: true};
}

/**
 * Create a BookPod book record.
 * @param {Object} bookPayload Book metadata per BookPod docs.
 * @return {Promise<Object>}
 */
async function createBook(bookPayload) {
  if (!bookPayload || typeof bookPayload !== "object") {
    throw new HttpsError("invalid-argument", "Book payload is required");
  }
  return await bookpodJson("/api/v1/books", "POST", bookPayload);
}

/**
 * BookPod sometimes needs a few seconds after upload before the uploaded PDFs
 * become readable/processable via their internal pipeline. In that window,
 * createBook can fail with messages like:
 * - "Error processing contentUrl."
 * - "Error processing coverUrl."
 *
 * This helper retries createBook with a short backoff for those cases.
 *
 * @param {Object} bookPayload
 * @param {Object=} opts
 * @param {number=} opts.attempts
 * @param {number=} opts.baseDelayMs
 * @return {Promise<Object>}
 */
async function createBookWithRetries(bookPayload, opts = {}) {
  // BookPod can take some time until newly uploaded PDFs are fully
  // processed and accessible via contentUrl/coverUrl. Use a relatively
  // generous retry window by default.
  const attempts = Number(opts.attempts || 10);
  const baseDelayMs = Number(opts.baseDelayMs || 3000);

  let lastErr = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await createBook(bookPayload);
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || "");
      const retryable = /Error processing (contentUrl|coverUrl)\\./i.test(msg);
      if (!retryable || i === attempts) throw e;
      // eslint-disable-next-line no-console
      console.warn(`BookPod createBook retry ${i}/${attempts} after error:`, msg);
      await sleep(baseDelayMs * i);
    }
  }
  throw lastErr || new HttpsError("internal", "createBook failed after retries");
}

/**
 * Create a BookPod order.
 * @param {Object} orderPayload Order payload per BookPod docs.
 * @return {Promise<Object>}
 */
async function createOrder(orderPayload) {
  if (!orderPayload || typeof orderPayload !== "object") {
    throw new HttpsError("invalid-argument", "Order payload is required");
  }

  if (!orderPayload.shippingDetails) {
    throw new HttpsError("invalid-argument", "shippingDetails is required");
  }
  if (!Array.isArray(orderPayload.items) || orderPayload.items.length === 0) {
    throw new HttpsError("invalid-argument", "items array is required and must not be empty");
  }
  if (typeof orderPayload.totalprice !== "number") {
    throw new HttpsError("invalid-argument", "totalprice is required and must be a number");
  }
  if (!orderPayload.invoice || typeof orderPayload.invoice !== "string") {
    throw new HttpsError("invalid-argument", "invoice is required and must be a string URL");
  }

  return await bookpodJson("/api/v1/orders", "POST", orderPayload);
}

/**
 * Convenience orchestrator (prep): create upload URLs, upload PDFs from URLs,
 * then create a BookPod book record.
 *
 * NOTE: This does NOT create an order.
 */
async function createBookFromPdfUrls({
  title,
  author,
  category,
  subcategory,
  keywords,
  description,
  price,
  printcolor,
  sheettype,
  laminationtype,
  finishtype,
  readingdirection,
  width,
  height,
  bleed,
  status,
  contentSourceUrl,
  coverSourceUrl,
  contentFileName,
  coverFileName,
  versionMajor,
  versionMinor,
}) {
  if (!contentSourceUrl || !coverSourceUrl) {
    throw new HttpsError("invalid-argument", "contentSourceUrl and coverSourceUrl are required");
  }

  const {bucket} = getBookPodConfig();
  const names = (contentFileName && coverFileName) ?
    {contentFileName, coverFileName} :
    buildDefaultFilenames({title, versionMajor, versionMinor});

  const uploadUrls = await generateUploadUrls(names);

  await uploadPdfFromUrl({uploadUrl: uploadUrls.contentUploadUrl, sourceUrl: contentSourceUrl});
  await uploadPdfFromUrl({uploadUrl: uploadUrls.coverUploadUrl, sourceUrl: coverSourceUrl});

  // Prefer any canonical URLs returned by BookPod; fall back to constructing
  // a gs:// URL using the configured bucket + file names.
  const contentUrl =
    uploadUrls.contentUrl ||
    `gs://${bucket}/${uploadUrls.contentFileName || names.contentFileName}`;
  const coverUrl =
    uploadUrls.coverUrl ||
    `gs://${bucket}/${uploadUrls.coverFileName || names.coverFileName}`;

  const bookPayload = {
    title,
    author,
    category,
    subcategory,
    keywords,
    description,
    price,
    printcolor,
    sheettype,
    laminationtype,
    finishtype,
    readingdirection,
    width,
    height,
    bleed: Boolean(bleed),
    status: Boolean(status),
    contentUrl,
    coverUrl,
  };

  // Remove undefined keys (BookPod can be strict)
  Object.keys(bookPayload).forEach((k) => {
    if (bookPayload[k] === undefined) delete bookPayload[k];
    if (bookPayload[k] === null) delete bookPayload[k];
    if (Array.isArray(bookPayload[k]) && bookPayload[k].length === 0) delete bookPayload[k];
    if (typeof bookPayload[k] === "string" && !bookPayload[k].trim()) delete bookPayload[k];
  });

  const created = await createBookWithRetries(bookPayload);
  return {
    success: true,
    upload: {
      contentFileName: uploadUrls.contentFileName || names.contentFileName,
      coverFileName: uploadUrls.coverFileName || names.coverFileName,
      contentUrl,
      coverUrl,
    },
    book: created,
  };
}

/**
 * BookPod shipping options (per BookPod CreateOrder docs).
 * BookPod does not expose (in the public docs) a dedicated "rates" endpoint,
 * so we return the known method ids + the currently documented company id.
 *
 * @return {{success: boolean, shippingCompanies: Array, shippingMethods: Array}}
 */
function getShippingOptions() {
  return {
    success: true,
    shippingCompanies: [
      {id: 6, name: "HFD"},
    ],
    shippingMethods: [
      {id: 1, name: "Pickup point delivery"},
      {id: 2, name: "Home delivery"},
      {id: 3, name: "Factory self-pickup"},
    ],
    note: "BookPod API docs do not specify a shipping-rates endpoint; prices are not included here.",
  };
}

module.exports = {
  getBookPodConfig,
  buildDefaultFilenames,
  generateUploadUrls,
  uploadPdfFromUrl,
  createBook,
  createBookWithRetries,
  createOrder,
  createBookFromPdfUrls,
  getShippingOptions,
  searchPickupPoints,
};


