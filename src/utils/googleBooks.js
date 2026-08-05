const BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

async function fetchGoogle(query) {
  const cacheKey = `lr_gbooks_v3_${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const key = BOOKS_API_KEY ? `&key=${BOOKS_API_KEY}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books&fields=items(id,volumeInfo/title,volumeInfo/authors,volumeInfo/imageLinks,volumeInfo/infoLink,volumeInfo/industryIdentifiers,volumeInfo/categories,volumeInfo/pageCount,volumeInfo/publishedDate)${key}`;
  const res = await fetch(url);
  if (!res.ok) return []; // includes 429 — Open Library fills the gap
  const data = await res.json();
  const results = (data.items || []).map((item) => {
    const identifiers = item.volumeInfo?.industryIdentifiers || [];
    const isbn13 = identifiers.find(i => i.type === 'ISBN_13')?.identifier;
    const isbn10 = identifiers.find(i => i.type === 'ISBN_10')?.identifier;
    const isbn = isbn13 || isbn10 || null;
    // Prefer Google's own thumbnail — it's a real cover when present.
    // Only fall back to the Open Library ISBN URL when Google has no thumbnail,
    // since OL ISBN URLs can return a 1×1 placeholder for uncatalogued covers.
    const googleThumb = item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null;
    const coverURL = googleThumb || (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` : null);
    return {
      id: `g_${item.id}`,
      title: item.volumeInfo?.title || 'Unknown Title',
      author: item.volumeInfo?.authors?.[0] || 'Unknown Author',
      coverURL,
      isbn,
      pageCount:     item.volumeInfo?.pageCount     || null,
      publishedDate: item.volumeInfo?.publishedDate || null, // raw string e.g. "1937" or "2002-04-01"
      categories: item.volumeInfo?.categories || [],
      link: item.volumeInfo?.infoLink || `https://books.google.com/books?id=${item.id}`,
      source: 'google',
    };
  });
  setCache(cacheKey, results);
  return results;
}

async function fetchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs || []).map((doc) => ({
    id: `ol_${doc.key}`,
    title: doc.title || 'Unknown Title',
    author: doc.author_name?.[0] || 'Unknown Author',
    coverURL: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    pageCount:     doc.number_of_pages_median || null,
    publishedYear: doc.first_publish_year     || null, // integer — original publication year
    link: `https://openlibrary.org${doc.key}`,
    source: 'openlibrary',
  }));
}

// Normalize title+author for deduplication — same key used in both passes
function dedupKey(book) {
  return `${book.title}|${book.author}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
}

// Parse the year out of Google's publishedDate string ("1937", "2002-04-01", etc.)
function parseYear(str) {
  if (!str) return null;
  const y = parseInt(str, 10);
  return y > 0 ? y : null;
}

export async function searchBooks(query) {
  if (!query || query.length < 2) return [];
  const [g, ol] = await Promise.allSettled([fetchGoogle(query), fetchOpenLibrary(query)]);
  // On 429, silently fall back to Open Library results only
  const google = g.status === 'fulfilled' ? g.value : [];
  const openlib = ol.status === 'fulfilled' ? ol.value : [];

  // Pass 1: build OL year lookup keyed on the same dedupKey used in the dedup loop.
  // OL's first_publish_year is the original publication date; Google's publishedDate
  // is often an edition date (e.g. 2002 reprint of a 1937 novel). Prefer OL.
  const olYearMap = new Map();
  for (const book of openlib) {
    if (book.publishedYear) {
      const k = dedupKey(book);
      if (!olYearMap.has(k)) olYearMap.set(k, book.publishedYear);
    }
  }

  // Pass 2: dedup (Google wins on cover/ISBN data), then inject publishedYear.
  const seen = new Set();
  const merged = [];
  for (const book of [...google, ...openlib]) {
    const key = dedupKey(book);
    if (!seen.has(key)) {
      seen.add(key);
      // Prefer OL's original publication year; fall back to parsing Google's edition date
      const publishedYear = olYearMap.get(key) || parseYear(book.publishedDate) || null;
      merged.push({ ...book, publishedYear, publishedDate: undefined });
    }
  }

  // Books with covers first
  merged.sort((a, b) => (b.coverURL ? 1 : 0) - (a.coverURL ? 1 : 0));
  return merged.slice(0, 14);
}
