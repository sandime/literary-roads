// src/screens/SalonScreen.jsx
// The Salon — bimonthly community reading room.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  subscribeToActiveSalon, subscribeToSalonCards, computeEnrollment, formatSalonDates,
} from '../utils/salon';
import { SalonEntryJoin, SalonEntryEnrolled } from '../components/salon/SalonEntryScreen';
import SalonConversation from '../components/salon/SalonConversation';

const S = {
  wine:     '#2A1A1F',
  wine2:    '#1F1318',
  gold:     '#C9A84C',
  goldSoft: 'rgba(201,168,76,0.30)',
  paper2:   '#E5D9C2',
  muted2:   '#7C6A68',
  display:  '"Bungee", system-ui, sans-serif',
  type:     '"Special Elite", Georgia, serif',
  serif:    'Georgia, "Times New Roman", serif',
};

function BackChevron({ onClick }) {
  return (
    <span onClick={onClick}
      style={{ color: S.gold, fontSize: 20, lineHeight: 1, cursor: 'pointer',
        padding: '4px 6px 4px 0', userSelect: 'none' }}>
      ‹
    </span>
  );
}

function BookCoverThumb({ src, title }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ width: 30, height: 45, flexShrink: 0, borderRadius: 3, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)', background: '#3B5A47' }}>
      {src && !failed ? (
        <img src={src} alt={title} onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(150deg,#3B5A47,#20120f)' }}/>
      )}
    </div>
  );
}

function SalonHeader({ period, onBack }) {
  const { daysRemaining } = period ? computeEnrollment(period) : { daysRemaining: 0 };
  const isOpen = period?.status === 'open';

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(31,19,24,0.96)', backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${S.goldSoft}`, padding: '11px 14px',
      display: 'flex', alignItems: 'center', gap: 11 }}>
      <BackChevron onClick={onBack}/>
      {period && <BookCoverThumb src={period.coverURL} title={period.bookTitle}/>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: S.display, fontSize: 12, letterSpacing: '0.10em',
          color: S.gold, textTransform: 'uppercase' }}>The Salon</div>
        {period && (
          <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 12,
            color: S.paper2, marginTop: 2, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {period.bookTitle}
          </div>
        )}
      </div>
      {period && isOpen && daysRemaining > 0 && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: S.display, fontSize: 15, color: S.gold }}>
            {daysRemaining}
          </div>
          <div style={{ fontFamily: S.type, fontSize: 8.5, color: S.muted2,
            letterSpacing: '0.08em' }}>
            DAYS LEFT
          </div>
        </div>
      )}
    </div>
  );
}

function NoPeriodState({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', padding: '40px 24px',
      textAlign: 'center' }}>
      <div style={{ fontFamily: S.display, fontSize: 20, letterSpacing: '0.08em',
        color: S.gold, textTransform: 'uppercase',
        textShadow: 'rgba(201,168,76,0.3) 0 0 16px', marginBottom: 12 }}>
        The Salon
      </div>
      <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 16,
        color: '#A2908C', maxWidth: 280, lineHeight: 1.5 }}>
        No reading period is open right now. Check back soon.
      </div>
      <button onClick={onBack}
        style={{ marginTop: 28, fontFamily: S.display, fontSize: 11,
          letterSpacing: '0.06em', padding: '12px 20px', borderRadius: 10,
          background: 'transparent', color: S.gold,
          border: `1.5px solid ${S.gold}`, cursor: 'pointer' }}>
        ← GO BACK
      </button>
    </div>
  );
}

export default function SalonScreen() {
  const navigate                      = useNavigate();
  const { user }                      = useAuth();
  const [period, setPeriod]           = useState(undefined);  // undefined = loading
  const [enrolled, setEnrolled]       = useState(false);
  const [recentCards, setRecentCards] = useState([]);
  const [view, setView]               = useState('entry');    // 'entry' | 'conversation'
  const BASE = import.meta.env.BASE_URL;
  const salonCatUrl = `${BASE}images/salon-cat.png`;

  // Load active salon period
  useEffect(() => {
    return subscribeToActiveSalon(setPeriod);
  }, []);

  // Check enrollment in user doc
  useEffect(() => {
    if (!user || !period?.id) return;
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(ref, snap => {
      const data = snap.data();
      setEnrolled(!!(data?.salonEnrollments?.[period.id]));
    }, () => setEnrolled(false));
  }, [user, period?.id]);

  // Peek at recent cards for the enrolled welcome screen
  useEffect(() => {
    if (!period?.id) return;
    return subscribeToSalonCards(period.id, 'newest', cards => {
      setRecentCards(cards.slice(0, 3));
    });
  }, [period?.id]);

  // Override body scroll for this standalone screen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    const root = document.getElementById('root');
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto'; }
    return () => {
      document.body.style.overflow = prev;
      if (root) { root.style.overflow = ''; root.style.height = ''; }
    };
  }, []);

  const onBack = () => navigate(-1);

  const screenBg = {
    minHeight: '100vh',
    background: S.wine,
    backgroundImage: [
      'radial-gradient(ellipse at 50% -8%, rgba(201,168,76,0.07) 0%, transparent 45%)',
      'radial-gradient(ellipse at 90% 100%, rgba(255,78,0,0.04) 0%, transparent 42%)',
    ].join(', '),
    fontFamily: S.serif,
    color: '#FFF8E7',
  };

  if (period === undefined) {
    return (
      <div style={screenBg}>
        <SalonHeader period={null} onBack={onBack}/>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', fontFamily: S.type, fontSize: 13, color: '#7C6A68' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (period === null) {
    return (
      <div style={screenBg}>
        <SalonHeader period={null} onBack={onBack}/>
        <NoPeriodState onBack={onBack}/>
      </div>
    );
  }

  const showConversation = view === 'conversation';

  return (
    <>
      <style>{`
        @keyframes salon-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes salon-sheet-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
      <div style={{ ...screenBg, display: 'flex', flexDirection: 'column',
        minHeight: showConversation ? '100vh' : undefined }}>
        <SalonHeader period={period} onBack={showConversation ? () => setView('entry') : onBack}/>

        {!showConversation && !enrolled && (
          <SalonEntryJoin
            period={period}
            user={user}
            salonCatUrl={salonCatUrl}
            onEnroll={() => { setEnrolled(true); setView('conversation'); }}
            onEnter={() => setView('conversation')}
          />
        )}

        {!showConversation && enrolled && (
          <SalonEntryEnrolled
            period={period}
            recentCards={recentCards}
            onEnter={() => setView('conversation')}
          />
        )}

        {showConversation && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
            minHeight: 0, overflow: 'hidden' }}>
            <SalonConversation
              period={period}
              user={user}
              salonCatUrl={salonCatUrl}
            />
          </div>
        )}
      </div>
    </>
  );
}
