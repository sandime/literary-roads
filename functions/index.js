"use strict";

// Gen1 functions — using defineSecret (firebase-functions/params) for all secrets.
// Secrets live in Google Secret Manager; access via .value() inside the function handler.
// Set secrets with: firebase functions:secrets:set SECRET_NAME
const functions          = require("firebase-functions/v1");
const { defineSecret }   = require("firebase-functions/params");
const admin              = require("firebase-admin");
const Stripe             = require("stripe");
const { XMLParser }      = require("fast-xml-parser");

admin.initializeApp();
const db = admin.firestore();

// ── Secrets ───────────────────────────────────────────────────────────────────
const NYT_API_KEY      = defineSecret("NYT_API_KEY");
const PRINTFUL_API_KEY = defineSecret("PRINTFUL_API_KEY");
const STRIPE_SECRET    = defineSecret("STRIPE_SECRET_KEY");

// ── First issue epoch — used to calculate issue number ────────────────────────
const EPOCH = new Date("2025-01-05");

// ── Month names — used by gazetteAutoFestivalDrafts ──────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

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

// ── CORS helper — sets headers and handles preflight for all store endpoints ──
function applyCORS(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true; // caller should return immediately
  }
  return false;
}

// ── Gazette: auto-draft festivals — every Monday at 8 AM Eastern ─────────────
// Queries literaryFestivals for entries whose typicalMonth matches the current
// or next calendar month, then creates a gazette draft for each one not already
// present in the festivals Gazette collection (matched by name).
exports.gazetteAutoFestivalDrafts = functions
  .runWith({ memory: "256MB", timeoutSeconds: 120 })
  .pubsub.schedule("0 8 * * 1")
  .timeZone("America/New_York")
  .onRun(async () => {
    const now = new Date();
    const currentYear     = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-based
    const nextMonthIdx    = (currentMonthIdx + 1) % 12;
    const nextMonthYear   = nextMonthIdx === 0 ? currentYear + 1 : currentYear;

    const currentMonthName = MONTHS[currentMonthIdx];
    const nextMonthName    = MONTHS[nextMonthIdx];

    console.log(`[gazetteAutoFestivalDrafts] Checking for ${currentMonthName} / ${nextMonthName} festivals`);

    // Fetch all map festivals from the new Firestore collection
    const literaryFestsSnap = await db.collection("literaryFestivals").get();
    if (literaryFestsSnap.empty) {
      console.log("[gazetteAutoFestivalDrafts] literaryFestivals collection is empty — skipping.");
      return;
    }

    // Find festivals whose typicalMonth contains the current or next month name
    const matching = literaryFestsSnap.docs
      .map((d) => d.data())
      .filter((f) => {
        const m = f.typicalMonth || "";
        if (!m || m === "Various") return false;
        return m.includes(currentMonthName) || m.includes(nextMonthName);
      });

    if (matching.length === 0) {
      console.log("[gazetteAutoFestivalDrafts] No matching festivals — nothing to draft.");
      return;
    }

    // Fetch existing gazette festivals to deduplicate by name
    const existingSnap  = await db.collection("festivals").get();
    const existingNames = new Set(
      existingSnap.docs.map((d) => (d.data().name || "").toLowerCase().trim())
    );

    let created = 0;
    let skipped = 0;

    for (const f of matching) {
      const nameLower = (f.name || "").toLowerCase().trim();
      if (existingNames.has(nameLower)) {
        skipped++;
        continue;
      }

      // Determine which matched month and build YYYY-MM-DD for the 1st of that month
      let matchedMonthIdx = null;
      let matchedYear     = null;
      const m = f.typicalMonth || "";

      if (m.includes(currentMonthName)) {
        matchedMonthIdx = currentMonthIdx;
        matchedYear     = currentYear;
      } else {
        matchedMonthIdx = nextMonthIdx;
        matchedYear     = nextMonthYear;
      }

      const mm      = String(matchedMonthIdx + 1).padStart(2, "0");
      const dateStr = `${matchedYear}-${mm}-01`;
      const context = (f.description || "").substring(0, 400);

      await db.collection("festivals").add({
        name:          f.name          || "",
        date:          dateStr,
        endDate:       "",
        location:      `${f.city || ""}, ${f.state || ""}`.replace(/^, |, $/g, ""),
        link:          f.website       || "",
        context,
        imageUrl:      "",
        featured:      true,
        status:        "draft",
        autoGenerated: true,
        sourceId:      f.id            || "",
        createdAt:     admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
      });

      existingNames.add(nameLower); // prevent double-adding within this run
      created++;
      console.log(`[gazetteAutoFestivalDrafts] Drafted: ${f.name} (${dateStr})`);
    }

    console.log(`[gazetteAutoFestivalDrafts] Done — created: ${created}, skipped (duplicates): ${skipped}`);
  });

// ── Gazette: RSS fetch — every day at 6 AM Eastern ───────────────────────────
// Reads active feed configs from rssFeeds collection, fetches each RSS feed,
// filters items by keywords, deduplicates against rssDrafts, and creates new
// draft documents. Caps at 15 new drafts per run.
//
// HTTP: native fetch (Node.js 20 built-in — no node-fetch needed)
// XML:  fast-xml-parser (no callback API, handles malformed RSS gracefully)
exports.gazetteRSSFetch = functions
  .runWith({ memory: "512MB", timeoutSeconds: 120 })
  .pubsub.schedule("0 6 * * *")
  .timeZone("America/New_York")
  .onRun(async () => {
    const MAX_DRAFTS_PER_RUN = 30;

    // Per-source caps — prolific feeds capped higher, all others at 3
    const perSourceCap = (sourceName) => {
      if (sourceName === 'Atlas Obscura' || sourceName === 'Literary Hub') return 5;
      return 3;
    };

    // ── Helpers ──────────────────────────────────────────────────────────────

    // Strip HTML tags and collapse whitespace
    const stripHtml = (str = "") =>
      str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    // Return true if any keyword appears (case-insensitive) in the text
    const matchesKeywords = (text, keywords) => {
      const lower = (text || "").toLowerCase();
      return (keywords || []).some((kw) => lower.includes(kw.toLowerCase()));
    };

    // Parse RSS or Atom XML into a normalised array of { title, description, link, pubDate }
    const parseXML = (xmlText) => {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        cdataPropName: "__cdata",
        isArray: (name) => ["item", "entry"].includes(name),
      });

      let parsed;
      try {
        parsed = parser.parse(xmlText);
      } catch (e) {
        console.warn("[gazetteRSSFetch] XML parse error:", e.message);
        return [];
      }

      // RSS 2.0
      const rssItems = parsed?.rss?.channel?.item;
      if (Array.isArray(rssItems)) {
        return rssItems.map((it) => ({
          title:       String(it.title?.["__cdata"] ?? it.title ?? "").trim(),
          description: String(it.description?.["__cdata"] ?? it.description ?? "").trim(),
          link:        String(it.link ?? "").trim(),
          pubDate:     String(it.pubDate ?? "").trim(),
        }));
      }

      // Atom
      const atomEntries = parsed?.feed?.entry;
      if (Array.isArray(atomEntries)) {
        return atomEntries.map((it) => ({
          title:       String(it.title?.["__cdata"] ?? it.title ?? "").trim(),
          description: String(it.summary?.["__cdata"] ?? it.summary ?? it.content?.["__cdata"] ?? it.content ?? "").trim(),
          link:        String(it.link?.["@_href"] ?? it.link ?? "").trim(),
          pubDate:     String(it.updated ?? it.published ?? "").trim(),
        }));
      }

      return [];
    };

    // ── Load active feeds ────────────────────────────────────────────────────
    const feedsSnap = await db.collection("rssFeeds")
      .where("active", "==", true)
      .get();

    if (feedsSnap.empty) {
      console.log("[gazetteRSSFetch] No active feeds configured — rssFeeds collection is empty or all feeds are inactive.");
      return;
    }

    const feeds = feedsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`[gazetteRSSFetch] Found ${feeds.length} active feed(s): ${feeds.map(f => f.sourceName).join(", ")}`);

    // ── Load existing draft titles for deduplication ─────────────────────────
    const existingSnap = await db.collection("rssDrafts").get();
    const existingTitles = new Set(
      existingSnap.docs.map((d) => (d.data().title || "").toLowerCase().trim())
    );
    console.log(`[gazetteRSSFetch] ${existingTitles.size} existing draft title(s) loaded for dedup`);

    // ── Process feeds ────────────────────────────────────────────────────────
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const feed of feeds) {
      if (totalCreated >= MAX_DRAFTS_PER_RUN) {
        console.log(`[gazetteRSSFetch] Cap of ${MAX_DRAFTS_PER_RUN} reached — stopping early`);
        break;
      }

      console.log(`[gazetteRSSFetch] --- ${feed.sourceName} | cap: ${perSourceCap(feed.sourceName)} | ${feed.url}`);

      let xmlText;
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "Literary Roads Gazette Bot/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        console.log(`[gazetteRSSFetch]   fetch → HTTP ${res.status} ${res.statusText}`);
        if (!res.ok) {
          console.warn(`[gazetteRSSFetch]   SKIP: non-OK status`);
          continue;
        }
        xmlText = await res.text();
        console.log(`[gazetteRSSFetch]   response body: ${xmlText.length} chars`);
        // Log first 200 chars so we can see if it's XML, HTML, or an error page
        console.log(`[gazetteRSSFetch]   body preview: ${xmlText.substring(0, 200).replace(/\n/g, " ")}`);
      } catch (e) {
        console.warn(`[gazetteRSSFetch]   FETCH ERROR: ${e.message}`);
        continue;
      }

      const items = parseXML(xmlText);
      console.log(`[gazetteRSSFetch]   parsed ${items.length} item(s) from XML`);
      if (items.length > 0) {
        console.log(`[gazetteRSSFetch]   first item title: "${items[0].title}"`);
      }

      let feedKeywordPass = 0;
      let feedDupSkip = 0;
      let feedCreated = 0;
      const feedCap = perSourceCap(feed.sourceName);

      for (const item of items) {
        if (totalCreated >= MAX_DRAFTS_PER_RUN) break;
        if (feedCreated >= feedCap) break;

        const combinedText = `${item.title} ${item.description}`;
        if (!matchesKeywords(combinedText, feed.keywords)) {
          totalSkipped++;
          continue;
        }
        feedKeywordPass++;

        const titleLower = item.title.toLowerCase().trim();
        if (!titleLower || existingTitles.has(titleLower)) {
          totalSkipped++;
          feedDupSkip++;
          continue;
        }

        const summary = stripHtml(item.description).substring(0, 300);

        await db.collection("rssDrafts").add({
          title:            item.title,
          sourceName:       feed.sourceName,
          sourceUrl:        feed.url,
          summary,
          link:             item.link,
          pubDate:          item.pubDate,
          suggestedSection: feed.suggestedSection,
          autoGenerated:    true,
          status:           "draft",
          createdAt:        admin.firestore.FieldValue.serverTimestamp(),
        });

        existingTitles.add(titleLower);
        totalCreated++;
        feedCreated++;
        console.log(`[gazetteRSSFetch]   DRAFT CREATED: "${item.title}"`);
      }

      console.log(`[gazetteRSSFetch]   summary → keyword pass: ${feedKeywordPass}, dup skipped: ${feedDupSkip}, created: ${feedCreated}`);
    }

    console.log(`[gazetteRSSFetch] ===== DONE — total created: ${totalCreated}, total skipped: ${totalSkipped} =====`);
  });

// ── Store: fetch product from Printful ───────────────────────────────────────
exports.storeGetProduct = functions
  .runWith({ secrets: [PRINTFUL_API_KEY] })
  .https.onRequest(async (req, res) => {
    if (applyCORS(req, res)) return;

    try {
      const { syncProductId } = req.body;
      if (!syncProductId) {
        res.status(400).json({ error: "syncProductId is required" });
        return;
      }

      const pfRes = await fetch(
        `https://api.printful.com/store/products/${syncProductId}`,
        { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY.value()}` } }
      );

      if (!pfRes.ok) {
        const body = await pfRes.text().catch(() => "");
        console.error(`[getProduct] Printful ${pfRes.status}:`, body);
        res.status(502).json({ error: `Printful error: ${pfRes.status}` });
        return;
      }

      const { result } = await pfRes.json();
      res.json({
        id:        result.sync_product.id,
        name:      result.sync_product.name,
        thumbnail: result.sync_product.thumbnail_url,
        variants:  result.sync_variants.map((v) => ({
          id:       v.id,
          name:     v.name,
          price:    v.retail_price,
          currency: v.currency,
        })),
      });
    } catch (e) {
      console.error("[getProduct] error:", e);
      res.status(500).json({ error: e.message });
    }
  });

// ── Store: create Stripe checkout session ─────────────────────────────────────
exports.storeCreateCheckout = functions
  .runWith({ secrets: [PRINTFUL_API_KEY, STRIPE_SECRET] })
  .https.onRequest(async (req, res) => {
    if (applyCORS(req, res)) return;

    try {
      const { variantId, quantity = 1, successUrl, cancelUrl } = req.body;
      if (!variantId || !successUrl || !cancelUrl) {
        res.status(400).json({ error: "variantId, successUrl, and cancelUrl are required" });
        return;
      }

      // Fetch variant from Printful to get the authoritative retail price
      const varRes = await fetch(
        `https://api.printful.com/store/variants/${variantId}`,
        { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY.value()}` } }
      );

      if (!varRes.ok) {
        res.status(502).json({ error: `Printful variant error: ${varRes.status}` });
        return;
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
        mode:        "payment",
        success_url: successUrl,
        cancel_url:  cancelUrl,
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "GB", "AU"],
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (e) {
      console.error("[createCheckoutSession] error:", e);
      res.status(500).json({ error: e.message });
    }
  });
