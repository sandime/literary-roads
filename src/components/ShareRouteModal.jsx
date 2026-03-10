import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createSharedRoute, incrementShareCount } from '../utils/sharedRoutes';

const ShareRouteModal = ({ route, onClose }) => {
  const { user } = useAuth();
  const [shareUrl, setShareUrl]       = useState('');
  const [sharedRouteId, setSharedRouteId] = useState(null);
  const [generating, setGenerating]   = useState(false);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState('');

  const stopLine = [
    route.bookstoreCount > 0 && `📚 ${route.bookstoreCount} bookstore${route.bookstoreCount !== 1 ? 's' : ''}`,
    route.cafeCount      > 0 && `☕ ${route.cafeCount} café${route.cafeCount !== 1 ? 's' : ''}`,
    route.landmarkCount  > 0 && `🌲 ${route.landmarkCount} landmark${route.landmarkCount !== 1 ? 's' : ''}`,
  ].filter(Boolean).join('  ');

  const shareText =
    `📚 Check out my literary road trip` +
    (route.startCity ? ` from ${route.startCity}` : '') +
    (route.endCity   ? ` to ${route.endCity}` : '') + `!\n` +
    (stopLine ? stopLine + `\n` : '') +
    `Plan yours at The Literary Roads! #LiteraryRoads`;

  const getOrCreateUrl = async () => {
    if (shareUrl) return { url: shareUrl, id: sharedRouteId };
    setGenerating(true);
    setError('');
    try {
      const id  = await createSharedRoute(user.uid, user.displayName, route);
      const url = `${window.location.origin}${import.meta.env.BASE_URL}route/${id}`;
      setSharedRouteId(id);
      setShareUrl(url);
      return { url, id };
    } catch (e) {
      setError('Could not generate link. Try again.');
      return {};
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    const { url, id } = await getOrCreateUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => {});
    if (id) incrementShareCount(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSocial = async (platform) => {
    const { url, id } = await getOrCreateUrl();
    if (!url) return;
    if (id) incrementShareCount(id);
    const t = encodeURIComponent(shareText);
    const u = encodeURIComponent(url);
    const links = {
      twitter:  `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      email:    `mailto:?subject=${encodeURIComponent('Literary Road Trip: ' + route.routeName)}&body=${encodeURIComponent(shareText + '\n\n' + url)}`,
      sms:      `sms:?body=${encodeURIComponent(shareText + '\n' + url)}`,
    };
    window.open(links[platform], '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md bg-midnight-navy border-2 border-starlight-turquoise rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 0 40px rgba(64,224,208,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-starlight-turquoise/20">
          <div>
            <h2 className="text-starlight-turquoise font-bungee text-lg leading-tight drop-shadow-[0_0_8px_rgba(64,224,208,0.6)]">
              SHARE YOUR ROUTE
            </h2>
            <p className="text-chrome-silver font-special-elite text-xs mt-0.5 truncate max-w-[260px]">
              {route.routeName}
            </p>
          </div>
          <button onClick={onClose} className="text-chrome-silver hover:text-atomic-orange transition-colors p-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Route summary */}
          <div className="bg-black/40 border border-starlight-turquoise/25 rounded-lg p-3">
            <p className="text-paper-white font-special-elite text-sm">
              {route.startCity || '—'} → {route.endCity || '—'}
            </p>
            <div className="flex flex-wrap gap-x-3 mt-1 text-xs font-special-elite">
              {route.bookstoreCount > 0 && <span className="text-atomic-orange">📚 {route.bookstoreCount}</span>}
              {route.cafeCount      > 0 && <span className="text-starlight-turquoise">☕ {route.cafeCount}</span>}
              {route.landmarkCount  > 0 && <span style={{ color: '#39FF14' }}>🌲 {route.landmarkCount}</span>}
            </div>
          </div>

          {/* Pre-filled share text */}
          <div>
            <label className="text-chrome-silver/70 font-special-elite text-xs mb-1 block">SHARE TEXT</label>
            <textarea
              readOnly
              value={shareText}
              className="w-full bg-black/40 border border-starlight-turquoise/30 text-paper-white/80 font-special-elite text-xs rounded-lg px-3 py-2 resize-none focus:outline-none"
              rows={4}
            />
          </div>

          {/* Generated URL preview */}
          {shareUrl && (
            <div className="bg-black/40 border border-starlight-turquoise/30 rounded-lg px-3 py-2">
              <p className="text-starlight-turquoise/70 font-special-elite text-[11px] truncate">{shareUrl}</p>
            </div>
          )}

          {error && <p className="text-atomic-orange font-special-elite text-xs text-center">{error}</p>}

          {/* Copy Link — primary action */}
          <button
            onClick={handleCopyLink}
            disabled={generating}
            className="w-full bg-starlight-turquoise text-midnight-navy font-bungee py-3 rounded-lg hover:bg-atomic-orange transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-midnight-navy border-t-transparent rounded-full animate-spin" />
                GENERATING…
              </>
            ) : copied ? (
              <>✓ LINK COPIED!</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                COPY LINK
              </>
            )}
          </button>

          {/* Social sharing grid */}
          <div>
            <p className="text-chrome-silver/50 font-special-elite text-[11px] text-center mb-2">SHARE VIA</p>
            <div className="grid grid-cols-4 gap-2">
              {/* SMS / Text */}
              <button onClick={() => handleSocial('sms')} disabled={generating}
                className="flex flex-col items-center gap-1 bg-black/40 border border-starlight-turquoise/20 hover:border-starlight-turquoise rounded-lg py-2.5 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-starlight-turquoise" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2z" />
                </svg>
                <span className="font-bungee text-[9px] text-chrome-silver/70">TEXT</span>
              </button>

              {/* Email */}
              <button onClick={() => handleSocial('email')} disabled={generating}
                className="flex flex-col items-center gap-1 bg-black/40 border border-starlight-turquoise/20 hover:border-starlight-turquoise rounded-lg py-2.5 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-starlight-turquoise" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-bungee text-[9px] text-chrome-silver/70">EMAIL</span>
              </button>

              {/* Facebook */}
              <button onClick={() => handleSocial('facebook')} disabled={generating}
                className="flex flex-col items-center gap-1 bg-black/40 border border-starlight-turquoise/20 hover:border-[#1877F2] rounded-lg py-2.5 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="font-bungee text-[9px] text-chrome-silver/70">FB</span>
              </button>

              {/* Twitter / X */}
              <button onClick={() => handleSocial('twitter')} disabled={generating}
                className="flex flex-col items-center gap-1 bg-black/40 border border-starlight-turquoise/20 hover:border-white rounded-lg py-2.5 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-paper-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="font-bungee text-[9px] text-chrome-silver/70">X</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareRouteModal;
