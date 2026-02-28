export async function searchGoogleBooks(query) {
  if (!query || query.length < 2) return [];
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books&fields=items(id,volumeInfo/title,volumeInfo/authors,volumeInfo/imageLinks)`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item) => ({
      id: item.id,
      title: item.volumeInfo?.title || 'Unknown Title',
      author: item.volumeInfo?.authors?.[0] || 'Unknown Author',
      // Force HTTPS — Google returns http thumbnails
      cover: item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
    }));
  } catch {
    return [];
  }
}
