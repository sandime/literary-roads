// Threaded discussion view: cards list + sort control + composer.
import { useState, useEffect } from 'react';
import { subscribeToSalonCards } from '../../utils/salon';
import SalonCard from './SalonCard';
import SalonComposer from './SalonComposer';
import SalonReplySheet from './SalonReplySheet';

const S = {
  gold:   '#C9A84C',
  muted:  '#A2908C',
  type:   '"Special Elite", Georgia, serif',
  serif:  'Georgia, "Times New Roman", serif',
};

export default function SalonConversation({ period, user, salonCatUrl }) {
  const [cards, setCards]         = useState([]);
  const [sort, setSort]           = useState('newest');
  const [replyTarget, setReplyTarget] = useState(null);
  const periodOpen = period.status === 'open';

  useEffect(() => {
    return subscribeToSalonCards(period.id, sort, setCards);
  }, [period.id, sort]);

  const speakerCount = new Set(cards.map(c => c.userId)).size;
  const memberCount  = period.memberCount ?? 0;

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Empty state */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 28px', minHeight: 400, textAlign: 'center' }}>
          <img src={salonCatUrl} alt="The Salon" style={{ width: 220, height: 220,
            objectFit: 'contain', filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.5))' }}/>
          <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 22,
            color: '#FFF8E7', marginTop: 14 }}>
            Be the first to speak.
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15,
            color: S.muted, marginTop: 8 }}>
            The Salon is open.
          </div>
        </div>
        {periodOpen && user && <SalonComposer salonId={period.id} user={user}/>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
        {/* Meta / sort row */}
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: S.type, fontSize: 11, color: S.muted,
            letterSpacing: '0.06em' }}>
            {memberCount} in the room{speakerCount > 0 ? ` · ${speakerCount} speaking` : ''}
          </span>
          <button onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: S.type, fontSize: 11, color: S.gold }}>
            {sort === 'newest' ? 'Newest ▾' : 'Oldest ▾'}
          </button>
        </div>

        {/* Discussion cards */}
        {cards.map(card => (
          <SalonCard
            key={card.id}
            card={card}
            salonId={period.id}
            onReply={setReplyTarget}
            periodOpen={periodOpen}
          />
        ))}
      </div>

      {/* Composer — only when open + logged in */}
      {periodOpen && user && <SalonComposer salonId={period.id} user={user}/>}

      {/* Reply sheet */}
      {replyTarget && (
        <SalonReplySheet
          salonId={period.id}
          card={replyTarget}
          user={user}
          onClose={() => setReplyTarget(null)}
        />
      )}
    </div>
  );
}
