'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { apiCall } from '../lib/api';

interface StatEntry {
  choice: string;
  score: number;
  voteCount: number;
}

interface StatsData {
  survey: { token: string; title: string; choices: string[] };
  stats: StatEntry[];
  totalRespondents: number;
  respondents: string[];
}

const COLORS = [
  '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
  '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe',
];

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      router.push('/');
      return;
    }
    if (!token) {
      router.push('/admin/');
      return;
    }

    apiCall<StatsData>(`/api/surveys/${token}/stats`).then(({ data, error: err }) => {
      if (err) setError(err);
      else if (data) setStats(data);
      setLoading(false);
    });
  }, [token, router]);

  const maxScore = stats ? Math.max(...stats.stats.map((s) => s.score), 1) : 1;

  const sortedStats = stats
    ? [...stats.stats].sort((a, b) => b.score - a.score)
    : [];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: StatEntry }[] }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{d.choice}</p>
          <p className="text-violet-400 text-sm">Score pondéré : <strong>{d.score}</strong></p>
          <p className="text-white/40 text-xs">{d.voteCount} participant(s) l&apos;ont sélectionné</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40">Chargement des stats...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-sm w-full">
          <p className="text-red-400 mb-4">{error || 'Erreur'}</p>
          <button onClick={() => router.push('/admin/')} className="btn-secondary">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push('/admin/')}
              className="text-white/40 hover:text-white/70 text-sm mb-3 flex items-center gap-1 transition-colors"
            >
              ← Admin
            </button>
            <span className="inline-block bg-violet-600/20 border border-violet-500/30 text-violet-300 font-mono font-bold text-sm px-3 py-1 rounded-lg mb-2">
              {stats.survey.token}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{stats.survey.title}</h1>
            <p className="text-white/40 text-sm mt-1">
              {stats.totalRespondents} participant{stats.totalRespondents !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {stats.totalRespondents === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-white/40">Aucune réponse pour l&apos;instant.</p>
            <p className="text-white/20 text-sm mt-1">Partagez le code <strong className="text-violet-400 font-mono">{stats.survey.token}</strong> avec les participants.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bar chart */}
            <div className="card">
              <h2 className="text-base font-semibold text-white/70 mb-6">
                Score pondéré par choix
                <span className="text-xs font-normal text-white/30 ml-2">
                  (premier choix = poids le plus fort)
                </span>
              </h2>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedStats} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="choice"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={80}>
                      {sortedStats.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          opacity={1 - (index * 0.08)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking cards */}
            <div className="grid sm:grid-cols-2 gap-3">
              {sortedStats.map((stat, index) => (
                <div key={stat.choice} className="card flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] + '40', border: `1px solid ${COLORS[index % COLORS.length]}60` }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{stat.choice}</p>
                    <p className="text-white/40 text-xs">{stat.voteCount} vote{stat.voteCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                      {stat.score}
                    </p>
                    <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(stat.score / maxScore) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Participants */}
            <div className="card">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-3">
                Participants ({stats.respondents.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.respondents.map((p, i) => (
                  <span key={i} className="text-sm bg-white/5 text-white/60 px-3 py-1 rounded-lg border border-white/8">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white/40">Chargement...</div></div>}>
      <ResultsContent />
    </Suspense>
  );
}
