import { useState, useRef, useEffect } from 'react';

const FRAME_SRC = '/literary-roads/images/postcard-frame.png';
const OUTPUT_SIZE = 1080;

const shareCaption = (name) =>
  `📚 Stopped at ${name} on my literary road trip! 🚗 Plan yours at theliteraryroads.com #LiteraryRoads #BookTok #Bookstagram`;

// ── helpers ──────────────────────────────────────────────────────────────────

const isMobileDevice = () =>
  /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

// Center-crop an Image onto a square canvas of `size`
const drawCropped = (ctx, img, size) => {
  const s = Math.min(img.width, img.height);
  const sx = (img.width - s) / 2;
  const sy = (img.height - s) / 2;
  ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
};

const loadImage = (src, crossOrigin) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// ── main component ────────────────────────────────────────────────────────────

export default function PostcardStudio({ location }) {
  // 'capture' | 'webcam' | 'processing' | 'preview'
  const [phase, setPhase] = useState('capture');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [compositeUrl, setCompositeUrl] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [err, setErr] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);    // gallery / upload
  const cameraRef = useRef(null);  // direct camera (mobile)

  // Stop webcam stream on unmount
  useEffect(() => () => stopStream(), []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // ── file inputs ──
  const handleFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    buildComposite(url);
    e.target.value = '';
  };

  // ── webcam ──
  const startWebcam = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setPhase('webcam');
      // Attach stream after render so videoRef is mounted
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setErr('Could not access webcam. Please allow camera access and try again.');
    }
  };

  const captureWebcam = () => {
    const video = videoRef.current;
    if (!video) return;
    const tmp = document.createElement('canvas');
    const s = Math.min(video.videoWidth, video.videoHeight);
    tmp.width = s;
    tmp.height = s;
    tmp.getContext('2d').drawImage(
      video,
      (video.videoWidth - s) / 2, (video.videoHeight - s) / 2, s, s,
      0, 0, s, s,
    );
    tmp.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      setPhotoUrl(url);
      stopStream();
      buildComposite(url);
    }, 'image/jpeg', 0.92);
  };

  // ── composite ──
  const buildComposite = async (src) => {
    setPhase('processing');
    setErr('');
    try {
      await document.fonts.ready;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');

      // 1. User photo (center-cropped)
      const photo = await loadImage(src);
      drawCropped(ctx, photo, OUTPUT_SIZE);

      // 2. Frame overlay (transparent PNG)
      try {
        const frame = await loadImage(FRAME_SRC);
        ctx.drawImage(frame, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      } catch {
        // Frame missing — continue without it
      }

      // 3. Location text bar at bottom
      const barH = Math.round(OUTPUT_SIZE * 0.088);
      const barY = OUTPUT_SIZE - barH;
      ctx.fillStyle = 'rgba(13, 14, 26, 0.84)';
      ctx.fillRect(0, barY, OUTPUT_SIZE, barH);

      // Neon accent line above text bar
      const accentH = Math.round(OUTPUT_SIZE * 0.006);
      const grad = ctx.createLinearGradient(0, 0, OUTPUT_SIZE, 0);
      grad.addColorStop(0,   '#FF4E00');
      grad.addColorStop(0.5, '#40E0D0');
      grad.addColorStop(1,   '#FF4E00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, barY - accentH, OUTPUT_SIZE, accentH);

      // Location name + city
      const city = location.address
        ? ' • ' + location.address.split(',').slice(-2).join(',').trim()
        : '';
      let text = (location.name || 'Literary Stop') + city;

      const fontSize = Math.round(OUTPUT_SIZE * 0.038);
      ctx.font = `${fontSize}px Bungee, sans-serif`;
      ctx.fillStyle = '#40E0D0';
      ctx.shadowColor = 'rgba(64,224,208,0.85)';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate to fit
      while (ctx.measureText(text).width > OUTPUT_SIZE * 0.88 && text.length > 6) {
        text = text.slice(0, -1);
      }
      if (text.length < ((location.name || '') + city).length) text += '…';

      ctx.fillText(text, OUTPUT_SIZE / 2, barY + barH / 2);
      ctx.shadowBlur = 0;

      // 4. Branding watermark (small, bottom-right)
      const wSize = Math.round(OUTPUT_SIZE * 0.022);
      ctx.font = `${wSize}px Bungee, sans-serif`;
      ctx.fillStyle = 'rgba(64,224,208,0.45)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('theliteraryroads.com', OUTPUT_SIZE - Math.round(OUTPUT_SIZE * 0.015), barY - accentH - Math.round(OUTPUT_SIZE * 0.012));

      canvas.toBlob(blob => {
        setCompositeUrl(URL.createObjectURL(blob));
        setPhase('preview');
      }, 'image/png');
    } catch (e) {
      console.error('[PostcardStudio] composite error:', e);
      setErr('Could not create postcard. Please try again.');
      setPhase('capture');
    }
  };

  // ── share / download ──
  const handleShare = async () => {
    if (!compositeUrl) return;
    setSharing(true);
    setShareMsg('');
    try {
      const blob = await fetch(compositeUrl).then(r => r.blob());
      const file = new File([blob], 'literary-roads-postcard.png', { type: 'image/png' });
      const text = shareCaption(location.name || 'this amazing spot');

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Literary Roads Postcard', text });
      } else {
        // Fallback: download
        const a = document.createElement('a');
        a.href = compositeUrl;
        a.download = 'literary-roads-postcard.png';
        a.click();
        setShareMsg('Postcard saved! Upload it to Instagram, TikTok, or anywhere you like 📸');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        // Share was cancelled or failed — try download
        const a = document.createElement('a');
        a.href = compositeUrl;
        a.download = 'literary-roads-postcard.png';
        a.click();
        setShareMsg('Postcard saved to your downloads!');
      }
    } finally {
      setSharing(false);
    }
  };

  const retake = () => {
    if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setCompositeUrl(null);
    setPhotoUrl(null);
    setPhase('capture');
    setErr('');
    setShareMsg('');
  };

  const mobile = isMobileDevice();

  // ── render ────────────────────────────────────────────────────────────────

  // Hidden file inputs (always rendered so refs are stable)
  const fileInputs = (
    <>
      {/* Camera capture — mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
      {/* Gallery / file upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
    </>
  );

  // ── capture phase ──
  if (phase === 'capture') {
    return (
      <div style={{ padding: '8px 0' }}>
        {fileInputs}
        <p className="font-special-elite text-chrome-silver/70 text-xs mb-4 leading-relaxed">
          Create a shareable postcard from this location. Your photo + our frame = instant #BookTok gold.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mobile ? (
            <>
              <button
                onClick={() => cameraRef.current?.click()}
                className="font-bungee w-full py-3 rounded-xl transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF4E00, #FF6B2B)',
                  color: '#1A1B2E', fontSize: '13px', letterSpacing: '0.06em',
                  boxShadow: '0 0 16px rgba(255,78,0,0.45)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                📸 TAKE PHOTO
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="font-bungee w-full py-3 rounded-xl transition-all"
                style={{
                  background: 'transparent', border: '2px solid #40E0D0',
                  color: '#40E0D0', fontSize: '13px', letterSpacing: '0.06em',
                  cursor: 'pointer',
                }}
              >
                🖼️ CHOOSE FROM GALLERY
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startWebcam}
                className="font-bungee w-full py-3 rounded-xl transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF4E00, #FF6B2B)',
                  color: '#1A1B2E', fontSize: '13px', letterSpacing: '0.06em',
                  boxShadow: '0 0 16px rgba(255,78,0,0.45)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                📸 USE WEBCAM
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="font-bungee w-full py-3 rounded-xl transition-all"
                style={{
                  background: 'transparent', border: '2px solid #40E0D0',
                  color: '#40E0D0', fontSize: '13px', letterSpacing: '0.06em',
                  cursor: 'pointer',
                }}
              >
                🖼️ UPLOAD PHOTO
              </button>
            </>
          )}
        </div>

        {err && (
          <p className="font-special-elite text-atomic-orange text-xs mt-3 text-center">{err}</p>
        )}
      </div>
    );
  }

  // ── webcam phase ──
  if (phase === 'webcam') {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{
          position: 'relative', width: '100%', paddingBottom: '100%',
          borderRadius: '12px', overflow: 'hidden',
          border: '2px solid rgba(64,224,208,0.4)',
          background: '#000', marginBottom: '12px',
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { stopStream(); setPhase('capture'); }}
            className="font-bungee py-2.5 rounded-xl flex-shrink-0"
            style={{
              background: 'transparent', border: '1.5px solid rgba(192,192,192,0.3)',
              color: 'rgba(192,192,192,0.6)', fontSize: '11px', padding: '10px 16px',
              cursor: 'pointer',
            }}
          >
            ← BACK
          </button>
          <button
            onClick={captureWebcam}
            className="font-bungee py-2.5 rounded-xl flex-1"
            style={{
              background: 'linear-gradient(135deg, #FF4E00, #FF6B2B)',
              color: '#1A1B2E', fontSize: '13px', letterSpacing: '0.06em',
              boxShadow: '0 0 16px rgba(255,78,0,0.45)',
              border: 'none', cursor: 'pointer',
            }}
          >
            📸 CAPTURE
          </button>
        </div>
      </div>
    );
  }

  // ── processing phase ──
  if (phase === 'processing') {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px',
          border: '3px solid #40E0D0', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
        <p className="font-bungee text-starlight-turquoise text-xs" style={{ letterSpacing: '0.08em' }}>
          CREATING YOUR POSTCARD...
        </p>
      </div>
    );
  }

  // ── preview phase ──
  return (
    <div style={{ padding: '8px 0' }}>
      {/* Composite preview */}
      <div style={{
        position: 'relative', width: '100%', paddingBottom: '100%',
        borderRadius: '12px', overflow: 'hidden',
        border: '2px solid rgba(64,224,208,0.5)',
        boxShadow: '0 0 20px rgba(64,224,208,0.2)',
        marginBottom: '12px',
      }}>
        {compositeUrl && (
          <img
            src={compositeUrl}
            alt="Postcard preview"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
        <button
          onClick={retake}
          className="font-bungee py-2.5 rounded-xl flex-shrink-0"
          style={{
            background: 'transparent', border: '1.5px solid rgba(192,192,192,0.3)',
            color: 'rgba(192,192,192,0.7)', fontSize: '11px', padding: '10px 16px',
            cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          ↺ RETAKE
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="font-bungee flex-1 rounded-xl transition-all"
          style={{
            background: sharing ? 'rgba(64,224,208,0.2)' : 'linear-gradient(135deg, #40E0D0, #00C4B4)',
            color: '#1A1B2E', fontSize: '13px', letterSpacing: '0.06em',
            boxShadow: sharing ? 'none' : '0 0 18px rgba(64,224,208,0.5)',
            border: 'none', cursor: sharing ? 'default' : 'pointer',
            padding: '10px',
          }}
        >
          {sharing ? 'SHARING...' : '📤 SHARE / SAVE'}
        </button>
      </div>

      {shareMsg && (
        <p className="font-special-elite text-starlight-turquoise/80 text-xs text-center leading-relaxed">
          {shareMsg}
        </p>
      )}

      {/* Caption preview */}
      <div style={{
        marginTop: '10px', padding: '10px 12px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
      }}>
        <p className="font-special-elite text-chrome-silver/50 text-xs" style={{ fontSize: '10px', lineHeight: 1.5 }}>
          {shareCaption(location.name || 'this stop')}
        </p>
      </div>
    </div>
  );
}
