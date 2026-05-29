import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import webpush from 'npm:web-push@3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails('mailto:admin@pollenpilot.app', vapidPublicKey, vapidPrivateKey);

function localHour(date: Date, timezone: string): number {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(date);
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n % 24;
}

function localDayOfWeek(date: Date, timezone: string): number {
  // Returns 0 (Sun) – 6 (Sat)
  const s = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(date);
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(s);
}

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // All users with check-in reminders enabled
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, notifications')
    .filter('notifications->>checkin_reminder', 'eq', 'true');

  if (error || !profiles?.length) {
    return new Response('No reminder profiles', { status: 200 });
  }

  // Filter to users whose reminder time matches the current local hour
  const dueNow = profiles.filter(p => {
    const n = p.notifications as {
      reminder_times?: string[];
      reminder_days?: number[] | null;
      reminder_timezone?: string;
    };
    const tz = n.reminder_timezone ?? 'America/New_York';
    const times = n.reminder_times ?? ['09:00'];
    const days = n.reminder_days ?? null;

    // Check day of week (null = every day)
    if (days !== null && !days.includes(localDayOfWeek(now, tz))) return false;

    // Check if any reminder time matches current local hour
    const hour = localHour(now, tz);
    return times.some(t => parseInt(t.split(':')[0], 10) === hour);
  });

  if (!dueNow.length) {
    return new Response('No users due for reminder this hour', { status: 200 });
  }

  const dueIds = dueNow.map(p => p.id as string);

  // Exclude users who already manually checked in today
  const { data: checkedIn } = await supabase
    .from('check_ins')
    .select('user_id')
    .in('user_id', dueIds)
    .eq('entry_type', 'manual')
    .gte('timestamp', `${today}T00:00:00.000Z`)
    .lte('timestamp', `${today}T23:59:59.999Z`);

  const alreadyDone = new Set((checkedIn ?? []).map(c => c.user_id as string));
  const needReminder = dueIds.filter(id => !alreadyDone.has(id));

  if (!needReminder.length) {
    return new Response('All due users already checked in', { status: 200 });
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', needReminder);

  const payload = JSON.stringify({
    title: '✈️ Pollen Pilot',
    body: "How are you feeling today? Tap to log your check-in.",
    url: '/',
  });

  const results = await Promise.allSettled(
    (subs ?? []).map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
