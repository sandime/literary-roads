import { useEffect, useRef } from 'react';

// ── Starburst firework canvas animation ───────────────────────────────────────
function FireworksCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#FF4E00', '#40E0D0', '#FFD700', '#FF6B2B', '#39FF14', '#C0C0C0'];
    const particles = [];

    class Particle {
      constructor(x, y, color) {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = color;
        this.life = 1;
        this.decay = 0.012 + Math.random() * 0.018;
        this.size = 2 + Math.random() * 3;
        this.gravity = 0.06;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98; this.vy *= 0.98;
        this.life -= this.decay;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const burst = (x, y) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 28 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
    };

    // Initial salvo
    const w = () => canvas.width;
    const h = () => canvas.height;
    const timers = [
      setTimeout(() => burst(w() * 0.25, h() * 0.35), 200),
      setTimeout(() => burst(w() * 0.75, h() * 0.25), 550),
      setTimeout(() => burst(w() * 0.5,  h() * 0.45), 900),
      setTimeout(() => burst(w() * 0.15, h() * 0.6),  1300),
      setTimeout(() => burst(w() * 0.85, h() * 0.55), 1600),
      setTimeout(() => burst(w() * 0.4,  h() * 0.2),  2000),
      setTimeout(() => burst(w() * 0.65, h() * 0.7),  2300),
    ];

    // Periodic random bursts
    const interval = setInterval(() => {
      if (Math.random() < 0.6) {
        burst(w() * (0.1 + Math.random() * 0.8), h() * (0.1 + Math.random() * 0.7));
      }
    }, 2800);

    let raf;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) particles.splice(i, 1);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      timers.forEach(clearTimeout);
      clearInterval(interval);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}

// ── Credit section component ──────────────────────────────────────────────────
function Section({ title, color = '#40E0D0', items }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}22`,
      borderRadius: '14px',
      padding: '18px 20px',
      marginBottom: '16px',
    }}>
      <h2 className="font-bungee" style={{
        fontSize: '12px', letterSpacing: '0.1em',
        color, textShadow: `0 0 10px ${color}88`,
        marginBottom: '12px',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(({ name, desc }) => (
          <div key={name} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ color, fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>▸</span>
            <div>
              <span className="font-bungee" style={{ fontSize: '11px', color: '#F0E6CC', letterSpacing: '0.04em' }}>
                {name}
              </span>
              {desc && (
                <span className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.55)', marginLeft: '6px' }}>
                  — {desc}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Credits component ────────────────────────────────────────────────────
export default function Credits({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 300 }}>
      <FireworksCanvas />

      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: '100%',
        background: 'radial-gradient(ellipse at 50% 0%, #0a0520 0%, #0D0E1A 55%, #04050F 100%)',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px 60px' }}>

          {/* Header */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(4,5,15,0.95)',
            borderBottom: '2px solid rgba(64,224,208,0.3)',
            padding: '14px 0 12px',
            backdropFilter: 'blur(8px)',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={onBack} className="font-special-elite"
                style={{ color: 'rgba(192,192,192,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                ← Back
              </button>
              <h1 className="font-bungee" style={{
                color: '#FFD700', fontSize: '18px', letterSpacing: '0.08em',
                textShadow: '0 0 20px rgba(255,210,0,0.9), 0 0 40px rgba(255,210,0,0.4)',
              }}>
                CREDITS
              </h1>
              <div style={{ width: '48px' }} />
            </div>
          </div>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p className="font-bungee" style={{
              fontSize: '22px', lineHeight: 1.3,
              color: '#40E0D0',
              textShadow: '0 0 24px rgba(64,224,208,0.8)',
              marginBottom: '10px',
            }}>
              THE LITERARY ROADS
            </p>
            <p className="font-special-elite" style={{
              fontSize: '14px', color: 'rgba(245,245,220,0.75)',
              lineHeight: 1.7, fontStyle: 'italic',
              maxWidth: '420px', margin: '0 auto',
            }}>
              Built with gratitude to the tools, services, and communities that make this journey possible.
            </p>
            {/* Neon rule */}
            <div style={{
              margin: '18px auto 0', width: '80px', height: '2px',
              background: 'linear-gradient(to right, transparent, #FF4E00, #40E0D0, transparent)',
            }} />
          </div>

          {/* Sections */}
          <Section title="⚡ APIs & SERVICES" color="#40E0D0" items={[
            { name: 'Google Places API',      desc: 'Location discovery and search' },
            { name: 'Google Books API',        desc: 'Book search and recommendations' },
            { name: 'Mapbox',                  desc: 'Mapping, routing, and navigation' },
            { name: 'Wikipedia API',           desc: 'Literary landmark discovery' },
            { name: 'Firebase (Google)',        desc: 'Authentication and database' },
            { name: 'OpenAI Moderation API',   desc: 'Content safety and moderation' },
          ]} />

          <Section title="📚 DATA SOURCES" color="#FF4E00" items={[
            { name: 'American Library Association', desc: 'Literary Landmarks registry' },
            { name: 'Open Library',                  desc: 'Book metadata and information' },
          ]} />

          <Section title="🎨 DESIGN & ASSETS" color="#FFD700" items={[
            { name: 'Microsoft Copilot', desc: 'Frame and icon design generation' },
            { name: 'Photopea',          desc: 'Image editing and processing' },
            { name: 'Remove.bg',         desc: 'Background removal' },
            { name: 'Gemini',            desc: 'Badge and emoji design generation' },
          ]} />

          <Section title="🛠️ DEVELOPMENT TOOLS" color="#39FF14" items={[
            { name: 'Claude (Anthropic)', desc: 'AI development assistant' },
            { name: 'React',              desc: 'UI framework' },
            { name: 'Vite',               desc: 'Build tool and dev server' },
            { name: 'Tailwind CSS',       desc: 'Styling framework' },
            { name: 'Leaflet',            desc: 'Interactive map rendering' },
            { name: 'Overpass Turbo',     desc: 'Database seeding' },
          ]} />

          {/* Inspiration */}
          <div style={{
            background: 'rgba(255,78,0,0.06)',
            border: '1px solid rgba(255,78,0,0.2)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p className="font-bungee" style={{ fontSize: '11px', color: '#FF4E00', letterSpacing: '0.08em', marginBottom: '10px' }}>
              ✦ INSPIRATION ✦
            </p>
            <p className="font-special-elite" style={{ fontSize: '13px', color: 'rgba(245,245,220,0.8)', lineHeight: 1.8 }}>
              Built for book lovers, independent bookstores, and travelers who believe the journey matters as much as the destination.
            </p>
          </div>

          {/* Special Thanks */}
          <div style={{
            background: 'rgba(64,224,208,0.05)',
            border: '1px solid rgba(64,224,208,0.2)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p className="font-bungee" style={{ fontSize: '11px', color: '#40E0D0', letterSpacing: '0.08em', marginBottom: '10px' }}>
              ✦ SPECIAL THANKS ✦
            </p>
            <p className="font-special-elite" style={{ fontSize: '13px', color: 'rgba(245,245,220,0.75)', lineHeight: 1.8 }}>
              To every indie bookstore, coffee shop, and reader who makes the literary roads worth traveling.
            </p>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
            <p className="font-special-elite" style={{
              fontSize: '11px', color: 'rgba(192,192,192,0.4)',
              lineHeight: 1.7, fontStyle: 'italic',
            }}>
              The Literary Roads is an independent project<br />created with love for the literary community.
            </p>
            <p className="font-bungee" style={{
              fontSize: '11px', color: 'rgba(255,210,0,0.35)',
              letterSpacing: '0.12em', marginTop: '16px',
            }}>
               &nbsp; HAPPY TRAILS &nbsp;
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
