"use strict";

// Gen1 functions — using defineSecret (firebase-functions/params) for all secrets.
// Secrets live in Google Secret Manager; access via .value() inside the function handler.
// Set secrets with: firebase functions:secrets:set SECRET_NAME
const functions          = require("firebase-functions/v1");
const { defineSecret }   = require("firebase-functions/params");
const admin              = require("firebase-admin");
const Stripe             = require("stripe");

admin.initializeApp();
const db = admin.firestore();

// ── Secrets ───────────────────────────────────────────────────────────────────
const NYT_API_KEY      = defineSecret("NYT_API_KEY");
const PRINTFUL_API_KEY = defineSecret("PRINTFUL_API_KEY");
const STRIPE_SECRET    = defineSecret("STRIPE_SECRET_KEY");

// ── First issue epoch — used to calculate issue number ────────────────────────
const EPOCH = new Date("2025-01-05");

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchNYTList(listName, apiKey, limit = 5) {
  const url =
    `https://api.nytimes.com/svc/books/v3/lists/current/${listName}.json` +
    `?api-key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NYT API [${listName}] returned status ${res.status}`);
  }

  const data = await res.json();

  return (data.results?.books || []).slice(0, limit).map((b) => ({
    rank:        b.rank,
    title:       b.title,
    author:      b.author,
    weeksOnList: b.weeks_on_list,
    isbn13:      b.primary_isbn13,
    description: b.description,
    coverUrl:
      b.book_image ||
      `https://books.google.com/books/content?vid=ISBN:${b.primary_isbn13}&printsec=frontcover&img=1&zoom=1`,
  }));
}

function getIssueNumber() {
  return Math.max(
    1,
    Math.floor((Date.now() - EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  );
}

function formatIssueDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday:  "long",
    year:     "numeric",
    month:    "long",
    day:      "numeric",
    timeZone: "America/New_York",
  });
}

// ── Gazette: scheduled refresh — every Sunday at 6 AM Eastern ────────────────
exports.gazetteRefresh = functions
  .runWith({ secrets: [NYT_API_KEY], memory: "256MB", timeoutSeconds: 60 })
  .pubsub.schedule("0 10 * * 0")
  .timeZone("America/New_York")
  .onRun(async () => {
    const apiKey = NYT_API_KEY.value();
    if (!apiKey) throw new Error("NYT_API_KEY secret is not set");

    const now = new Date();

    const [fiction, nonfiction] = await Promise.all([
      fetchNYTList("hardcover-fiction",    apiKey, 5),
      fetchNYTList("hardcover-nonfiction", apiKey, 5),
    ]);

    const issueNumber = getIssueNumber();
    const issueDate   = formatIssueDate(now);

    await db.collection("gazette").doc("currentIssue").set({
      fiction,
      nonfiction,
      issueDate,
      issueNumber,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Gazette] Issue #${issueNumber} written — ${issueDate}`);
    console.log(`[Gazette] Fiction #1: ${fiction[0]?.title} by ${fiction[0]?.author}`);
    console.log(`[Gazette] Nonfiction #1: ${nonfiction[0]?.title} by ${nonfiction[0]?.author}`);
  });

// ── Store: fetch product from Printful ───────────────────────────────────────
// Called by the store UI to get product name, image, variants, and pricing.
// data: { syncProductId: string }
exports.getProduct = functions
  .runWith({ secrets: [PRINTFUL_API_KEY] })
  .https.onCall(async (data) => {
    const { syncProductId } = data;
    if (!syncProductId) {
      throw new functions.https.HttpsError("invalid-argument", "syncProductId is required");
    }

    const res = await fetch(
      `https://api.printful.com/store/products/${syncProductId}`,
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY.value()}` } }
    );

    if (!res.ok) {
      throw new functions.https.HttpsError("internal", `Printful error: ${res.status}`);
    }

    const { result } = await res.json();

    return {
      id:        result.sync_product.id,
      name:      result.sync_product.name,
      thumbnail: result.sync_product.thumbnail_url,
      variants:  result.sync_variants.map((v) => ({
        id:       v.id,
        name:     v.name,
        price:    v.retail_price,
        currency: v.currency,
      })),
    };
  });

// ── Store: create Stripe checkout session ─────────────────────────────────────
// Fetches authoritative price from Printful, then creates a Stripe Checkout session.
// data: { variantId: string, quantity: number, successUrl: string, cancelUrl: string }
// Returns: { sessionId: string, url: string }
exports.createCheckoutSession = functions
  .runWith({ secrets: [PRINTFUL_API_KEY, STRIPE_SECRET] })
  .https.onCall(async (data) => {
    const { variantId, quantity = 1, successUrl, cancelUrl } = data;
    if (!variantId || !successUrl || !cancelUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "variantId, successUrl, and cancelUrl are required"
      );
    }

    // Fetch variant from Printful to get the authoritative retail price
    const varRes = await fetch(
      `https://api.printful.com/store/variants/${variantId}`,
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY.value()}` } }
    );

    if (!varRes.ok) {
      throw new functions.https.HttpsError("internal", `Printful variant error: ${varRes.status}`);
    }

    const { result: variant } = await varRes.json();
    const priceInCents = Math.round(parseFloat(variant.retail_price) * 100);
    const currency     = (variant.currency || "USD").toLowerCase();

    // Create Stripe Checkout session
    const stripe  = new Stripe(STRIPE_SECRET.value());
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name:   variant.name,
            images: variant.product?.image ? [variant.product.image] : [],
          },
          unit_amount: priceInCents,
        },
        quantity,
      }],
      mode:         "payment",
      success_url:  successUrl,
      cancel_url:   cancelUrl,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU"],
      },
    });

    return { sessionId: session.id, url: session.url };
  });
