// ── Privacy Policy ───────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'what-we-collect',
    title: 'WHAT INFORMATION WE COLLECT',
    color: '#40E0D0',
    items: [
      {
        heading: 'Account Information',
        bullets: [
          'Email address (for login and communication)',
          'Display name (optional)',
          'Profile preferences (car selection, reading preferences)',
        ],
      },
      {
        heading: 'Usage Data',
        bullets: [
          'Routes you plan and save',
          'Locations you check in at (bookstores, cafes, landmarks, festivals)',
          'Books you log and rate',
          'Guestbook entries and Hitchhiker\'s Tale contributions you write',
          'Postcards you share',
          'Routes and stops you share publicly',
        ],
      },
      {
        heading: 'Location Data',
        bullets: [
          'Your location when using "Near Me" or GPS features (only when you grant permission)',
          'Approximate location for search results and recommendations',
        ],
      },
      {
        heading: 'Automatically Collected',
        bullets: [
          'Device type and browser information',
          'App usage patterns',
          'Error logs and performance data',
        ],
      },
    ],
  },
  {
    id: 'how-we-use',
    title: 'HOW WE USE YOUR INFORMATION',
    color: '#FF4E00',
    intro: 'We use your data to:',
    bullets: [
      'Provide core app features (route planning, check-ins, book logging)',
      'Display your activity to other users when you choose to share (guestbook posts, tales, parked cars, shared routes)',
      'Improve the app experience and fix bugs',
      'Send you notifications about app activity (honks, tale contributions, badge unlocks)',
      'Analyze usage patterns to build better features',
    ],
    nots: [
      'Sell your personal information to third parties',
      'Use your data for targeted advertising',
      'Share your email with marketers',
      'Track you across other websites or apps',
    ],
  },
  {
    id: 'public-private',
    title: "WHAT'S PUBLIC, WHAT'S PRIVATE",
    color: '#40E0D0',
    publicItems: [
      'Your display name',
      'Cars you park at locations (visible on map to other users)',
      'Guestbook book recommendations you post',
      "Hitchhiker's Tale sentences you contribute",
      'Routes you explicitly choose to share',
      'Postcard selfies you share on social media',
    ],
    privateItems: [
      'Your email address',
      'Your saved routes (unless you share them)',
      'Your Book Log (books you\'ve read and rated)',
      'Your "Want to Read" list',
      'Your personal travel stats and badges',
      'Your check-in history',
    ],
    controls: 'You can delete your guestbook posts, tale contributions, and shared routes at any time. You can delete your entire account and all associated data from your profile.',
  },
  {
    id: 'third-party',
    title: 'THIRD-PARTY SERVICES',
    color: '#FFD700',
    intro: 'We use the following services to provide app functionality:',
    services: [
      { name: 'Google Places & Maps', desc: 'Location search and mapping' },
      { name: 'Google Books', desc: 'Book information and covers' },
      { name: 'Firebase (Google)', desc: 'Data storage and authentication' },
      { name: 'Mapbox', desc: 'Route planning and navigation' },
    ],
    outro: 'These services have their own privacy policies. We share only the minimum data needed to provide features.',
  },
  {
    id: 'storage',
    title: 'DATA STORAGE & SECURITY',
    color: '#40E0D0',
    bullets: [
      'Your data is stored securely using Firebase (Google Cloud)',
      'We use industry-standard encryption',
      'Access to your data is restricted to necessary app functions',
      'We retain your data as long as your account is active',
      'You can request data deletion at any time',
    ],
  },
  {
    id: 'your-rights',
    title: 'YOUR RIGHTS',
    color: '#FF4E00',
    intro: 'You have the right to:',
    bullets: [
      'Access the data we have about you',
      'Correct inaccurate information',
      'Delete your account and all data',
      'Export your data (Book Log, routes, etc.)',
      'Opt out of optional features (location sharing, etc.)',
    ],
    contact: 'To exercise these rights, contact us at: literaryroads@gmail.com',
  },
  {
    id: 'children',
    title: "CHILDREN'S PRIVACY",
    color: '#C0C0C0',
    body: 'The Literary Roads is not intended for children under 13. We do not knowingly collect data from children under 13. If you believe a child has created an account, please contact us immediately at literaryroads@gmail.com.',
  },
  {
    id: 'changes',
    title: 'CHANGES TO THIS POLICY',
    color: '#C0C0C0',
    body: "We may update this Privacy Policy as we add features or comply with regulations. We'll notify users of significant changes via email or in-app notification.",
  },
  {
    id: 'ccpa',
    title: "CALIFORNIA RESIDENTS' RIGHTS (CCPA)",
    color: '#FFD700',
    ccpa: true,
    rights: [
      {
        name: 'RIGHT TO KNOW',
        desc: 'You can request details about the personal information we\'ve collected about you in the past 12 months, including categories of data collected, sources, business purposes, and categories of third parties we share with.',
      },
      {
        name: 'RIGHT TO DELETE',
        desc: 'You can request deletion of your personal information, subject to certain exceptions.',
      },
      {
        name: 'RIGHT TO OPT-OUT',
        desc: 'We do not sell your personal information to third parties.',
      },
    ],
    how: 'Email us at literaryroads@gmail.com with "CCPA Request" in the subject line. We\'ll respond within 45 days. We will not discriminate against you for exercising these rights.',
  },
];

// ── Neon divider ──────────────────────────────────────────────────────────────
function Divider({ color = '#40E0D0' }) {
  return (
    <div className="my-6" style={{
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
    }} />
  );
}

export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 10%, #0D1A2D 0%, #1A1B2E 55%, #0D0E1A 100%)' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center px-4 py-4 border-b-2 border-starlight-turquoise"
        style={{ background: 'rgba(13,14,26,0.95)' }}>
        <button onClick={onBack}
          className="text-starlight-turquoise hover:text-atomic-orange transition-colors font-special-elite text-sm mr-4">
          ← Back
        </button>
        <h1 className="font-bungee text-starlight-turquoise text-base md:text-xl tracking-wider"
          style={{ textShadow: '0 0 16px rgba(64,224,208,0.7)' }}>
          PRIVACY POLICY
        </h1>
      </div>
      <div className="h-1 flex-shrink-0 bg-gradient-to-r from-starlight-turquoise via-atomic-orange to-starlight-turquoise opacity-60" />

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-8">

          {/* Title block */}
          <div className="text-center mb-10">
            <p className="font-bungee text-starlight-turquoise text-2xl md:text-3xl leading-tight mb-2"
              style={{ textShadow: '0 0 20px rgba(64,224,208,0.8)' }}>
              THE LITERARY ROADS
            </p>
            <p className="font-bungee text-atomic-orange text-lg md:text-2xl leading-tight mb-3"
              style={{ textShadow: '0 0 14px rgba(255,78,0,0.7)' }}>
              PRIVACY POLICY
            </p>
            <p className="font-special-elite text-chrome-silver/55 text-xs tracking-widest">
              Last Updated: March 14, 2026
            </p>
            <div className="mt-5 mx-auto w-24 h-0.5 bg-gradient-to-r from-transparent via-starlight-turquoise to-transparent" />
          </div>

          {/* Intro */}
          <p className="font-special-elite text-paper-white/80 text-sm leading-relaxed mb-10 text-center italic">
            At The Literary Roads, we believe in transparency about how we collect, use, and protect
            your information. This Privacy Policy explains our practices in plain language.
          </p>

          {/* Sections */}
          {SECTIONS.map((section) => (
            <div key={section.id} className="mb-8">
              {/* Section header */}
              <h2 className="font-bungee text-sm md:text-base mb-4 pb-2"
                style={{
                  color: section.color,
                  textShadow: `0 0 10px ${section.color}60`,
                  letterSpacing: '0.05em',
                  borderBottom: `1px solid ${section.color}25`,
                }}>
                {section.title}
              </h2>

              {/* WHAT WE COLLECT — grouped subsections */}
              {section.items && section.items.map((sub, si) => (
                <div key={si} className="mb-5 rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(64,224,208,0.1)' }}>
                  <p className="font-bungee text-xs mb-2"
                    style={{ color: 'rgba(192,192,192,0.7)', letterSpacing: '0.06em' }}>
                    {sub.heading}
                  </p>
                  <ul className="space-y-1">
                    {sub.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-2 font-special-elite text-sm"
                        style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.6 }}>
                        <span style={{ color: section.color, flexShrink: 0, marginTop: '2px' }}>◆</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* HOW WE USE — we do / we do not */}
              {section.intro && section.bullets && !section.services && (
                <>
                  <p className="font-special-elite text-sm mb-3" style={{ color: 'rgba(245,245,220,0.7)' }}>
                    {section.intro}
                  </p>
                  <ul className="space-y-1.5 mb-5">
                    {section.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-2 font-special-elite text-sm"
                        style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.6 }}>
                        <span style={{ color: section.color, flexShrink: 0, marginTop: '2px' }}>◆</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  {section.nots && (
                    <>
                      <p className="font-bungee text-xs mb-3"
                        style={{ color: 'rgba(192,192,192,0.5)', letterSpacing: '0.06em' }}>
                        WE DO NOT:
                      </p>
                      <ul className="space-y-1.5">
                        {section.nots.map((b, bi) => (
                          <li key={bi} className="flex items-start gap-2 font-special-elite text-sm"
                            style={{ color: 'rgba(245,245,220,0.65)', lineHeight: 1.6 }}>
                            <span style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }}>✕</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {section.contact && (
                    <p className="font-special-elite text-sm mt-4"
                      style={{ color: 'rgba(192,192,192,0.55)', lineHeight: 1.6 }}>
                      {section.contact}
                    </p>
                  )}
                </>
              )}

              {/* PUBLIC / PRIVATE */}
              {section.publicItems && (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl p-4"
                    style={{ background: 'rgba(64,224,208,0.05)', border: '1px solid rgba(64,224,208,0.15)' }}>
                    <p className="font-bungee text-[10px] mb-3 tracking-widest"
                      style={{ color: '#40E0D0' }}>PUBLIC</p>
                    <ul className="space-y-1.5">
                      {section.publicItems.map((b, bi) => (
                        <li key={bi} className="flex items-start gap-2 font-special-elite text-xs"
                          style={{ color: 'rgba(245,245,220,0.7)', lineHeight: 1.5 }}>
                          <span style={{ color: '#40E0D0', flexShrink: 0 }}>◆</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl p-4"
                    style={{ background: 'rgba(192,192,192,0.04)', border: '1px solid rgba(192,192,192,0.12)' }}>
                    <p className="font-bungee text-[10px] mb-3 tracking-widest"
                      style={{ color: '#C0C0C0' }}>PRIVATE — ONLY YOU</p>
                    <ul className="space-y-1.5">
                      {section.privateItems.map((b, bi) => (
                        <li key={bi} className="flex items-start gap-2 font-special-elite text-xs"
                          style={{ color: 'rgba(245,245,220,0.7)', lineHeight: 1.5 }}>
                          <span style={{ color: '#C0C0C0', flexShrink: 0 }}>◆</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {section.controls && (
                <p className="font-special-elite text-xs mt-3"
                  style={{ color: 'rgba(192,192,192,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {section.controls}
                </p>
              )}

              {/* THIRD-PARTY SERVICES */}
              {section.services && (
                <>
                  <p className="font-special-elite text-sm mb-4"
                    style={{ color: 'rgba(245,245,220,0.7)' }}>
                    {section.intro}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {section.services.map((s) => (
                      <div key={s.name} className="rounded-lg p-3"
                        style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>
                        <p className="font-bungee text-[10px] mb-1" style={{ color: '#FFD700', letterSpacing: '0.04em' }}>
                          {s.name}
                        </p>
                        <p className="font-special-elite text-xs" style={{ color: 'rgba(192,192,192,0.6)' }}>
                          {s.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="font-special-elite text-xs" style={{ color: 'rgba(192,192,192,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    {section.outro}
                  </p>
                </>
              )}

              {/* Simple bullet list (Data Storage, Your Rights) */}
              {!section.items && !section.intro && !section.services && !section.publicItems && !section.body && !section.ccpa && section.bullets && (
                <ul className="space-y-2">
                  {section.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2 font-special-elite text-sm"
                      style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.6 }}>
                      <span style={{ color: section.color, flexShrink: 0, marginTop: '2px' }}>◆</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {/* Plain body (Children, Changes) */}
              {section.body && (
                <p className="font-special-elite text-sm" style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.7 }}>
                  {section.body}
                </p>
              )}

              {/* CCPA */}
              {section.ccpa && (
                <>
                  <div className="space-y-4 mb-5">
                    {section.rights.map((r) => (
                      <div key={r.name} className="rounded-xl p-4"
                        style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}>
                        <p className="font-bungee text-xs mb-2"
                          style={{ color: '#FFD700', letterSpacing: '0.06em', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}>
                          {r.name}
                        </p>
                        <p className="font-special-elite text-sm" style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.6 }}>
                          {r.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="font-bungee text-[10px] mb-2 tracking-widest"
                      style={{ color: 'rgba(192,192,192,0.5)' }}>
                      HOW TO EXERCISE YOUR RIGHTS
                    </p>
                    <p className="font-special-elite text-sm" style={{ color: 'rgba(245,245,220,0.7)', lineHeight: 1.6 }}>
                      {section.how}
                    </p>
                  </div>
                </>
              )}

              <Divider color={section.color} />
            </div>
          ))}

          {/* Contact block */}
          <div className="rounded-xl p-6 mb-8 text-center"
            style={{ background: 'rgba(64,224,208,0.05)', border: '1px solid rgba(64,224,208,0.2)' }}>
            <p className="font-bungee text-sm mb-3" style={{ color: '#40E0D0', letterSpacing: '0.05em' }}>
              CONTACT US
            </p>
            <p className="font-special-elite text-sm mb-2" style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.6 }}>
              Questions about privacy or data?
            </p>
            <p className="font-bungee text-xs" style={{ color: '#40E0D0' }}>
              literaryroads@gmail.com
            </p>
          </div>

          {/* Closing */}
          <p className="font-special-elite text-center text-xs italic mb-10"
            style={{ color: 'rgba(192,192,192,0.45)', lineHeight: 1.7 }}>
            The Literary Roads is committed to protecting your privacy while creating a vibrant
            community for book lovers and travelers.
          </p>

          <div className="text-center pb-6 font-bungee text-starlight-turquoise/25 text-xs tracking-widest">
            🚗 &nbsp; HAPPY TRAILS &nbsp; 🚗
          </div>
        </div>
      </div>
    </div>
  );
}
