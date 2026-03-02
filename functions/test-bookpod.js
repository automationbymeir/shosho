process.env.BOOKPOD_USER_ID = "Meir_Horwitz";
process.env.BOOKPOD_CUSTOM_TOKEN = "06958709fb0c4e4290de08c065c0e378";

const bookpod = require("./src/bookpod.js");

/**
 * Tests the Bookpod API.
 */
async function testApiParams() {
  console.log("-----------------------------------------");
  console.log("TESTING BOOKPOD API - BOOK CREATION");
  console.log("-----------------------------------------");

  const bookPayload = {
    title: "Test API Layout",
    printcolor: "color",
    sheettype: "white80", // testing selection
    laminationtype: "none", // testing selection
    finishtype: "soft",
    width: 20.0,
    height: 20.0,
    readingdirection: "right",
    bleed: true,
    contentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    coverUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  };

  try {
    console.log("SENDING BOOK CREATE PAYLOAD:", JSON.stringify(bookPayload, null, 2));
    const res = await bookpod.createBook(bookPayload);
    console.log("-> BOOKPOD RESPONSE [SUCCESS]:", res);

    console.log("\n-----------------------------------------");
    console.log("TESTING BOOKPOD API - ORDER CREATION");
    console.log("-----------------------------------------");

    const orderPayload = {
      quantity: 1,
      totalprice: 144, // 119 + 25
      shippingDetails: {
        firstName: "Israel",
        lastName: "Israeli",
        phone: "0500000000",
        city: "Tel Aviv",
        address1: "Rothschild 1",
        shippingMethod: 2, // Home Delivery
      },
      items: [
        {
          bookId: res?.bookId || 1000,
          quantity: 1,
        },
      ],
      invoice: "https://mock-invoice.url/invoice.pdf",
    };

    console.log("SENDING ORDER PAYLOAD:", JSON.stringify(orderPayload, null, 2));
    const orderRes = await bookpod.createOrder(orderPayload);
    console.log("-> BOOKPOD RESPONSE [SUCCESS]:", orderRes);
  } catch (e) {
    console.error("-> BOOKPOD RESPONSE [FAILED]:", e.message);
    if (e.payload) console.error("Details:", e.payload);
  }
}

testApiParams();
