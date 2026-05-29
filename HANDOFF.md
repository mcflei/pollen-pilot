# Pollen Pilot — Session Handoff

## What this project is
A personalized allergy prediction React/TypeScript app. Users log daily symptoms via a "Pilot Check-In," and the app combines those with local pollen/weather data to learn their unique triggers and predict bad allergy days. Aviation-themed brand (flight plans, turbulence, clear skies). All data stored in localStorage — no backend for MVP.

## Current state
**Full MVP scaffold is complete and building cleanly.** The app runs at `http://localhost:5173` (run `npm run dev` in the project directory to start).

All source files were built from scratch in this session based on CLAUDE.md and PRD.md (both present in the project root).

---

## Tech stack
- **Vite 5** + **React 18** + **TypeScript 5** (strict mode)
- **Tailwind CSS 3** (PostCSS, not the Vite plugin — uses `tailwind.config.js` + `postcss.config.js`)
- **Recharts 3** for charts
- **Zustand 5** for state
- **React Router 6** (v7 requires Node 20+; this machine has Node 18)
- **fuse.js 7** for medication fuzzy search
- **@anthropic-ai/sdk** for AI explanations (optional — has template fallback)
- No backend, no auth

## Environment
- Node.js v18.20.8 (constraint: react-router-dom must stay on v6, not v7)
- Windows 11, PowerShell

---

## File structure (all files exist and are complete)

```
src/
  types/index.ts              — All TypeScript types (CheckIn, UserProfile, PollenSnapshot, FeatureVector, ML types, RiskScore, etc.)
  lib/
    storage.ts                — Typed localStorage wrappers for all pp_* keys
    medicationDb.ts           — 24-entry drug DB + fuse.js searchMedications()
    pollenApi.ts              — Tomorrow.io fetch + 6hr cache + getMockPollenData() (Raleigh NC seasonal mock)
    models/
      featureEngineering.ts   — buildFeatureVector(), featureToArray(), FEATURE_NAMES
      logisticRegression.ts   — trainLogisticRegression(), predictLR(), logLossLR()
      gradientBoostedTree.ts  — trainGBDT(), predictGBDT(), logLossGBDT()
      weightedKNN.ts          — buildKNNModel(), predictKNN(), logLossKNN()
      ensemble.ts             — computeRiskScore(), selfEvaluate(), getRiskCategory(), getRiskLabel()
      explainer.ts            — generateExplanation() — calls Anthropic API, falls back to templates
  store/
    appStore.ts               — Zustand store: initApp, submitCheckIn, updateProfile, refreshPollenData, resetData
  hooks/
    useCheckIns.ts
    usePollenData.ts
    useRiskScore.ts
    useInsights.ts            — trigger associations, lag detection, symptom source flags
  components/
    ErrorBoundary.tsx         — Class component; shows red error screen instead of blank on crash
    layout/Nav.tsx, TabBar.tsx
    onboarding/OnboardingFlow.tsx, OnboardingSlide1-3.tsx
    dashboard/Dashboard.tsx, RiskRing.tsx, WeatherStrip.tsx, PollenRadar.tsx, TriggerMap.tsx, Recommendations.tsx
    checkin/CheckInModal.tsx, SeveritySlider.tsx, SymptomGrid.tsx, MedicationSearch.tsx, SleepSection.tsx, OutdoorTimeInput.tsx
    insights/InsightsPage.tsx, TriggerMapChart.tsx, TrendChart.tsx, SymptomSourceCheck.tsx
    settings/SettingsPage.tsx
  App.tsx                     — Router shell; calls initApp() on mount; shows OnboardingFlow if not done
  main.tsx                    — Entry point; wraps in StrictMode + ErrorBoundary + BrowserRouter
  index.css                   — @tailwind base/components/utilities + DM Sans font
  vite-env.d.ts               — /// <reference types="vite/client" />
```

---

## Bugs fixed in this session

### Critical: blank white screen on load
**Cause:** When `uuidv4()` was moved inline from a uuid package to `crypto.randomUUID()`, the function declaration was accidentally placed *between* two `import` blocks in `appStore.ts`. In native ESM, import statements must all appear before any other statements. The browser rejected the module parse and silently showed a blank screen.

**Fix:** Rewrote `appStore.ts` with all imports at the top, then helper functions, then the store.

### TypeScript errors fixed during build
- `CheckInModal` was passing `pollen_snapshot` to `submitCheckIn` but the store omits it (store adds it internally) — fixed the Omit type
- `TriggerMapChart` Tooltip formatter typed as `(value: number)` but recharts passes `ValueType | undefined` — loosened the type
- `import.meta.env` not recognized — added `src/vite-env.d.ts` with vite/client reference
- CSS import not recognized — same vite-env.d.ts fix

### Other improvements
- `App.tsx` refactored to use individual Zustand selectors (not object selector) — Zustand v5 uses `Object.is` by default; object selectors always return a new reference and cause excessive re-renders
- `useEffect` in `App.tsx` changed from `[initApp]` dependency to `[]` — `initApp` is a stable Zustand action but the dependency was misleading; also wrapped in `.catch()` for error visibility
- `SettingsPage.tsx` same object selector → individual selectors fix

---

## What works
- 3-screen onboarding with frequency picker, assume-healthy toggle
- Dashboard with animated SVG risk ring (800ms arc animation), weather strip, pollen radar grid, trigger map, recommendations
- Pilot Check-In modal with all fields: severity slider, symptom multi-select, medication fuzzy search, sleep section, outdoor time, environment toggles
- Insights page: trigger bar chart (Recharts), 14-day trend line, lag detection, symptom source check, model status
- Settings page: schedule, outdoor activity, notifications, data export/reset
- ML ensemble (logistic regression + GBDT + weighted k-NN) — activates after 7 manual check-ins; self-evaluates on each new check-in
- All data in localStorage, no backend
- Mock pollen data (Raleigh NC seasonal) works without any API keys
- Error boundary catches crashes and shows red error screen instead of blank

## What's NOT built yet (next steps)
- Notification API wiring (settings toggles exist but don't do anything yet)
- Any form of auth or cloud sync (out of scope for MVP)

## Location picker — BUILT
Settings page now has a "Location" section with:
- "Use my current location" button — calls `navigator.geolocation.getCurrentPosition()`, reverse-geocodes via OpenStreetMap Nominatim, saves `{ lat, lng, city }` to profile, then calls `refreshPollenData()` to reload with real coordinates
- Shows current city when set, with a "Clear" button to revert to mock data
- Error states: permission denied, timeout, geolocation not supported
- The Nav header already shows the city name when `profile.location` is non-null

## To enable real data
Copy `.env.example` → `.env.local` and fill in:
- `VITE_TOMORROW_IO_API_KEY` — for real pollen/weather (Tomorrow.io free tier)
- `VITE_ANTHROPIC_API_KEY` — for AI-generated risk score explanations (uses `claude-sonnet-4-20250514`)

---

## localStorage keys
```
pp_profile          UserProfile JSON
pp_checkins         CheckIn[] JSON array
pp_pollen_cache     { data: PollenSnapshot, fetched_at: string, explanation?: string }
pp_model_weights    ModelWeights JSON
pp_model_evals      ModelEvalResult[] JSON array
pp_onboarding_done  "true" | absent
```

## Running the app
```bash
cd C:\Users\Max\Documents\PollenPilot
npm run dev        # dev server, usually port 5173
npm run build      # TypeScript check + Vite production build
```
