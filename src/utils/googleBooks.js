async function fetchGoogle(query) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books&fields=items(id,volumeInfo/title,volumeInfo/authors,volumeInfo/imageLinks,volumeInfo/infoLink)`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((item) => ({
    id: `g_${item.id}`,
    title: item.volumeInfo?.title || 'Unknown Title',
    author: item.volumeInfo?.authors?.[0] || 'Unknown Author',
    coverURL: item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
    link: item.volumeInfo?.infoLink || `https://books.google.com/books?id=${item.id}`,
    source: 'google',
  }));
}

async function fetchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs || []).map((doc) => ({
    id: `ol_${doc.key}`,
    title: doc.title || 'Unknown Title',
    author: doc.author_name?.[0] || 'Unknown Author',
    coverURL: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    link: `https://openlibrary.org${doc.key}`,
    source: 'openlibrary',
  }));
}

// Normalize title+author for deduplication
function dedupKey(book) {
  return `${book.title}|${book.author}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
}

export async function searchBooks(query) {
  if (!query || query.length < 2) return [];
  const [g, ol] = await Promise.allSettled([fetchGoogle(query), fetchOpenLibrary(query)]);
  const google = g.status === 'fulfilled' ? g.value : [];
  const openlib = ol.status === 'fulfilled' ? ol.value : [];

  const seen = new Set();
  const merged = [];
  for (const book of [...google, ...openlib]) {
    const key = dedupKey(book);
    if (!seen.has(key)) { seen.add(key); merged.push(book); }
  }

  // Books with covers first
  merged.sort((a, b) => (b.coverURL ? 1 : 0) - (a.coverURL ? 1 : 0));
  return merged.slice(0, 14);
}
