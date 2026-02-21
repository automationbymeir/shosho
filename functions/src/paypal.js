const {HttpsError} = require("firebase-functions/v2/https");

// PayPal API Base URL - Sandbox for now, change to live for production
// User didn't specify, assuming sandbox or live based on keys. usually start with sandbox.
const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com";

/**
 * Get PayPal credentials from environment variables.
 * @return {Object} The client ID and secret.
 */
function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new HttpsError("failed-precondition", "PayPal credentials not configured");
  }
  return {clientId, clientSecret};
}

/**
 * Get an OAuth2 access token from PayPal.
 * @return {Promise<string>} The access token.
 */
async function getAccessToken() {
  const {clientId, clientSecret} = getPayPalCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal OAuth error:", errorText);
    throw new HttpsError("internal", "Failed to authenticate with PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create a PayPal order.
 * @param {number} amount - The amount to charge.
 * @param {string} [currency="ILS"] - The currency code (default: ILS).
 * @return {Promise<Object>} The created order object.
 */
async function createOrder(amount, currency = "ILS") {
  const accessToken = await getAccessToken();

  const orderPayload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount.toString(),
        },
      },
    ],
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal createOrder error:", errorText);
    throw new HttpsError("internal", "Failed to create PayPal order");
  }

  return response.json();
}

/**
 * Capture payment for an order.
 * @param {string} orderId - The PayPal order ID.
 * @return {Promise<Object>} The capture result.
 */
async function captureOrder(orderId) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal captureOrder error:", errorText);
    throw new HttpsError("internal", "Failed to capture PayPal order");
  }

  return response.json();
}

module.exports = {
  createOrder,
  captureOrder,
};
