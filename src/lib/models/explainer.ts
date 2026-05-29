import type { RiskScore } from '@/types';
import { getRiskLabel } from './ensemble';
import { saveCachedExplanation } from '@/lib/storage';

interface ExplanationContext {
  risk_score: number;
  risk_category: string;
  top_features: { name: string; contribution: number }[];
  leading_model: string;
  model_confidence: number;
  checkins_count: number;
}

const FALLBACK_EXPLANATIONS: Record<string, string> = {
  clear: "Your flight path looks clear today. Pollen levels are low and your past check-ins don't indicate elevated risk. A great day to get outside.",
  light: "Light pollen traffic on the radar today. Your check-ins suggest manageable conditions, though it's worth keeping an eye on grass pollen levels.",
  turbulence: "Some turbulence in the forecast. Your patterns suggest today's conditions may be associated with elevated symptoms. Consider your usual precautions.",
  high: "High pollen turbulence today. Your past check-ins indicate this type of day is often associated with stronger symptoms. Proceed with your usual routine for high-risk days.",
};

export async function generateExplanation(riskScore: RiskScore, checkinsCount: number): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  if (!apiKey) {
    const fallback = FALLBACK_EXPLANATIONS[riskScore.category] ?? FALLBACK_EXPLANATIONS.light;
    saveCachedExplanation(fallback);
    return fallback;
  }

  const context: ExplanationContext = {
    risk_score: riskScore.score,
    risk_category: getRiskLabel(riskScore.category),
    top_features: riskScore.top_features,
    leading_model: riskScore.leading_model,
    model_confidence: riskScore.model_confidence,
    checkins_count: checkinsCount,
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `You are writing a brief explanation for a personalized pollen risk app called Pollen Pilot. Generate a 1-2 sentence plain-English explanation of today's risk score. Use the aviation theme (turbulence, clear skies, flight plan). Do not say "you are allergic to" anything. Use language like "may be associated with" and "your past check-ins suggest". Do not use em dashes.\n\nContext:\n${JSON.stringify(context)}\n\nRespond with JSON only: {"explanation": "..."}`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json() as {
      content: { type: string; text: string }[];
    };
    const text = data.content[0]?.text ?? '';
    const parsed = JSON.parse(text) as { explanation: string };
    saveCachedExplanation(parsed.explanation);
    return parsed.explanation;
  } catch {
    const fallback = FALLBACK_EXPLANATIONS[riskScore.category] ?? FALLBACK_EXPLANATIONS.light;
    saveCachedExplanation(fallback);
    return fallback;
  }
}
