interface Props {
  onNext: () => void;
}

export function OnboardingSlide1({ onNext }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-b from-sky-50 to-white text-center">
      <div className="text-6xl mb-6">✈️</div>
      <h1 className="font-lora text-3xl font-bold text-gray-900 mb-3">
        Welcome to Pollen Pilot
      </h1>
      <p className="text-sky-pilot font-medium text-lg mb-8">
        Navigate pollen season with confidence.
      </p>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 max-w-sm text-left space-y-4">
        <div className="flex gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <div className="font-semibold text-gray-900">Personalized to you</div>
            <div className="text-sm text-gray-600">Learns your unique triggers over time. Not just generic pollen counts.</div>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <div className="font-semibold text-gray-900">Quick daily check-ins</div>
            <div className="text-sm text-gray-600">Log symptoms in under 90 seconds. The more you log, the smarter it gets.</div>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-2xl">🌤️</span>
          <div>
            <div className="font-semibold text-gray-900">Find the good days too</div>
            <div className="text-sm text-gray-600">Pollen Pilot highlights when conditions are in your favor — not just when to stay inside.</div>
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        className="w-full max-w-sm bg-sky-pilot text-white font-semibold py-4 rounded-xl text-lg hover:bg-sky-500 transition-colors"
      >
        Get started
      </button>
    </div>
  );
}
