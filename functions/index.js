"use strict";

// Gen1 scheduled function — simpler deployment, no Cloud Build service account issues.
// Secrets are injected as environment variables via runWith({ secrets: [...] }).
const functions = require("firebase-functions/v1");
const admin     = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

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

// ── Scheduled refresh — every Sunday at 6 AM Eastern ─────────────────────────
//
// Cron: "0 10 * * 0"  →  10:00 UTC  =  06:00 ET
// Secrets are exposed as process.env.NYT_API_KEY inside the function.
//
exports.gazetteRefresh = functions
  .runWith({ secrets: ["NYT_API_KEY"], memory: "256MB", timeoutSeconds: 60 })
  .pubsub.schedule("0 10 * * 0")
  .timeZone("America/New_York")
  .onRun(async () => {
    const apiKey = process.env.NYT_API_KEY;
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
