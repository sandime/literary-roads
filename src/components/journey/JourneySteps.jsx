// Step progress dot indicator for multi-step journey planners.
// Props:
//   steps — array of step key strings in order
//   currentStep — the active step key
const JourneySteps = ({ steps, currentStep }) => (
  <div className="flex gap-1 flex-shrink-0">
    {steps.map(s => (
      <div key={s} className={`w-2 h-2 rounded-full transition-all ${
        currentStep === s ? 'bg-starlight-turquoise' : 'bg-chrome-silver/20'
      }`} />
    ))}
  </div>
);

export default JourneySteps;
