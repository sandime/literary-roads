const PRINCIPLES = [
  {
    title: 'Be Kind.',
    body: 'Whether you\'re recommending a book, adding to a Hitchhiker\'s Tale, or honking at a fellow traveler, remember there\'s a real person on the other side. Treat others with the same respect and warmth you\'d show a stranger who recommended their favorite book to you in a cozy cafe.',
  },
  {
    title: 'Be Thoughtful.',
    body: 'Every sentence you add to a tale becomes part of someone else\'s journey. Every book you recommend might be the next read for a traveler miles away. Contribute with care—write stories that inspire, suggest books that moved you, and leave the kind of mark you\'d be proud to see again on your next road trip.',
  },
  {
    title: 'Be Honest.',
    body: 'Recommend books you\'ve actually read and loved. Share real experiences at the places you visit. If you\'re leaving a book through Pass It Forward, make sure it\'s actually there. Our community thrives on trust—help us keep it that way.',
  },
  {
    title: 'Be Respectful.',
    body: 'This is a shared space for readers of all backgrounds, tastes, and perspectives. Harassment, hate speech, and inappropriate content have no place on The Literary Roads. Disagree with grace, discuss with curiosity, and remember that someone\'s favorite book might not be yours—and that\'s what makes the journey interesting.',
  },
];

export default function Ethics({ onBack }) {
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 10%, #2D1B69 0%, #1A1B2E 55%, #0D0E1A 100%)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center px-4 py-4 border-b-2 border-atomic-orange"
        style={{ background: 'rgba(13,14,26,0.9)' }}>
        <button
          onClick={onBack}
          className="text-starlight-turquoise hover:text-atomic-orange transition-colors font-special-elite text-sm mr-4"
        >
          ← Back
        </button>
        <h1 className="font-bungee text-atomic-orange text-base md:text-xl tracking-wider"
          style={{ textShadow: '0 0 16px rgba(255,78,0,0.7)' }}>
          CODE OF ETHICS
        </h1>
      </div>

      {/* Neon accent */}
      <div className="h-1 flex-shrink-0 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-70" />

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-8 max-w-2xl mx-auto w-full">

        {/* Title block */}
        <div className="text-center mb-10">
          <p className="font-bungee text-starlight-turquoise text-2xl md:text-4xl leading-tight mb-3"
            style={{ textShadow: '0 0 20px rgba(64,224,208,0.8)' }}>
            THE LITERARY ROADS
          </p>
          <p className="font-bungee text-atomic-orange text-xl md:text-3xl leading-tight"
            style={{ textShadow: '0 0 16px rgba(255,78,0,0.7)' }}>
            CODE OF ETHICS
          </p>
          {/* Decorative rule */}
          <div className="mt-6 mx-auto w-24 h-0.5 bg-gradient-to-r from-transparent via-starlight-turquoise to-transparent" />
        </div>

        {/* Intro */}
        <p className="font-special-elite text-paper-white/85 text-base leading-relaxed mb-10 text-center italic">
          The Literary Roads is more than an app—it's a community of readers, travelers, and
          storytellers sharing the open road. We believe in the power of books to connect us,
          and we're committed to creating a space where everyone feels welcome to explore,
          contribute, and discover.
        </p>

        <p className="font-special-elite text-chrome-silver/70 text-sm mb-8 text-center">
          When you join our community, we ask that you:
        </p>

        {/* Principles */}
        <div className="space-y-8 mb-10">
          {PRINCIPLES.map((p, i) => (
            <div key={i} className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(64,224,208,0.15)' }}>
              <h2 className="font-bungee text-atomic-orange text-base mb-3"
                style={{ textShadow: '0 0 10px rgba(255,78,0,0.5)' }}>
                {p.title}
              </h2>
              <p className="font-special-elite text-paper-white/80 text-sm leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Closing */}
        <div className="text-center pb-6">
          <p className="font-special-elite text-chrome-silver/65 text-sm leading-relaxed italic">
            If you see something that violates these values, use the Road Ranger report button.
            We're all stewards of this community.
          </p>
          {/* Decorative */}
          <div className="mt-8 font-bungee text-starlight-turquoise/30 text-xs tracking-widest">
            🚗 &nbsp; HAPPY TRAILS &nbsp; 🚗
          </div>
        </div>
      </div>
    </div>
  );
}
