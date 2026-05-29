import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import webpush from 'npm:web-push@3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails('mailto:admin@pollenpilot.app', vapidPublicKey, vapidPrivateKey);

// Simple pollen score using raw indices (no ML needed server-side)
function pollenScore(snapshot: Record<string, number>): number {
  const indices = [
    snapshot.grass_index ?? 0,
    snapshot.tree_index ?? 0,
    snapshot.weed_index ?? 0,
    snapshot.mold_index ?? 0,
    snapshot.ragweed_index ?? 0,
  ];
  const avg = indices.reduce((a, b) => a + b, 0) / indices.length;
  return (avg / 5) * 100; // 0–100
}

async function sendPush(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: object
) {
  const body = JSON.stringify(payload);
  return Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      )
    )
  );
}

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const today = new Date().toISOString().slice(0, 10);

  // Get all users who have either alert enabled
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, notifications');

  if (!profiles?.length) return new Response('No profiles', { status: 200 });

  const highRiskIds = profiles
    .filter(p => (p.notifications as Record<string, unknown>)?.high_risk_alert === true)
    .map(p => p.id as string);
  const clearSkiesIds = profiles
    .filter(p => (p.notifications as Record<string, unknown>)?.clear_skies_alert === true)
    .map(p => p.id as string);

  const allAlertIds = [...new Set([...highRiskIds, ...clearSkiesIds])];
  if (!allAlertIds.length) return new Response('No alert subscribers', { status: 200 });

  // Get today's pollen snapshots for those users
  const { data: snapshots } = await supabase
    .from('pollen_snapshots')
    .select('user_id, snapshot')
    .in('user_id', allAlertIds)
    .eq('date', today);

  if (!snapshots?.length) return new Response('No pollen data for today', { status: 200 });

  const highRiskTargets: string[] = [];
  const clearSkiesTargets: string[] = [];

  for (const row of snapshots) {
    const uid = row.user_id as string;
    const snap = row.snapshot as Record<string, number>;
    const score = pollenScore(snap);

    if (highRiskIds.includes(uid) && score >= 65) highRiskTargets.push(uid);
    if (clearSkiesIds.includes(uid) && score <= 20) clearSkiesTargets.push(uid);
  }

  let sent = 0;

  if (highRiskTargets.length) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', highRiskTargets);
    if (subs?.length) {
      const results = await sendPush(subs, {
        title: '⚠️ High Pollen Alert',
        body: 'Pollen levels are high today. Consider limiting outdoor time.',
        url: '/',
      });
      sent += results.filter(r => r.status === 'fulfilled').length;
    }
  }

  if (clearSkiesTargets.length) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', clearSkiesTargets);
    if (subs?.length) {
      const results = await sendPush(subs, {
        title: '✅ Clear Skies Today',
        body: 'Pollen levels are very low — a great day to be outside!',
        url: '/',
      });
      sent += results.filter(r => r.status === 'fulfilled').length;
    }
  }

  return new Response(
    JSON.stringify({ sent, highRisk: highRiskTargets.length, clearSkies: clearSkiesTargets.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
