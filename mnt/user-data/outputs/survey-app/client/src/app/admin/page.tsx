'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '../lib/api';

interface Survey {
  token: string;
  title: string;
  choices: string[];
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [title, setTitle] = useState('');
  const [choices, setChoices] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newToken, setNewToken] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  const loadSurveys = useCallback(async () => {
    const { data } = await apiCall<Survey[]>('/api/surveys');
    if (data) setSurveys(data);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
      return;
    }
    loadSurveys();
  }, [router, loadSurveys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setNewToken('');

    const { data, error: err } = await apiCall<{ token: string; title: string; choices: string[] }>(
      '/api/surveys',
      {
        method: 'POST',
        body: JSON.stringify({ title, choices }),
      }
    );

    if (err) {
      setError(err);
    } else if (data) {
      setNewToken(data.token);
      setSuccess(`Sondage créé !`);
      setTitle('');
      setChoices('');
      loadSurveys();
    }
    setLoading(false);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    router.push('/');
  };

  const parseChoices = (raw: string) =>
    raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
            <p className="text-white/40 text-sm mt-0.5">Gestion des sondages</p>
          </div>
          <button onClick={logout} className="btn-secondary text-sm px-4 py-2">
            Déconnexion
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create survey form */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-5">
              <span className="inline-block w-7 h-7 bg-violet-600/30 rounded-lg text-center text-sm leading-7 mr-2">+</span>
              Créer un sondage
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wide block mb-1.5">
                  Question / Titre
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Quelle est votre priorité ?"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wide block mb-1.5">
                  Choix <span className="text-violet-400">(séparés par des virgules)</span>
                </label>
                <textarea
                  value={choices}
                  onChange={(e) => setChoices(e.target.value)}
                  placeholder="Option A, Option B, Option C, Option D"
                  className="input-field resize-none h-24"
                  required
                />
                {choices && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parseChoices(choices).map((c, i) => (
                      <span
                        key={i}
                        className="text-xs bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-md border border-violet-500/20"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Création...' : 'Créer le sondage'}
              </button>
            </form>

            {/* New token display */}
            {newToken && (
              <div className="mt-4 bg-violet-600/20 border border-violet-500/30 rounded-xl p-4 text-center">
                <p className="text-white/60 text-xs mb-2">Code du sondage</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-bold tracking-widest text-violet-300 font-mono">
                    {newToken}
                  </span>
                  <button
                    onClick={() => copyToken(newToken)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    {copiedToken === newToken ? '✓' : '⎘'}
                  </button>
                </div>
                <p className="text-white/40 text-xs mt-2">Partagez ce code avec les participants</p>
              </div>
            )}
          </div>

          {/* Survey list */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white mb-5">
              <span className="inline-block w-7 h-7 bg-indigo-600/30 rounded-lg text-center text-sm leading-7 mr-2">≡</span>
              Sondages ({surveys.length})
            </h2>

            {surveys.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-white/30">Aucun sondage créé</p>
              </div>
            ) : (
              surveys.map((survey) => (
                <div key={survey.token} className="card hover:border-white/15 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{survey.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {survey.choices.map((c, i) => (
                          <span key={i} className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => copyToken(survey.token)}
                        className="font-mono font-bold text-violet-400 text-lg tracking-wider hover:text-violet-300 transition-colors"
                      >
                        {copiedToken === survey.token ? '✓' : survey.token}
                      </button>
                      <button
                        onClick={() => router.push(`/results/?token=${survey.token}`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Voir les stats →
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
