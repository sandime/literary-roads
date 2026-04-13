import { useAuth } from '../contexts/AuthContext';
import {
  BadgesIcon, DayTripsIcon, FestivalTentIcon,
  AboutIcon, CodeOfEthicsIcon, PrivacyPolicyIcon, CreditsIcon, LibraryIcon,
} from './Icons';

/**
 * Shared mobile hamburger drawer used by both StateSelector and MasterMap.
 *
 * Navigation props (all optional — omit to hide the item):
 *   onHome, onSearch, onNearMe
 *   onMyTrips, onResources, onBadges
 *   onDayTrip, onFestivalTrip
 *   onAbout, onEthics, onPrivacy, onCredits
 *   onProfile, onLogin, onSignOut
 *   onSaveRoute, onClearRoute
 *
 * State props:
 *   tripItems       — array, shows badge count on MY TRIPS
 *   earnedBadgeCount — number, shows count badge on BADGES (MasterMap only)
 *   route           — array, triggers CURRENT ROUTE section when non-empty
 *   loadedRoute     — object|null, also triggers CURRENT ROUTE section
 *
 * onClose — required, called when drawer should close
 */
const HamburgerDrawer = ({
  onClose,
  // EXPLORE
  onHome, onSearch, onNearMe,
  // GLOVE BOX
  onMyTrips, onLibrary, onResources, onBadges,
  tripItems = [],
  earnedBadgeCount = 0,
  // GUIDED JOURNEYS
  onDayTrip, onFestivalTrip,
  // AFTERWORD
  onAbout, onEthics, onPrivacy, onCredits,
  // CURRENT ROUTE (MasterMap only)
  route = [],
  loadedRoute = null,
  onSaveRoute, onClearRoute,
  // PROFILE FOOTER
  onProfile, onLogin, onSignOut,
}) => {
  const { user } = useAuth();

  const close = (fn) => () => { onClose(); fn?.(); };

  const navBtn = (onClick, icon, label, badge = null) => (
    <button
      onClick={close(onClick)}
      className="w-full flex items-center gap-4 px-5 py-3 text-left font-bungee text-[13px] text-paper-white hover:bg-starlight-turquoise/10 hover:text-starlight-turquoise transition-colors"
    >
      {icon}
      {label}
      {badge}
    </button>
  );

  const iconCls = 'w-5 h-5 flex-shrink-0 text-starlight-turquoise';

  return (
    <>
      {/* Backdrop */}
      <button
        className="fixed inset-0 z-[2000] bg-black/60 cursor-default"
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={-1}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 h-full z-[2001] bg-midnight-navy border-r-2 border-starlight-turquoise flex flex-col shadow-2xl"
        style={{ width: 'min(280px, 82vw)', animation: 'lr-slide-in-left 0.22s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-starlight-turquoise/30 flex-shrink-0">
          <span className="font-bungee text-starlight-turquoise text-sm tracking-widest drop-shadow-[0_0_8px_rgba(64,224,208,0.6)]">
            MENU
          </span>
          <button onClick={onClose} className="text-chrome-silver hover:text-atomic-orange transition-colors p-1" aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Neon accent */}
        <div className="h-0.5 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-60 flex-shrink-0" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">

          {/* ── EXPLORE ── */}
          <p className="px-5 pt-3 pb-1 text-starlight-turquoise/50 font-bungee text-[10px] tracking-widest">EXPLORE</p>
          {navBtn(onHome,
            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>,
            'HOME'
          )}
          {onSearch && navBtn(onSearch,
            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>,
            'SEARCH'
          )}
          {onNearMe && navBtn(onNearMe,
            <svg className="w-5 h-5 flex-shrink-0 text-atomic-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>,
            'NEAR ME'
          )}

          {/* ── GLOVE BOX ── */}
          <div className="border-t border-starlight-turquoise/10 mt-1">
            <p className="px-5 pt-3 pb-1 text-starlight-turquoise/50 font-bungee text-[10px] tracking-widest">GLOVE BOX</p>
            {onMyTrips && navBtn(onMyTrips,
              <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>,
              'MY TRIPS',
              tripItems.length > 0 && (
                <span className="ml-auto bg-atomic-orange text-midnight-navy font-bungee text-[10px] w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {tripItems.length > 9 ? '9+' : tripItems.length}
                </span>
              )
            )}
            {user && onLibrary && navBtn(onLibrary,
              <LibraryIcon size={20} className="flex-shrink-0" />,
              'LIBRARY'
            )}
            {onResources && navBtn(onResources,
              <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
              </svg>,
              'HIGHWAY SNACKS'
            )}
{user && onBadges && navBtn(onBadges,
              <BadgesIcon size={20} className="flex-shrink-0" />,
              'BADGES',
              earnedBadgeCount > 0 && (
                <span className="ml-auto bg-atomic-orange text-midnight-navy font-bungee text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                  {earnedBadgeCount}
                </span>
              )
            )}
          </div>

          {/* ── GUIDED JOURNEYS ── */}
          <div className="border-t border-starlight-turquoise/10 mt-1">
            <p className="px-5 pt-3 pb-1 text-starlight-turquoise/50 font-bungee text-[10px] tracking-widest">GUIDED JOURNEYS</p>
            {onDayTrip && (
              <button
                onClick={close(onDayTrip)}
                className="w-full flex items-center gap-4 px-5 py-3 text-left font-bungee text-[13px] text-paper-white hover:bg-starlight-turquoise/10 hover:text-starlight-turquoise transition-colors"
              >
                <DayTripsIcon size={20} className="flex-shrink-0" />
                <div>
                  <p className="font-bungee text-[13px]">DAY TRIPS</p>
                  <p className="text-chrome-silver/50 font-special-elite text-[11px] normal-case font-normal">Local literary loop</p>
                </div>
              </button>
            )}
            {onFestivalTrip && (
              <button
                onClick={close(onFestivalTrip)}
                className="w-full flex items-center gap-4 px-5 py-3 text-left font-bungee text-[13px] text-paper-white hover:bg-starlight-turquoise/10 hover:text-starlight-turquoise transition-colors"
              >
                <FestivalTentIcon size={20} className="flex-shrink-0" />
                <div>
                  <p className="font-bungee text-[13px]">FESTIVAL TRIPS</p>
                  <p className="text-chrome-silver/50 font-special-elite text-[11px] normal-case font-normal">Plan a trip around a festival</p>
                </div>
              </button>
            )}
          </div>

          {/* ── AFTERWORD ── */}
          <div className="border-t border-starlight-turquoise/10 mt-1">
            <p className="px-5 pt-3 pb-1 text-starlight-turquoise/50 font-bungee text-[10px] tracking-widest">AFTERWORD</p>
            {onAbout   && navBtn(onAbout,   <AboutIcon size={20} className="flex-shrink-0" />,         'ABOUT')}
            {onEthics  && navBtn(onEthics,  <CodeOfEthicsIcon size={20} className="flex-shrink-0" />,  'CODE OF ETHICS')}
            {onPrivacy && navBtn(onPrivacy, <PrivacyPolicyIcon size={20} className="flex-shrink-0" />, 'PRIVACY POLICY')}
            {onCredits && navBtn(onCredits, <CreditsIcon size={20} className="flex-shrink-0" />,       'CREDITS')}
          </div>

          {/* ── CURRENT ROUTE (MasterMap only, conditional) ── */}
          {(route.length > 0 || loadedRoute) && (
            <div className="border-t border-starlight-turquoise/10 mt-1">
              <p className="px-5 pt-3 pb-1 text-starlight-turquoise/50 font-bungee text-[10px] tracking-widest">CURRENT ROUTE</p>
              {route.length > 0 && onSaveRoute && (
                <button
                  onClick={close(onSaveRoute)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left font-bungee text-[13px] text-paper-white hover:bg-starlight-turquoise/10 hover:text-starlight-turquoise transition-colors"
                >
                  <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  SAVE ROUTE
                </button>
              )}
              {onClearRoute && (
                <button
                  onClick={close(onClearRoute)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left font-bungee text-[13px] text-atomic-orange hover:bg-atomic-orange/10 transition-colors"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  CLEAR ROUTE
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Profile footer */}
        <div className="flex-shrink-0 border-t border-starlight-turquoise/30">
          {user ? (
            <>
              <div className="px-5 py-3">
                <p className="font-bungee text-[10px] text-starlight-turquoise tracking-wide leading-tight">
                  {user.displayName || 'Literary Traveler'}
                </p>
                <p className="font-special-elite text-[9px] text-chrome-silver/50 mt-0.5 truncate">
                  {user.email}
                </p>
              </div>
              <div className="flex border-t border-starlight-turquoise/20">
                <button
                  onClick={close(onProfile)}
                  className="flex-1 py-3 font-bungee text-[11px] text-starlight-turquoise hover:bg-starlight-turquoise/10 transition-colors"
                >
                  PROFILE
                </button>
                <div className="w-px bg-starlight-turquoise/20" />
                <button
                  onClick={close(onSignOut)}
                  className="flex-1 py-3 font-bungee text-[11px] text-atomic-orange hover:bg-atomic-orange/10 transition-colors"
                >
                  SIGN OUT
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={close(onLogin)}
              className="w-full px-5 py-4 font-bungee text-[13px] text-starlight-turquoise hover:bg-starlight-turquoise/10 transition-colors text-left"
            >
              LOG IN / SIGN UP
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default HamburgerDrawer;
