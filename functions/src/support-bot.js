/**
 * Shoso Support Bot + Human escalation
 *
 * - AI answers questions about app functionality.
 * - Escalation creates a support ticket and emails service@automationbymeir.com.
 * - Inbound agent replies can be posted to a webhook and will appear in chat.
 */

const admin = require("firebase-admin");
const OpenAI = require("openai");
const {FieldValue} = require("firebase-admin/firestore");

let nodemailer = null;
try {
  // Optional dependency (configured in functions/package.json)
  // eslint-disable-next-line global-require
  nodemailer = require("nodemailer");
} catch (e) {
  nodemailer = null;
}

const SUPPORT_EMAIL = "service@automationbymeir.com";

const APP_KNOWLEDGE_BASE = `
You are the customer support assistant for Shoso (Photo Book Creator).
Your job is to help users understand the product and complete tasks in the app.

High-level app overview:
- Web app that lets users sign in with Google.
- Users select photos from Google Photos (Google Photos Picker).
- Users choose a template, then build a photo book (cover/pages/back cover).
- There is an AI-powered "Memory Director" mode that detects a story (chapters) and can generate captions.
- The app can generate:
  - A Google Slides presentation-based photobook.
  - A print-ready PDF for Memory Director.
- Users can save/load projects (albums) to their profile.
- There is a Profile section (saved albums, purchases/prep, personal details).
- There is a "Design Inspiration" search feature that returns design trends + color palette ideas.
- There is BookPod printing preparation:
  - Book settings and optional delivery/pickup-point search.
  - Creating BookPod book/order is partially implemented; some checkout pieces may be marked as prep/coming soon.

Key flows users often need help with:
- Sign in with Google.
- Select photos (Open Google Photos).
- Choose a template or open Memory Director.
- Generate the book (either Slides-based book or print-ready PDF).
- Export PDF / download / send to printing (where enabled).
- Save and load albums.
- Update profile details.

Support behavior rules:
- Be precise and product-specific.
- If user asks "how do I" questions: give step-by-step instructions.
- If user is lost: offer a guided walkthrough with numbered steps.
- If user asks about payments/printing features marked as prep:
  explain what works now and what is not enabled yet.
- If user asks something you cannot know (account-specific, errors, order status):
  ask for minimal context and offer to escalate to a human agent.

Human escalation:
- You must always offer the option to talk to a human agent.
- When escalation is requested, tell the user: "A human agent may take up to 24 hours to reply".
`;

/**
 * Initialize OpenAI client.
 * @return {OpenAI} OpenAI client
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
        "OPENAI_API_KEY not configured. Add it to Firebase secrets or functions/.env for local development.",
    );
  }
  return new OpenAI({apiKey});
}

/**
 * Normalize a string: trim, cap length, null if empty/invalid.
 * @param {*} value
 * @param {number=} maxLen
 * @return {string|null}
 */
function normalizeString(value, maxLen = 5000) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

/**
 * Build a human-friendly support ticket id.
 * @return {string}
 */
function buildTicketId() {
  // Human-friendly ticket id.
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `t_${t}_${r}`;
}

/**
 * Append a message to a support session.
 * @param {string} sessionId
 * @param {string} role user|assistant|agent
 * @param {string} text
 * @param {Object=} extra
 * @return {Promise<void>}
 */
async function appendMessage(sessionId, role, text, extra = {}) {
  const db = admin.firestore();
  const safeSessionId = normalizeString(sessionId, 200);
  const safeRole = normalizeString(role, 40);
  const safeText = normalizeString(text, 8000);

  if (!safeSessionId || !safeRole || !safeText) return;

  await db
      .collection("supportSessions")
      .doc(safeSessionId)
      .set(
          {
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          {merge: true},
      );

  await db
      .collection("supportSessions")
      .doc(safeSessionId)
      .collection("messages")
      .add({
        role: safeRole,
        text: safeText,
        createdAt: FieldValue.serverTimestamp(),
        ...extra,
      });
}

/**
 * Get the last N messages for a session, chronologically.
 * @param {string} sessionId
 * @param {number=} limit
 * @return {Promise<Array<{role:string,text:string,createdAtMs:number}>>}
 */
async function getRecentMessages(sessionId, limit = 12) {
  const db = admin.firestore();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 30));

  const snap = await db
      .collection("supportSessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(safeLimit)
      .get();

  const msgs = [];
  snap.forEach((doc) => {
    const m = doc.data() || {};
    msgs.push({
      role: m.role || "assistant",
      text: m.text || "",
      createdAtMs: m.createdAt?.toMillis?.() || 0,
    });
  });

  // Reverse to chronological
  msgs.sort((a, b) => a.createdAtMs - b.createdAtMs);
  return msgs;
}

/**
 * Produce a short getting-started walkthrough.
 * @return {string}
 */
function buildWalkthrough() {
  return [
    "Here’s a quick guided walkthrough of Shoso:",
    "1) Sign in with Google.",
    "2) Choose a template (or choose Memory Director for AI story mode).",
    "3) Open Google Photos and select pictures.",
    "4) Build your book (cover/pages/back cover) — use Auto-Arrange if you want a fast layout.",
    "5) Generate your book (Slides-based) or generate a print-ready PDF (Memory Director).",
    "6) Download/export PDF and (if enabled) proceed to printing options.",
    "7) Save your album so you can load it later from Profile.",
    "\nIf you tell me what you want to do (e.g. “make a book from an album”",
    "or “print a PDF”), I’ll guide you step-by-step.",
    "\nIf you want a human, you can choose “Talk to an agent” (reply may take up to 24 hours).",
  ].join("\n");
}

/**
 * Handle chat request (AI response + store transcript).
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.message
 * @param {string=} params.pageUrl
 * @return {Promise<Object>}
 */
async function chat({sessionId, message, pageUrl}) {
  const safeSessionId = normalizeString(sessionId, 200);
  const userMessage = normalizeString(message, 2000);

  if (!safeSessionId) {
    return {success: false, error: "sessionId is required"};
  }
  if (!userMessage) {
    return {success: false, error: "message is required"};
  }

  await appendMessage(safeSessionId, "user", userMessage, {
    pageUrl: normalizeString(pageUrl, 500) || null,
  });

  // Simple shortcut intents
  if (/^(help|walk\s*me\s*through|tour|getting started|start)$/i.test(userMessage)) {
    const reply = buildWalkthrough();
    await appendMessage(safeSessionId, "assistant", reply);
    return {success: true, reply};
  }

  const openai = getOpenAIClient();
  const history = await getRecentMessages(safeSessionId, 14);

  const messages = [
    {
      role: "system",
      content:
        APP_KNOWLEDGE_BASE +
        "\nAlways keep answers concise, step-based when needed, and ask clarifying questions only when essential.",
    },
  ];

  // Convert Firestore history to OpenAI format
  history.forEach((m) => {
    const role = m.role === "user" ? "user" : (m.role === "agent" ? "assistant" : "assistant");
    messages.push({role, content: String(m.text || "")});
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.3,
    max_tokens: 700,
  });

  const reply = response?.choices?.[0]?.message?.content ?
    String(response.choices[0].message.content).trim() :
    "I’m not sure I understood—can you rephrase your question?";

  await appendMessage(safeSessionId, "assistant", reply);

  return {success: true, reply};
}

/**
 * Create a nodemailer transporter if SMTP env is configured.
 * @return {*|null}
 */
function getSupportTransporter() {
  if (!nodemailer) return null;

  const host = process.env.SUPPORT_SMTP_HOST;
  const port = Number(process.env.SUPPORT_SMTP_PORT || 587);
  const user = process.env.SUPPORT_SMTP_USER;
  const pass = process.env.SUPPORT_SMTP_PASS;

  if (!host || !user || !pass) return null;

  const secure = String(process.env.SUPPORT_SMTP_SECURE || "").toLowerCase() === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {user, pass},
  });
}

/**
 * Send the support ticket email to SUPPORT_EMAIL.
 * @param {Object} params
 * @param {string} params.subject
 * @param {string} params.text
 * @return {Promise<{sent:boolean}>}
 */
async function sendSupportEmail({subject, text}) {
  const transporter = getSupportTransporter();
  if (!transporter) {
    console.warn(
        "Support email not configured. Set SUPPORT_SMTP_HOST/PORT/USER/PASS (and optionally SUPPORT_SMTP_SECURE).",
    );
    return {sent: false};
  }

  const from = process.env.SUPPORT_FROM_EMAIL || SUPPORT_EMAIL;

  await transporter.sendMail({
    from,
    to: SUPPORT_EMAIL,
    subject,
    text,
  });

  return {sent: true};
}

/**
 * Escalate a session to a human agent (create ticket + email).
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.userEmail
 * @param {string=} params.summary
 * @return {Promise<Object>}
 */
async function requestAgent({sessionId, userEmail, summary}) {
  const safeSessionId = normalizeString(sessionId, 200);
  const safeEmail = normalizeString(userEmail, 320);
  const safeSummary = normalizeString(summary, 4000);

  if (!safeSessionId) return {success: false, error: "sessionId is required"};
  if (!safeEmail) return {success: false, error: "email is required"};

  const db = admin.firestore();
  const ticketId = buildTicketId();

  const ticket = {
    ticketId,
    sessionId: safeSessionId,
    userEmail: safeEmail,
    summary: safeSummary || null,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection("supportTickets").doc(ticketId).set(ticket, {merge: false});

  await db.collection("supportSessions").doc(safeSessionId).set({
    ticketId,
    status: "awaiting_agent",
    userEmail: safeEmail,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  const recent = await getRecentMessages(safeSessionId, 20);
  const transcript = recent
      .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
      .join("\n\n");

  const subject = `Shoso Support Ticket #${ticketId}`;
  const webhookHint = `Inbound-to-chat webhook: /supportInboundEmail (requires SUPPORT_WEBHOOK_TOKEN).`;

  const text = [
    `New support request: ${ticketId}`,
    `User email: ${safeEmail}`,
    safeSummary ? `Summary: ${safeSummary}` : null,
    "\n--- Transcript (most recent) ---\n",
    transcript,
    "\n---\n",
    webhookHint,
  ].filter(Boolean).join("\n");

  await sendSupportEmail({subject, text});

  const userFacing =
    "I’ve sent your request to a human agent. It may take up to 24 hours for a reply. " +
    "You can keep this chat open—when the agent replies, it will show up here.";

  await appendMessage(safeSessionId, "assistant", userFacing, {ticketId});

  return {success: true, ticketId, message: userFacing};
}

/**
 * List messages for a session or a ticket (resolves ticket->session).
 * @param {Object} params
 * @param {string=} params.sessionId
 * @param {string=} params.ticketId
 * @param {number=} params.limit
 * @return {Promise<Object>}
 */
async function listSessionMessages({sessionId, ticketId, limit}) {
  const db = admin.firestore();

  let effectiveSessionId = normalizeString(sessionId, 200);
  const safeTicketId = normalizeString(ticketId, 200);

  if (!effectiveSessionId && safeTicketId) {
    const t = await db.collection("supportTickets").doc(safeTicketId).get();
    if (t.exists) {
      effectiveSessionId = t.data()?.sessionId || null;
    }
  }

  if (!effectiveSessionId) {
    return {success: false, error: "sessionId or ticketId is required"};
  }

  // const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));

  // [DEBUG] Silencing support bot spam
  return {success: true, sessionId: effectiveSessionId, messages: []};

  /*
  const snap = await db
      .collection("supportSessions")
      .doc(effectiveSessionId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(safeLimit)
      .get();

  const messages = [];
  snap.forEach((doc) => {
    const m = doc.data() || {};
    messages.push({
      role: m.role || "assistant",
      text: m.text || "",
      createdAt: m.createdAt?.toDate?.().toISOString?.() || null,
      ticketId: m.ticketId || null,
    });
  });

  return {success: true, sessionId: effectiveSessionId, messages};
  */
}

/**
 * Ingest an agent email reply into the chat (via webhook/automation).
 * @param {Object} params
 * @param {string} params.ticketId
 * @param {string=} params.from
 * @param {string} params.text
 * @return {Promise<Object>}
 */
async function inboundEmail({ticketId, from, text}) {
  const safeTicketId = normalizeString(ticketId, 200);
  const safeFrom = normalizeString(from, 320);
  const safeText = normalizeString(text, 8000);

  if (!safeTicketId || !safeText) {
    return {success: false, error: "ticketId and text are required"};
  }

  const db = admin.firestore();
  const ticketSnap = await db.collection("supportTickets").doc(safeTicketId).get();
  if (!ticketSnap.exists) {
    return {success: false, error: "Ticket not found"};
  }

  const sessionId = ticketSnap.data()?.sessionId;
  if (!sessionId) {
    return {success: false, error: "Ticket missing sessionId"};
  }

  const role = (safeFrom && safeFrom.toLowerCase().includes(SUPPORT_EMAIL)) ? "agent" : "agent";

  await appendMessage(sessionId, role, safeText, {ticketId: safeTicketId, from: safeFrom || null});
  await db.collection("supportTickets").doc(safeTicketId).set({
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  return {success: true};
}

module.exports = {
  SUPPORT_EMAIL,
  chat,
  requestAgent,
  listSessionMessages,
  inboundEmail,
};


