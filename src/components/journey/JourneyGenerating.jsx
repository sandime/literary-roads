import { StarburstIcon } from '../Icons';

// Full-height generating/loading state shown between input and result steps.
// Props:
//   message — large turquoise heading
//   subMessage — smaller grey subtext
const JourneyGenerating = ({
  message    = 'BUILDING YOUR JOURNEY…',
  subMessage = 'Finding the best stops nearby',
}) => (
  <div className="flex flex-col items-center justify-center h-full py-24 lr-fade">
    <div className="relative mb-6">
      <div className="w-20 h-20 border-4 border-starlight-turquoise/30 border-t-starlight-turquoise rounded-full animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <StarburstIcon size={44} />
      </div>
    </div>
    <p className="text-starlight-turquoise font-bungee text-lg drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
      {message}
    </p>
    <p className="text-chrome-silver font-special-elite text-sm mt-2 text-center px-8">
      {subMessage}
    </p>
  </div>
);

export default JourneyGenerating;
