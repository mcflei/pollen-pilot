interface Props {
  onFinish: () => void;
}

export function OnboardingSlide3({ onFinish }: Props) {
  return (
    <div className="flex flex-col min-h-screen px-6 py-12 bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-900">
      <div className="flex-1">
        <div className="text-4xl mb-4">🧭</div>
        <h2 className="font-lora text-2xl font-bold text-gray-900 dark:text-white mb-2">Our philosophy</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          A few things worth knowing before you start.
        </p>

        <div className="space-y-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <div className="font-semibold text-gray-900 dark:text-white mb-1">We say things carefully</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Pollen Pilot says: <span className="italic">"grass pollen may be associated with your symptoms."</span>
            </div>
            <div className="text-sm text-red-400 mt-1">
              We never say: <span className="italic">"You are allergic to grass."</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <div className="font-semibold text-gray-900 dark:text-white mb-1">Log time outside</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              A high-pollen day may not affect you if you stayed indoors. Logging hours outside helps the app learn your true tolerance.
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <div className="font-semibold text-gray-900 dark:text-white mb-1">It gets smarter over time</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              After 7 check-ins, the ML model starts building your personal risk profile. More check-ins = more accuracy.
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-300">Disclaimer:</strong> Pollen Pilot does not diagnose illness or allergies. Risk scores and insights are based on patterns in your personal check-in data and are not medical advice. Always follow guidance from your healthcare provider.
        </div>
      </div>

      <button
        onClick={onFinish}
        className="mt-6 w-full bg-green-pilot text-white font-semibold py-4 rounded-xl text-lg hover:bg-green-600 transition-colors"
      >
        Start flying ✈️
      </button>
    </div>
  );
}
