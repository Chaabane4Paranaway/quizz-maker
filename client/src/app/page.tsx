'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch(`/api/surveys/${token.trim().toUpperCase()}`);
    if (res.ok) {
      router.push(`/survey/?token=${token.trim().toUpperCase()}`);
    } else {
      setError('Sondage introuvable. Vérifiez le code.');
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminInput }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('admin_token', data.token);
      router.push('/admin/');
    } else {
      setError('Identifiant incorrect');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <span className="text-3xl">🗳️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">SurveyApp</h1>
          <p className="text-white/40 mt-1 text-sm">Sondages par priorité</p>
        </div>

        {/* Join survey card */}
        <div className="card mb-4">
          <h2 className="text-lg font-semibold text-white mb-1">Rejoindre un sondage</h2>
          <p className="text-white/40 text-sm mb-4">Entrez le code à 6 caractères</p>

          <form onSubmit={handleJoinSurvey} className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="input-field text-center text-xl font-bold tracking-widest uppercase flex-1"
            />
            <button type="submit" disabled={loading || token.length !== 6} className="btn-primary px-4">
              {loading ? '...' : '→'}
            </button>
          </form>

          {error && !showAdmin && (
            <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
          )}
        </div>

        {/* Admin section */}
        {!showAdmin ? (
          <button
            onClick={() => setShowAdmin(true)}
            className="w-full text-center text-white/30 hover:text-white/60 text-sm py-2 transition-colors"
          >
            Accès administrateur
          </button>
        ) : (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Administration</h2>
            <form onSubmit={handleAdminLogin} className="flex gap-2">
              <input
                type="password"
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                placeholder="Identifiant"
                className="input-field flex-1"
                autoFocus
              />
              <button type="submit" disabled={loading} className="btn-primary px-4">
                {loading ? '...' : '→'}
              </button>
            </form>
            {error && showAdmin && (
              <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
