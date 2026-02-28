'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Survey {
  token: string;
  title: string;
  choices: string[];
}

interface Vote {
  choice: string;
  rank: number;
}

function SurveyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [votes, setVotes] = useState<Vote[]>([]);
  const [step, setStep] = useState<'pseudo' | 'vote' | 'done'>('pseudo');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenParam) {
      router.push('/');
      return;
    }
    fetch(`/api/surveys/${tokenParam.toUpperCase()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError('Sondage introuvable');
        } else {
          setSurvey(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erreur réseau');
        setLoading(false);
      });
  }, [tokenParam, router]);

  const handlePseudo = (e: React.FormEvent) => {
    e.preventDefault();
    if (pseudo.trim()) setStep('vote');
  };

  const handleChoiceClick = (choice: string) => {
    setVotes((prev) => {
      const existing = prev.find((v) => v.choice === choice);
      if (existing) {
        // Remove vote and re-rank
        const remaining = prev.filter((v) => v.choice !== choice);
        return remaining.map((v, i) => ({ ...v, rank: i + 1 }));
      } else {
        return [...prev, { choice, rank: prev.length + 1 }];
      }
    });
  };

  const getRank = (choice: string): number | null => {
    const v = votes.find((v) => v.choice === choice);
    return v ? v.rank : null;
  };

  const handleSubmit = async () => {
    if (votes.length === 0) {
      setError('Sélectionnez au moins un choix');
      return;
    }
    setSubmitting(true);
    setError('');

    const res = await fetch(`/api/surveys/${tokenParam}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo: pseudo.trim(), votes }),
    });

    const data = await res.json();
    if (res.ok) {
      setStep('done');
    } else {
      setError(data.error || 'Erreur lors de la soumission');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40">Chargement...</div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-sm w-full">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="btn-secondary">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-block bg-violet-600/20 border border-violet-500/30 text-violet-300 font-mono font-bold text-sm px-3 py-1 rounded-lg mb-3">
            {tokenParam}
          </span>
          {survey && (
            <h1 className="text-2xl font-bold text-white">{survey.title}</h1>
          )}
        </div>

        {/* Step: Pseudo */}
        {step === 'pseudo' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-1">Votre pseudo</h2>
            <p className="text-white/40 text-sm mb-5">Comment souhaitez-vous être identifié ?</p>
            <form onSubmit={handlePseudo} className="flex gap-2">
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="MonPseudo"
                maxLength={30}
                className="input-field flex-1"
                autoFocus
              />
              <button type="submit" disabled={!pseudo.trim()} className="btn-primary px-4">
                →
              </button>
            </form>
          </div>
        )}

        {/* Step: Vote */}
        {step === 'vote' && survey && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Vos priorités</h2>
              <span className="text-white/40 text-sm">Bonjour, <strong className="text-white/70">{pseudo}</strong></span>
            </div>
            <p className="text-white/40 text-sm mb-6">
              Cliquez dans l&apos;ordre de vos préférences. Premier clic = priorité #1. Vous n&apos;êtes pas obligé de tous les sélectionner.
            </p>

            {/* Order legend */}
            {votes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4 p-3 bg-white/3 rounded-xl border border-white/5">
                <span className="text-white/30 text-xs w-full mb-1">Ordre de priorité :</span>
                {votes.map((v) => (
                  <span key={v.choice} className="flex items-center gap-1 text-xs bg-violet-600/20 text-violet-300 px-2 py-1 rounded-lg border border-violet-500/20">
                    <span className="font-bold text-violet-400">#{v.rank}</span>
                    {v.choice}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-2 mb-6">
              {survey.choices.map((choice) => {
                const rank = getRank(choice);
                return (
                  <button
                    key={choice}
                    onClick={() => handleChoiceClick(choice)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between group
                      ${rank !== null
                        ? 'bg-violet-600/20 border-violet-500/50 text-white'
                        : 'bg-white/3 border-white/8 text-white/70 hover:bg-white/8 hover:border-white/15'
                      }`}
                  >
                    <span className="font-medium">{choice}</span>
                    {rank !== null ? (
                      <span className="w-8 h-8 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {rank}
                      </span>
                    ) : (
                      <span className="w-8 h-8 rounded-full border border-white/15 text-white/20 text-xs flex items-center justify-center group-hover:border-white/30 transition-colors shrink-0">
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setVotes([]); setStep('pseudo'); }}
                className="btn-secondary flex-none px-4"
              >
                ←
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || votes.length === 0}
                className="btn-primary flex-1"
              >
                {submitting ? 'Envoi...' : `Valider (${votes.length} choix)`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="card text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">Réponse enregistrée !</h2>
            <p className="text-white/40 mb-6">Merci pour votre participation, <strong className="text-white/70">{pseudo}</strong>.</p>
            <div className="bg-white/3 rounded-xl p-4 mb-6 text-sm text-white/50">
              <p className="mb-1">Vos priorités :</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {votes.map((v) => (
                  <span key={v.choice} className="flex items-center gap-1 text-xs bg-violet-600/15 text-violet-300 px-2 py-1 rounded-lg">
                    <span className="font-bold">#{v.rank}</span> {v.choice}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => router.push('/')} className="btn-secondary">
              Retour à l&apos;accueil
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white/40">Chargement...</div></div>}>
      <SurveyContent />
    </Suspense>
  );
}
