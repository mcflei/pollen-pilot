import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  onDone: () => void;
}

export function ResetPasswordScreen({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-lora text-2xl font-semibold text-gray-900 dark:text-white mb-2">Password updated</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">You're all set. You can now use your new password to sign in.</p>
          <button
            onClick={onDone}
            className="mt-6 w-full py-2.5 bg-sky-pilot text-white text-sm font-medium rounded-lg"
          >
            Go to app →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✈️</div>
          <h1 className="font-lora text-3xl font-semibold text-gray-900 dark:text-white">Pollen Pilot</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Set your new password</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-pilot focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                placeholder="Re-enter your password"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-pilot focus:border-transparent"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-pilot text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
