import { useEffect, useState } from 'react';

// ── Quotes & Facts Database ──────────────────────────────────────────────────
// type: 'quote' → text + author  |  type: 'fact' → text only
const CONTENT = [

  // ── TRAVEL & JOURNEY QUOTES ─────────────────────────────────────────────
  { type: 'quote', text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { type: 'quote', text: 'The world is a book, and those who do not travel read only one page.', author: 'Saint Augustine' },
  { type: 'quote', text: 'To travel is to live.', author: 'Hans Christian Andersen' },
  { type: 'quote', text: 'We are all travelers in the wilderness of this world.', author: 'Robert Louis Stevenson' },
  { type: 'quote', text: 'Life is either a daring adventure or nothing at all.', author: 'Helen Keller' },
  { type: 'quote', text: 'Travel far enough, you meet yourself.', author: 'David Mitchell' },
  { type: 'quote', text: "I travel not to go anywhere, but to go. I travel for travel's sake.", author: 'Robert Louis Stevenson' },
  { type: 'quote', text: "One's destination is never a place, but a new way of seeing things.", author: 'Henry Miller' },
  { type: 'quote', text: 'The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.', author: 'Marcel Proust' },
  { type: 'quote', text: 'I am not the same, having seen the moon shine on the other side of the world.', author: 'Mary Anne Radmacher' },
  { type: 'quote', text: 'Wherever you go, go with all your heart.', author: 'Confucius' },
  { type: 'quote', text: 'I was not born for one corner. The whole world is my native land.', author: 'Seneca' },
  { type: 'quote', text: 'The road goes ever on and on.', author: 'J.R.R. Tolkien' },
  { type: 'quote', text: 'Traveling — it leaves you speechless, then turns you into a storyteller.', author: 'Ibn Battuta' },
  { type: 'quote', text: 'I am part of all that I have met.', author: 'Alfred Lord Tennyson' },
  { type: 'quote', text: 'Once you have traveled, the voyage never ends, but is played out over and over again in the quietest chambers.', author: 'Pat Conroy' },
  { type: 'quote', text: 'All journeys have secret destinations of which the traveler is unaware.', author: 'Martin Buber' },
  { type: 'quote', text: 'An adventure is only an inconvenience rightly considered.', author: 'G.K. Chesterton' },
  { type: 'quote', text: 'Buy the ticket, take the ride.', author: 'Hunter S. Thompson' },
  { type: 'quote', text: 'Adventure is worthwhile in itself.', author: 'Amelia Earhart' },
  { type: 'quote', text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { type: 'quote', text: "If you don't know where you've come from, you don't know where you're going.", author: 'Maya Angelou' },
  { type: 'quote', text: 'The road is there, it will always be there. You just have to decide when to take it.', author: 'Terry McMillan' },

  // ── READING & BOOKS QUOTES ───────────────────────────────────────────────
  { type: 'quote', text: 'A reader lives a thousand lives before he dies. The man who never reads lives only one.', author: 'George R.R. Martin' },
  { type: 'quote', text: 'Books are a uniquely portable magic.', author: 'Stephen King' },
  { type: 'quote', text: 'Reading gives us someplace to go when we have to stay where we are.', author: 'Mason Cooley' },
  { type: 'quote', text: 'There is no friend as loyal as a book.', author: 'Ernest Hemingway' },
  { type: 'quote', text: 'A book is a dream that you hold in your hands.', author: 'Neil Gaiman' },
  { type: 'quote', text: 'Books are the quietest and most constant of friends.', author: 'Charles W. Eliot' },
  { type: 'quote', text: 'Reading is the sole means by which we slip, involuntarily, often helplessly, into another\'s skin.', author: 'Joyce Carol Oates' },
  { type: 'quote', text: 'A great book should leave you with many experiences, and slightly exhausted at the end.', author: 'William Styron' },
  { type: 'quote', text: 'My alma mater was books, a good library.', author: 'Malcolm X' },
  { type: 'quote', text: 'A book must be the axe for the frozen sea within us.', author: 'Franz Kafka' },
  { type: 'quote', text: "Good books don't give up all their secrets at once.", author: 'Stephen King' },
  { type: 'quote', text: 'To read is to voyage through time.', author: 'Carl Sagan' },
  { type: 'quote', text: 'We read to know we are not alone.', author: 'C.S. Lewis' },
  { type: 'quote', text: 'The more that you read, the more things you will know.', author: 'Dr. Seuss' },
  { type: 'quote', text: 'A book is a garden you carry in your pocket.', author: 'Arabian Proverb' },
  { type: 'quote', text: 'Books are mirrors: we only see in them what we already have inside us.', author: 'Carlos Ruiz Zafón' },
  { type: 'quote', text: 'The man who does not read has no advantage over the man who cannot read.', author: 'Mark Twain' },
  { type: 'quote', text: "Every reader finds himself. The writer's work is merely a kind of optical instrument.", author: 'Marcel Proust' },
  { type: 'quote', text: 'There is a great deal of difference between an eager man who wants to read a book and the tired man who wants a book to read.', author: 'G.K. Chesterton' },
  { type: 'quote', text: 'I took a deep breath and listened to the old brag of my heart: I am, I am, I am.', author: 'Sylvia Plath' },
  { type: 'quote', text: 'Literature is the most agreeable way of ignoring life.', author: 'Fernando Pessoa' },
  { type: 'quote', text: 'She is too fond of books, and it has turned her brain.', author: 'Louisa May Alcott' },
  { type: 'quote', text: 'Fill your paper with the breathings of your heart.', author: 'William Wordsworth' },

  // ── LITERARY ROAD FACTS ─────────────────────────────────────────────────
  { type: 'fact', text: 'Jack Kerouac wrote "On the Road" on a single 120-foot scroll of paper — in just three weeks!' },
  { type: 'fact', text: 'The American Library Association has designated over 100 Literary Landmarks across the United States.' },
  { type: 'fact', text: "Powell's Books in Portland, Oregon occupies an entire city block and stocks over a million used and new books." },
  { type: 'fact', text: "Sylvia Beach opened Shakespeare and Company in Paris in 1919 — and published James Joyce's Ulysses when no one else would." },
  { type: 'fact', text: 'The Strand Bookstore in New York City has 18 miles of books spread across four floors.' },
  { type: 'fact', text: 'City Lights Bookstore in San Francisco was founded by poet Lawrence Ferlinghetti in 1953 — birthplace of the Beat Generation.' },
  { type: 'fact', text: 'The National Book Festival in Washington, D.C. draws over 175,000 visitors and features more than 100 authors each year.' },
  { type: 'fact', text: "Mark Twain's boyhood home in Hannibal, Missouri inspired the fictional town of St. Petersburg in Tom Sawyer." },
  { type: 'fact', text: "Ernest Hemingway's Key West home is still guarded by the descendants of his legendary six-toed cats." },
  { type: 'fact', text: 'William Faulkner outlined his novel A Fable directly on the walls of his Oxford, Mississippi home, Rowan Oak.' },
  { type: 'fact', text: 'Harper Lee and Truman Capote were childhood best friends and neighbors in Monroeville, Alabama.' },
  { type: 'fact', text: 'The Texas Book Festival was founded by Laura Bush in 1995 when she was First Lady of Texas.' },
  { type: 'fact', text: 'The oldest continuously operating bookstore in the U.S. is the Moravian Book Shop in Bethlehem, PA — founded in 1745.' },
  { type: 'fact', text: 'The Library of Congress holds over 170 million items, making it the largest library in the world.' },
  { type: 'fact', text: 'Zora Neale Hurston grew up in Eatonville, Florida — the first self-governing Black municipality in America.' },
  { type: 'fact', text: 'The Beat Generation writers — Kerouac, Ginsberg, and Burroughs — literally drove across America to find their stories.' },
  { type: 'fact', text: 'Thomas Wolfe immortalized his mother\'s Asheville, NC boarding house as "Dixieland" in Look Homeward, Angel.' },
  { type: 'fact', text: 'Edgar Allan Poe lived in Baltimore, Richmond, Philadelphia, and New York — all four cities claim him as their own.' },
  { type: 'fact', text: 'The Library Hotel in New York City organizes all 10 floors and 60 rooms by the Dewey Decimal System!' },
  { type: 'fact', text: "John Steinbeck's Cannery Row in Monterey, CA still exists — you can walk the same streets he described in 1945." },
  { type: 'fact', text: "Flannery O'Connor wrote most of her stories from her family farm, Andalusia, in Milledgeville, Georgia." },
  { type: 'fact', text: 'Toni Morrison was raised in Lorain, Ohio — a Great Lakes steel town that colors the world of nearly all her novels.' },
  { type: 'fact', text: 'Stephen King has set so many novels in Maine that fictional towns from his books would fill the entire state map.' },
  { type: 'fact', text: 'Cormac McCarthy typed all his manuscripts on a single Olivetti typewriter he bought in 1963 for just $50.' },
  { type: 'fact', text: 'The world\'s oldest bookstore, Livraria Bertrand in Lisbon, Portugal, has been selling books since 1732.' },
  { type: 'fact', text: 'Jack London called his Glen Ellen, California ranch "Beauty Ranch" — it\'s now a California State Historic Park.' },
  { type: 'fact', text: "The word 'bibliophile' comes from Greek: biblion (book) + philos (loving). You're in good company." },
];

// ── Component ────────────────────────────────────────────────────────────────
const Odometer = ({ onComplete }) => {
  const [miles, setMiles]           = useState(0);
  const [fuelLevel, setFuelLevel]   = useState(0);
  const [showContent, setShowContent] = useState(false);
  // Pick once per mount — stable across re-renders
  const [content] = useState(() => CONTENT[Math.floor(Math.random() * CONTENT.length)]);

  useEffect(() => {
    const mileInterval = setInterval(() => {
      setMiles(prev => {
        if (prev >= 1955) { clearInterval(mileInterval); return 1955; }
        return prev + 37;
      });
    }, 30);

    const fuelInterval = setInterval(() => {
      setFuelLevel(prev => {
        if (prev >= 100) { clearInterval(fuelInterval); return 100; }
        return prev + 2;
      });
    }, 50);

    const completeTimer = setTimeout(() => onComplete(), 3000);
    const contentTimer  = setTimeout(() => setShowContent(true), 650);

    return () => {
      clearInterval(mileInterval);
      clearInterval(fuelInterval);
      clearTimeout(completeTimer);
      clearTimeout(contentTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-midnight-navy flex items-center justify-center relative overflow-hidden">
      <style>{`
        @keyframes lr-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lr-content-appear {
          animation: lr-fade-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Starfield */}
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-navy to-black">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top:  `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Dashboard card */}
      <div className="relative z-10 text-center px-6" style={{ maxWidth: '360px', width: '100%' }}>

        {/* Title */}
        <div className="text-starlight-turquoise font-bungee text-2xl mb-5 drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
          THE LITERARY ROADS
        </div>

        {/* Odometer */}
        <div className="mb-6">
          <div className="bg-black/80 border-4 border-chrome-silver rounded-lg p-6 inline-block shadow-2xl">
            <div className="text-paper-white font-special-elite text-sm mb-2">ODOMETER</div>
            <div className="text-atomic-orange font-mono text-6xl font-bold tabular-nums tracking-wider">
              {miles.toString().padStart(4, '0')}
            </div>
            <div className="text-paper-white font-special-elite text-xs mt-2">MILES</div>
          </div>
        </div>

        {/* Fuel gauge */}
        <div className="max-w-xs mx-auto mb-8">
          <div className="text-paper-white font-special-elite text-sm mb-2">INSPIRATION FUEL</div>
          <div className="relative h-8 bg-black/80 border-2 border-chrome-silver rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-atomic-orange to-starlight-turquoise transition-all duration-100 ease-out"
              style={{ width: `${fuelLevel}%` }}
            >
              <div className="h-full w-full animate-pulse bg-white/20" />
            </div>
          </div>
          <div className="flex justify-between text-paper-white font-special-elite text-xs mt-1">
            <span>EMPTY</span>
            <span>FULL</span>
          </div>
        </div>

        {/* Quote / Fact — fades in at 650ms */}
        <div style={{ minHeight: '88px' }}>
          {showContent && (
            <div className="lr-content-appear">
              {content.type === 'quote' ? (
                /* ── Quote card ── */
                <div style={{
                  borderTop: '1px solid rgba(64,224,208,0.2)',
                  borderBottom: '1px solid rgba(64,224,208,0.2)',
                  padding: '14px 4px',
                }}>
                  <p style={{
                    fontFamily: 'Special Elite, serif',
                    fontSize: '0.85rem',
                    color: 'rgba(245,245,220,0.82)',
                    fontStyle: 'italic',
                    lineHeight: 1.65,
                    marginBottom: '10px',
                  }}>
                    &ldquo;{content.text}&rdquo;
                  </p>
                  <p style={{
                    fontFamily: 'Bungee, sans-serif',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    color: '#40E0D0',
                    textShadow: '0 0 8px rgba(64,224,208,0.5)',
                  }}>
                    — {content.author}
                  </p>
                </div>
              ) : (
                /* ── Fact card ── */
                <div style={{
                  borderTop: '1px solid rgba(255,78,0,0.25)',
                  borderBottom: '1px solid rgba(255,78,0,0.25)',
                  padding: '14px 4px',
                }}>
                  <p style={{
                    fontFamily: 'Bungee, sans-serif',
                    fontSize: '0.6rem',
                    letterSpacing: '0.12em',
                    color: '#FF4E00',
                    textShadow: '0 0 8px rgba(255,78,0,0.5)',
                    marginBottom: '8px',
                  }}>
                    📚 LITERARY ROAD FACT
                  </p>
                  <p style={{
                    fontFamily: 'Special Elite, serif',
                    fontSize: '0.82rem',
                    color: 'rgba(245,245,220,0.8)',
                    lineHeight: 1.6,
                  }}>
                    {content.text}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Odometer;
