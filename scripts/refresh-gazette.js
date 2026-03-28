#!/usr/bin/env node
// scripts/refresh-gazette.js
// Run every Sunday by the GitHub Action "Refresh Gazette Data".
// Fetches NYT Fiction + Nonfiction top-5, writes public/gazette-data.json.
// newspaper.html reads that file on every page load.

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NYT_API_KEY = process.env.NYT_API_KEY;
if (!NYT_API_KEY) {
  console.error("NYT_API_KEY environment variable is not set.");
  process.exit(1);
}

const EPOCH = new Date("2025-01-05");

async function fetchNYTList(listName, limit = 5) {
  const url =
    `https://api.nytimes.com/svc/books/v3/lists/current/${listName}.json` +
    `?api-key=${NYT_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NYT API [${listName}] status ${res.status}`);

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

async function main() {
  console.log("[Gazette] Fetching NYT data...");

  const [fiction, nonfiction] = await Promise.all([
    fetchNYTList("hardcover-fiction",    5),
    fetchNYTList("hardcover-nonfiction", 5),
  ]);

  const now = new Date();
  const issueDate = now.toLocaleDateString("en-US", {
    weekday:  "long",
    year:     "numeric",
    month:    "long",
    day:      "numeric",
    timeZone: "America/New_York",
  });

  const issueNumber = getIssueNumber();

  const payload = {
    fiction,
    nonfiction,
    issueDate,
    issueNumber,
    updatedAt: now.toISOString(),
  };

  const outPath = path.join(__dirname, "..", "public", "gazette-data.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(`[Gazette] Issue #${issueNumber} written — ${issueDate}`);
  console.log(`[Gazette] Fiction #1:    ${fiction[0]?.title} by ${fiction[0]?.author}`);
  console.log(`[Gazette] Nonfiction #1: ${nonfiction[0]?.title} by ${nonfiction[0]?.author}`);
  console.log(`[Gazette] Saved to ${outPath}`);
}

main().catch((err) => {
  console.error("[Gazette] Error:", err.message);
  process.exit(1);
});
