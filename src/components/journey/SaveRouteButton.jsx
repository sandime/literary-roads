// Save / saving / saved state button — shared across all Journey planners.
// Props:
//   onSave, saving, saved
//   disabled — extra disabled condition (e.g. no stops selected)
//   label — button text, defaults to 'SAVE THIS ROUTE'
const SaveRouteButton = ({ onSave, saving, saved, disabled = false, label = 'SAVE THIS ROUTE' }) => {
  if (saved) {
    return (
      <div className="w-full border border-starlight-turquoise text-starlight-turquoise font-bungee py-3.5 rounded-xl text-center text-sm">
        ✓ SAVED TO YOUR ROUTES
      </div>
    );
  }
  return (
    <button
      onClick={onSave}
      disabled={saving || disabled}
      className="w-full border-2 border-starlight-turquoise text-starlight-turquoise font-bungee py-3.5 rounded-xl hover:bg-starlight-turquoise hover:text-midnight-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {saving ? (
        <>
          <div className="w-4 h-4 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" />
          SAVING…
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
};

export default SaveRouteButton;
