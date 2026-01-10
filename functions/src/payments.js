const admin = require("firebase-admin");

const PERSONAL_DETAILS_ALLOWED_KEYS = [
  "fullName",
  "email",
  "phone",
  "country",
  "city",
  "address1",
  "address2",
  "postalCode",
  "company",
  "vatNumber",
];

/**
 * Normalize a string value: trim, cap length, return null if empty/invalid.
 * @param {*} value Input value
 * @param {number} maxLen Maximum length
 * @return {string|null} Normalized string or null
 */
function normalizeString(value, maxLen = 200) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

/**
 * Whitelist and normalize personal details keys.
 * @param {*} input Raw personal details payload
 * @return {Object} Sanitized personal details
 */
function sanitizePersonalDetails(input) {
  const raw = input && typeof input === "object" ? input : {};
  const sanitized = {};
  for (const key of PERSONAL_DETAILS_ALLOWED_KEYS) {
    const val = normalizeString(raw[key], 300);
    if (val !== null) sanitized[key] = val;
  }
  return sanitized;
}

/**
 * Fetch personal details for user (if any).
 * @param {string} userId Firebase user id
 * @return {Promise<Object>} Result payload
 */
async function getPersonalDetails(userId) {
  const db = admin.firestore();
  const doc = await db.collection("users").doc(userId).get();
  const data = doc.exists ? doc.data() : {};
  return {
    success: true,
    personalDetails: (data && data.personalDetails) || {},
    updatedAt: data?.personalDetailsUpdatedAt?.toDate?.().toISOString?.() || null,
  };
}

/**
 * Update personal details for user (merge).
 * @param {string} userId Firebase user id
 * @param {*} personalDetails Personal details payload
 * @return {Promise<Object>} Result payload
 */
async function updatePersonalDetails(userId, personalDetails) {
  const db = admin.firestore();
  const sanitized = sanitizePersonalDetails(personalDetails);

  // If the user didn't provide email explicitly, keep it untouched.
  // (Client can send it, but it's optional.)
  const update = {
    personalDetails: sanitized,
    personalDetailsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(userId).set(update, {merge: true});
  return {success: true};
}

/**
 * List purchases (most recent first).
 * @param {string} userId Firebase user id
 * @param {number} limit Maximum number of purchases to return
 * @return {Promise<Object>} Result payload
 */
async function listPurchases(userId, limit = 20) {
  const db = admin.firestore();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

  const snap = await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .orderBy("createdAt", "desc")
      .limit(safeLimit)
      .get();

  const purchases = [];
  snap.forEach((doc) => {
    const p = doc.data() || {};
    purchases.push({
      id: doc.id,
      status: p.status || "unknown",
      provider: p.provider || null,
      currency: p.currency || null,
      amount: typeof p.amount === "number" ? p.amount : null, // store cents/lowest unit
      description: p.description || null,
      projectId: p.projectId || null,
      projectTitle: p.projectTitle || null,
      meta: p.meta || null,
      createdAt: p.createdAt?.toDate?.().toISOString?.() || null,
    });
  });

  return {success: true, purchases};
}

/**
 * Optional helper: create a purchase draft record (preparation for Stripe/etc.)
 * Not required for checkout, but useful to verify the UI end-to-end.
 * @param {string} userId Firebase user id
 * @param {Object} draft Draft purchase payload
 * @return {Promise<Object>} Result payload
 */
async function createPurchaseDraft(userId, draft) {
  const db = admin.firestore();
  const now = Date.now();
  const docId = `purchase_${now}`;

  const payload = draft && typeof draft === "object" ? draft : {};
  const purchaseDoc = {
    status: "draft",
    provider: payload.provider || "manual",
    currency: normalizeString(payload.currency, 10) || "usd",
    amount: typeof payload.amount === "number" ? payload.amount : null,
    description: normalizeString(payload.description, 300) || "Draft purchase",
    projectId: normalizeString(payload.projectId, 200) || null,
    projectTitle: normalizeString(payload.projectTitle, 200) || null,
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .doc(docId)
      .set(purchaseDoc, {merge: false});

  return {success: true, purchaseId: docId};
}

module.exports = {
  getPersonalDetails,
  updatePersonalDetails,
  listPurchases,
  createPurchaseDraft,
};


