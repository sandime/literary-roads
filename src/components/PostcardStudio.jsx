import { useState, useRef, useEffect } from 'react';

// ── Frame / orientation config ────────────────────────────────────────────────
const FRAMES = {
  square: [
    { id: 'sq1', label: 'Design 1', src: '/literary-roads/images/postcard-frame.png' },
    { id: 'sq2', label: 'Design 2', src: '/literary-roads/images/postcard-square-2.png' },
    { id: 'sq3', label: 'Design 3', src: '/literary-roads/images/postcard-square-3.png' },
    { id: 'sq4', label: 'Cats',     src: '/literary-roads/images/postcard-square-cats.png' },
  ],
  portrait: [
    { id: 'pt1', label: 'Design 1', src: '/literary-roads/images/postcard-portrait.png' },
    { id: 'pt2', label: 'Design 2', src: '/literary-roads/images/postcard-portrait-2.png' },
    { id: 'pt3', label: 'Design 3', src: '/literary-roads/images/postcard-portrait-3.png' },
  ],
  landscape: [
    { id: 'ls1', label: 'Design 1', src: '/literary-roads/images/postcard-landscape.png' },
    { id: 'ls2', label: 'Design 2', src: '/literary-roads/images/postcard-landscape-2.png' },
  ],
};

const OUTPUT_DIMS = {
  square:    { w: 1080, h: 1080 },
  portrait:  { w: 1080, h: 1920 },
  landscape: { w: 1920, h: 1080 },
};

const ORIENTATIONS = [
  { key: 'portrait',  label: 'Portrait',  ratio: '9:16',  ar: 9 / 16 },
  { key: 'square',    label: 'Square',    ratio: '1:1',   ar: 1 },
  { key: 'landscape', label: 'Landscape', ratio: '16:9',  ar: 16 / 9 },
];

const shareCaption = (name) =>
  `📚 Stopped at ${name} on my literary road trip! 🚗 Plan yours at theliteraryroads.com #LiteraryRoads #BookTok #Bookstagram`;

// ── helpers ───────────────────────────────────────────────────────────────────
const isMobileDevice = () =>
  /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

const loadImage = (src, crossOrigin) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Draw photo on canvas with pan/zoom/rotate adjustments.
// cW/cH = the display container size used during adjustment (for coord mapping).
const drawPhotoAdjusted = (ctx, photo, w, h, { scale, x, y, rotate, cW, cH }) => {
  const rX = cW > 0 ? w / cW : 1;
  const rY = cH > 0 ? h / cH : 1;
  ctx.save();
  ctx.translate(w / 2 + x * rX, h / 2 + y * rY);
  ctx.rotate(rotate * Math.PI / 180);
  ctx.scale(scale, scale);
  // center-crop source rect
  const ar  = photo.width / photo.height;
  const tar = w / h;
  let sx, sy, sw, sh;
  if (ar > tar) { sh = photo.height; sw = sh * tar; sx = (photo.width - sw) / 2; sy = 0; }
  else          { sw = photo.width;  sh = sw / tar; sx = 0; sy = (photo.height - sh) / 2; }
  ctx.drawImage(photo, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  ctx.restore();
};

// Inline button style helpers
const btnPrimary   = { background: 'linear-gradient(135deg,#FF4E00,#FF6B2B)', color: '#1A1B2E', border: 'none', cursor: 'pointer', boxShadow: '0 0 16px rgba(255,78,0,0.45)' };
const btnOutlineTurq = { background: 'transparent', border: '2px solid #40E0D0', color: '#40E0D0', cursor: 'pointer' };
const btnOutlineGray = { background: 'transparent', border: '1.5px solid rgba(192,192,192,0.3)', color: 'rgba(192,192,192,0.6)', cursor: 'pointer' };

// ── main component ────────────────────────────────────────────────────────────
export default function PostcardStudio({ location }) {
  // phases: 'pick' | 'capture' | 'webcam' | 'adjust' | 'processing' | 'preview'
  const [phase, setPhase] = useState('pick');
  const [orientation, setOrientation] = useState('portrait');
  const [frameId, setFrameId] = useState('pt1');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [compositeUrl, setCompositeUrl] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [err, setErr] = useState('');
  // Photo adjustments
  const [adjScale,  setAdjScale]  = useState(1);   // 0.5 – 2
  const [adjX,      setAdjX]      = useState(0);   // px offset in display space
  const [adjY,      setAdjY]      = useState(0);
  const [adjRotate, setAdjRotate] = useState(0);   // degrees

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const fileRef      = useRef(null);
  const cameraRef    = useRef(null);
  const adjContainer = useRef(null);   // div wrapping the interactive preview
  const adjDrag      = useRef(null);   // current drag state
  const containerSz  = useRef({ w: 0, h: 0 }); // display size of adjContainer

  useEffect(() => () => stopStream(), []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const currentFrames = FRAMES[orientation];
  const currentFrame  = currentFrames.find(f => f.id === frameId) ?? currentFrames[0];

  const selectOrientation = (key) => {
    setOrientation(key);
    setFrameId(FRAMES[key][0].id);
  };

  const { w: outW, h: outH } = OUTPUT_DIMS[orientation];
  const previewPadding = `${(outH / outW) * 100}%`;

  const resetAdj = () => { setAdjScale(1); setAdjX(0); setAdjY(0); setAdjRotate(0); };

  // ── file inputs (always mounted) ─────────────────────────────────────────
  const fileInputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFileChosen} />
      <input ref={fileRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handleFileChosen} />
    </>
  );

  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    resetAdj();
    setPhase('adjust');
    e.target.value = '';
  }

  // ── webcam ────────────────────────────────────────────────────────────────
  const startWebcam = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: outW }, height: { ideal: outH } },
      });
      streamRef.current = stream;
      setPhase('webcam');
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream; });
    } catch {
      setErr('Could not access webcam. Please allow camera access and try again.');
    }
  };

  const captureWebcam = () => {
    const video = videoRef.current;
    if (!video) return;
    const aspect = outW / outH;
    let sw, sh;
    if (video.videoWidth / video.videoHeight > aspect) {
      sh = video.videoHeight; sw = sh * aspect;
    } else {
      sw = video.videoWidth; sh = sw / aspect;
    }
    const tmp = document.createElement('canvas');
    tmp.width = sw; tmp.height = sh;
    tmp.getContext('2d').drawImage(
      video,
      (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh,
      0, 0, sw, sh,
    );
    tmp.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      setPhotoUrl(url);
      stopStream();
      resetAdj();
      setPhase('adjust');
    }, 'image/jpeg', 0.92);
  };

  // ── adjust phase — touch drag (pan + pinch) ───────────────────────────────
  const onAdjTouchStart = (e) => {
    if (e.touches.length === 1) {
      adjDrag.current = { mode: 'pan', x0: e.touches[0].clientX, y0: e.touches[0].clientY, ax: adjX, ay: adjY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      adjDrag.current = { mode: 'pinch', dist0: Math.hypot(dx, dy), scale0: adjScale };
    }
  };
  const onAdjTouchMove = (e) => {
    e.preventDefault();
    if (!adjDrag.current) return;
    if (adjDrag.current.mode === 'pan' && e.touches.length === 1) {
      setAdjX(adjDrag.current.ax + e.touches[0].clientX - adjDrag.current.x0);
      setAdjY(adjDrag.current.ay + e.touches[0].clientY - adjDrag.current.y0);
    } else if (adjDrag.current.mode === 'pinch' && e.touches.length === 2) {
      const dx   = e.touches[1].clientX - e.touches[0].clientX;
      const dy   = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const next = Math.min(2, Math.max(0.5, adjDrag.current.scale0 * dist / adjDrag.current.dist0));
      setAdjScale(next);
    }
  };
  const onAdjTouchEnd = () => { adjDrag.current = null; };

  // ── adjust phase — mouse drag (pan) ──────────────────────────────────────
  const onAdjMouseDown = (e) => {
    adjDrag.current = { mode: 'pan', x0: e.clientX, y0: e.clientY, ax: adjX, ay: adjY };
    e.preventDefault();
  };
  const onAdjMouseMove = (e) => {
    if (!adjDrag.current) return;
    setAdjX(adjDrag.current.ax + e.clientX - adjDrag.current.x0);
    setAdjY(adjDrag.current.ay + e.clientY - adjDrag.current.y0);
  };
  const onAdjMouseUp = () => { adjDrag.current = null; };

  // ── composite builder ─────────────────────────────────────────────────────
  const buildComposite = async (src, orient, frame, adjusts) => {
    setPhase('processing');
    setErr('');
    try {
      await document.fonts.ready;
      const { w, h } = OUTPUT_DIMS[orient];
      const base = Math.min(w, h);

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');

      // 1. Photo with adjustments
      const photo = await loadImage(src);
      drawPhotoAdjusted(ctx, photo, w, h, adjusts);

      // 2. Frame overlay
      try {
        const frameImg = await loadImage(frame.src);
        ctx.drawImage(frameImg, 0, 0, w, h);
      } catch { /* missing frame — continue */ }

      // 3. Text bar at bottom
      const barH   = Math.round(base * 0.088);
      const barY   = h - barH;
      ctx.fillStyle = 'rgba(13,14,26,0.84)';
      ctx.fillRect(0, barY, w, barH);

      const accentH = Math.round(base * 0.006);
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#FF4E00'); grad.addColorStop(0.5, '#40E0D0'); grad.addColorStop(1, '#FF4E00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, barY - accentH, w, accentH);

      const city = location.address
        ? ' • ' + location.address.split(',').slice(-2).join(',').trim() : '';
      let text = (location.name || 'Literary Stop') + city;
      const fontSize = Math.round(base * 0.024);
      ctx.font = `${fontSize}px Bungee, sans-serif`;
      ctx.fillStyle = '#40E0D0';
      ctx.shadowColor = 'rgba(64,224,208,0.85)'; ctx.shadowBlur = 16;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      while (ctx.measureText(text).width > w * 0.88 && text.length > 6) text = text.slice(0, -1);
      if (text.length < ((location.name || '') + city).length) text += '…';
      ctx.fillText(text, w / 2, barY + barH / 2);
      ctx.shadowBlur = 0;

      // 4. Watermark
      const wSize = Math.round(base * 0.022);
      ctx.font = `${wSize}px Bungee, sans-serif`;
      ctx.fillStyle = 'rgba(64,224,208,0.45)';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('theliteraryroads.com', w - Math.round(base * 0.015), barY - accentH - Math.round(base * 0.012));

      canvas.toBlob(blob => {
        setCompositeUrl(URL.createObjectURL(blob));
        setPhase('preview');
      }, 'image/png');
    } catch (e) {
      console.error('[PostcardStudio] composite error:', e);
      setErr('Could not create postcard. Please try again.');
      setPhase('adjust');
    }
  };

  const doComposite = () => {
    const { w: cW, h: cH } = containerSz.current;
    buildComposite(photoUrl, orientation, currentFrame, { scale: adjScale, x: adjX, y: adjY, rotate: adjRotate, cW, cH });
  };

  // ── share / download ──────────────────────────────────────────────────────
  const startOver = () => {
    if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setCompositeUrl(null); setPhotoUrl(null);
    resetAdj();
    setShareSuccess(false); setShareMsg(''); setErr('');
    setPhase('pick');
  };

  const handleShare = async () => {
    if (!compositeUrl) return;
    setSharing(true); setShareMsg('');
    try {
      const blob = await fetch(compositeUrl).then(r => r.blob());
      const file = new File([blob], 'literary-roads-postcard.png', { type: 'image/png' });
      const text = shareCaption(location.name || 'this amazing spot');
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Literary Roads Postcard', text });
        setShareSuccess(true);
      } else {
        const a = document.createElement('a');
        a.href = compositeUrl; a.download = 'literary-roads-postcard.png'; a.click();
        setShareSuccess(true);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        const a = document.createElement('a');
        a.href = compositeUrl; a.download = 'literary-roads-postcard.png'; a.click();
        setShareSuccess(true);
      }
    } finally { setSharing(false); }
  };

  const retake = () => {
    if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setCompositeUrl(null); setPhotoUrl(null);
    resetAdj();
    setPhase('capture'); setErr(''); setShareMsg('');
  };

  const changePick = () => {
    // Keep photoUrl + adjustments — just re-pick the frame
    if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    setCompositeUrl(null);
    setPhase('pick'); setErr(''); setShareMsg('');
  };

  const mobile = isMobileDevice();

  // ── PICK phase ────────────────────────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <div style={{ padding: '8px 0' }}>

        {/* Step 1 — Orientation */}
        <p className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', marginBottom: '8px' }}>
          CHOOSE POSTCARD SIZE
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {ORIENTATIONS.map(({ key, label, ratio, ar }) => {
            const sel = orientation === key;
            const boxStyle = ar === 1
              ? { width: '32px', height: '32px' }
              : ar < 1
                ? { width: `${Math.round(ar * 32)}px`, height: '32px' }
                : { width: '32px', height: `${Math.round(32 / ar)}px` };
            return (
              <button key={key} onClick={() => selectOrientation(key)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '8px', padding: '10px 6px',
                background: sel ? 'rgba(64,224,208,0.1)' : 'transparent',
                border: `2px solid ${sel ? '#40E0D0' : 'rgba(192,192,192,0.2)'}`,
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: sel ? '0 0 10px rgba(64,224,208,0.25)' : 'none',
              }}>
                <div style={{ ...boxStyle, borderRadius: '3px', background: sel ? 'rgba(64,224,208,0.3)' : 'rgba(192,192,192,0.12)', border: `1.5px solid ${sel ? '#40E0D0' : 'rgba(192,192,192,0.25)'}` }} />
                <div>
                  <p className="font-bungee" style={{ fontSize: '9px', color: sel ? '#40E0D0' : 'rgba(192,192,192,0.6)', letterSpacing: '0.06em', textAlign: 'center' }}>{label}</p>
                  <p className="font-special-elite" style={{ fontSize: '9px', color: sel ? 'rgba(64,224,208,0.55)' : 'rgba(192,192,192,0.35)', textAlign: 'center' }}>{ratio}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step 2 — Design */}
        <p className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', marginBottom: '8px' }}>
          CHOOSE YOUR DESIGN
        </p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          {currentFrames.map(f => {
            const sel = frameId === f.id;
            const thumbW = 72;
            const thumbH = Math.round(thumbW * outH / outW);
            return (
              <button key={f.id} onClick={() => setFrameId(f.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px',
                background: sel ? 'rgba(64,224,208,0.1)' : 'transparent',
                border: `2px solid ${sel ? '#40E0D0' : 'rgba(192,192,192,0.2)'}`,
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: sel ? '0 0 10px rgba(64,224,208,0.25)' : 'none',
              }}>
                <div style={{ width: `${thumbW}px`, height: `${thumbH}px`, borderRadius: '5px', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${sel ? '#40E0D0' : 'rgba(192,192,192,0.2)'}`, background: '#1A1B2E' }}>
                  <img src={f.src} alt={f.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <p className="font-bungee" style={{ fontSize: '9px', color: sel ? '#40E0D0' : 'rgba(192,192,192,0.55)', letterSpacing: '0.05em' }}>{f.label}</p>
              </button>
            );
          })}
        </div>

        {/* Photo-in-hand hint */}
        {photoUrl && (
          <p className="font-special-elite" style={{ fontSize: '10px', color: 'rgba(64,224,208,0.55)', textAlign: 'center', marginBottom: '10px' }}>
            Your photo is saved — changing frame only
          </p>
        )}

        {/* Continue / re-apply */}
        <button
          onClick={() => {
            if (photoUrl) {
              const { w: cW, h: cH } = containerSz.current;
              buildComposite(photoUrl, orientation, currentFrame, { scale: adjScale, x: adjX, y: adjY, rotate: adjRotate, cW, cH });
            } else {
              setPhase('capture');
            }
          }}
          className="font-bungee w-full py-3 rounded-xl"
          style={{ ...btnPrimary, fontSize: '13px', letterSpacing: '0.06em' }}
        >
          {photoUrl ? 'APPLY FRAME →' : 'CREATE POSTCARD →'}
        </button>
      </div>
    );
  }

  // ── CAPTURE phase ─────────────────────────────────────────────────────────
  if (phase === 'capture') {
    return (
      <div style={{ padding: '8px 0' }}>
        {fileInputs}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <p className="font-special-elite text-chrome-silver/70 text-xs leading-relaxed">
            {ORIENTATIONS.find(o => o.key === orientation)?.label} · {currentFrame.label}
          </p>
          <button onClick={() => setPhase('pick')} className="font-special-elite"
            style={{ color: 'rgba(64,224,208,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
            ← Change
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mobile ? (
            <>
              <button onClick={() => cameraRef.current?.click()} className="font-bungee w-full py-3 rounded-xl"
                style={{ ...btnPrimary, fontSize: '13px', letterSpacing: '0.06em' }}>
                📸 TAKE PHOTO
              </button>
              <button onClick={() => fileRef.current?.click()} className="font-bungee w-full py-3 rounded-xl"
                style={{ ...btnOutlineTurq, fontSize: '13px', letterSpacing: '0.06em' }}>
                🖼️ CHOOSE FROM GALLERY
              </button>
            </>
          ) : (
            <>
              <button onClick={startWebcam} className="font-bungee w-full py-3 rounded-xl"
                style={{ ...btnPrimary, fontSize: '13px', letterSpacing: '0.06em' }}>
                📸 USE WEBCAM
              </button>
              <button onClick={() => fileRef.current?.click()} className="font-bungee w-full py-3 rounded-xl"
                style={{ ...btnOutlineTurq, fontSize: '13px', letterSpacing: '0.06em' }}>
                🖼️ UPLOAD PHOTO
              </button>
            </>
          )}
        </div>
        {err && <p className="font-special-elite text-atomic-orange text-xs mt-3 text-center">{err}</p>}
      </div>
    );
  }

  // ── WEBCAM phase ──────────────────────────────────────────────────────────
  if (phase === 'webcam') {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{
          position: 'relative', width: '100%', paddingBottom: previewPadding,
          borderRadius: '12px', overflow: 'hidden',
          border: '2px solid rgba(64,224,208,0.4)', background: '#000', marginBottom: '12px',
        }}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { stopStream(); setPhase('capture'); }} className="font-bungee rounded-xl flex-shrink-0"
            style={{ ...btnOutlineGray, fontSize: '11px', padding: '10px 16px' }}>
            ← BACK
          </button>
          <button onClick={captureWebcam} className="font-bungee rounded-xl flex-1"
            style={{ ...btnPrimary, fontSize: '13px', letterSpacing: '0.06em', padding: '10px' }}>
            📸 CAPTURE
          </button>
        </div>
      </div>
    );
  }

  // ── ADJUST phase ──────────────────────────────────────────────────────────
  if (phase === 'adjust') {
    const pct = Math.round(adjScale * 100);
    return (
      <div style={{ padding: '8px 0' }}>
        {fileInputs}

        {/* Interactive photo + frame preview */}
        <div
          ref={(el) => {
            adjContainer.current = el;
            if (el) { const r = el.getBoundingClientRect(); containerSz.current = { w: r.width, h: r.height }; }
          }}
          style={{
            position: 'relative', width: '100%', paddingBottom: previewPadding,
            borderRadius: '12px', overflow: 'hidden',
            border: '2px solid rgba(64,224,208,0.4)',
            marginBottom: '12px', cursor: 'grab', touchAction: 'none',
            userSelect: 'none',
          }}
          onMouseDown={onAdjMouseDown}
          onMouseMove={onAdjMouseMove}
          onMouseUp={onAdjMouseUp}
          onMouseLeave={onAdjMouseUp}
          onTouchStart={onAdjTouchStart}
          onTouchMove={onAdjTouchMove}
          onTouchEnd={onAdjTouchEnd}
        >
          {/* Photo layer — CSS-transformed */}
          {photoUrl && (
            <img
              src={photoUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', pointerEvents: 'none',
                transform: `translate(${adjX}px,${adjY}px) scale(${adjScale}) rotate(${adjRotate}deg)`,
                transformOrigin: 'center center',
              }}
            />
          )}
          {/* Frame overlay */}
          <img
            src={currentFrame.src}
            alt=""
            draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
          />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="font-bungee" style={{ fontSize: '9px', color: 'rgba(0,217,255,0.65)', letterSpacing: '0.07em', width: '40px', flexShrink: 0 }}>ZOOM</span>
            <input
              type="range" min={50} max={200} step={1} value={pct}
              onChange={(e) => setAdjScale(Number(e.target.value) / 100)}
              style={{ flex: 1, accentColor: '#40E0D0', cursor: 'pointer' }}
            />
            <span className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.55)', width: '36px', textAlign: 'right', flexShrink: 0 }}>
              {pct}%
            </span>
          </div>

          {/* Rotate */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="font-bungee" style={{ fontSize: '9px', color: 'rgba(0,217,255,0.65)', letterSpacing: '0.07em', width: '40px', flexShrink: 0 }}>ROTATE</span>
            <input
              type="range" min={-45} max={45} step={0.5} value={adjRotate}
              onChange={(e) => setAdjRotate(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#40E0D0', cursor: 'pointer' }}
            />
            <span className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.55)', width: '36px', textAlign: 'right', flexShrink: 0 }}>
              {adjRotate > 0 ? '+' : ''}{Math.round(adjRotate)}°
            </span>
          </div>

          {/* Pan hint */}
          <p className="font-special-elite" style={{ fontSize: '10px', color: 'rgba(192,192,192,0.35)', textAlign: 'center' }}>
            {mobile ? 'Drag to pan · Pinch to zoom' : 'Drag to pan · Use slider to zoom'}
          </p>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={retake} className="font-bungee rounded-xl"
            style={{ ...btnOutlineGray, fontSize: '10px', padding: '10px 10px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            ↺ RETAKE
          </button>
          <button onClick={() => { resetAdj(); }} className="font-bungee rounded-xl"
            style={{ ...btnOutlineGray, fontSize: '10px', padding: '10px 10px', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderColor: 'rgba(64,224,208,0.3)', color: 'rgba(64,224,208,0.5)' }}>
            RESET
          </button>
          <button onClick={doComposite} className="font-bungee flex-1 rounded-xl"
            style={{ ...btnPrimary, fontSize: '11px', letterSpacing: '0.06em', padding: '10px 8px' }}>
            LOOKS GOOD →
          </button>
        </div>

        {err && <p className="font-special-elite text-atomic-orange text-xs mt-3 text-center">{err}</p>}
      </div>
    );
  }

  // ── PROCESSING phase ──────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #40E0D0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p className="font-bungee text-starlight-turquoise text-xs" style={{ letterSpacing: '0.08em' }}>
          CREATING YOUR POSTCARD...
        </p>
      </div>
    );
  }

  // ── PREVIEW phase ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '8px 0' }}>
      {/* Postcard thumbnail */}
      <div style={{
        position: 'relative', width: '100%', paddingBottom: previewPadding,
        borderRadius: '12px', overflow: 'hidden',
        border: `2px solid ${shareSuccess ? 'rgba(57,255,20,0.5)' : 'rgba(64,224,208,0.5)'}`,
        boxShadow: shareSuccess ? '0 0 20px rgba(57,255,20,0.2)' : '0 0 20px rgba(64,224,208,0.2)',
        marginBottom: '12px', transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        {compositeUrl && (
          <img src={compositeUrl} alt="Postcard preview"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>

      {/* ── After-share success screen ── */}
      {shareSuccess ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Success banner */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(57,255,20,0.08)', border: '1.5px solid rgba(57,255,20,0.3)',
          }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            <p className="font-bungee" style={{ fontSize: '11px', color: '#39FF14', letterSpacing: '0.06em' }}>
              POSTCARD SHARED!
            </p>
          </div>

          {/* Take Another Photo */}
          <button
            onClick={startOver}
            className="font-bungee w-full py-3 rounded-xl"
            style={{ ...btnPrimary, fontSize: '13px', letterSpacing: '0.06em' }}
          >
            📸 TAKE ANOTHER PHOTO
          </button>

          {/* Done */}
          <button
            onClick={startOver}
            className="font-bungee w-full py-2.5 rounded-xl"
            style={{ ...btnOutlineGray, fontSize: '12px', letterSpacing: '0.05em' }}
          >
            DONE
          </button>
        </div>
      ) : (
        /* ── Normal preview controls ── */
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => { if (compositeUrl) URL.revokeObjectURL(compositeUrl); setCompositeUrl(null); setPhase('adjust'); }}
              className="font-bungee rounded-xl"
              style={{ ...btnOutlineGray, fontSize: '10px', padding: '10px 10px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              ✏️ ADJUST
            </button>
            <button onClick={changePick} className="font-bungee rounded-xl"
              style={{ background: 'transparent', border: '1.5px solid rgba(64,224,208,0.35)', color: 'rgba(64,224,208,0.65)', cursor: 'pointer', fontSize: '10px', padding: '10px 10px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              🎨 FRAME
            </button>
            <button onClick={handleShare} disabled={sharing} className="font-bungee flex-1 rounded-xl"
              style={{
                background: sharing ? 'rgba(64,224,208,0.2)' : 'linear-gradient(135deg,#40E0D0,#00C4B4)',
                color: '#1A1B2E', fontSize: '12px', letterSpacing: '0.06em',
                boxShadow: sharing ? 'none' : '0 0 18px rgba(64,224,208,0.5)',
                border: 'none', cursor: sharing ? 'default' : 'pointer', padding: '10px 8px',
              }}>
              {sharing ? 'SHARING...' : '📤 SHARE'}
            </button>
          </div>

          <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
            <p className="font-special-elite text-chrome-silver/50" style={{ fontSize: '10px', lineHeight: 1.5 }}>
              {shareCaption(location.name || 'this stop')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
