import React from 'react';
import { HelpCircle, Lightbulb, Lock, X } from 'lucide-react';
import { RoomDefinition } from '../types/game';

interface HintModalProps {
  room: RoomDefinition;
  unlockedHints: number; // 0..3
  onRevealNextHint: () => void;
  onClose: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  room,
  unlockedHints,
  onRevealNextHint,
  onClose,
}) => {
  const tierLabels = [
    'Tier 1: Physics Concept',
    'Tier 2: Strategy Suggestion',
    'Tier 3: Direct Laboratory Clue',
  ];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-white">
              Research Assistant Hints
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 font-mono">
          {room.code} · {room.title} · Using fewer hints preserves bonus star points.
        </p>

        <div className="space-y-3">
          {room.hints.map((hintText, idx) => {
            const isRevealed = idx < unlockedHints;
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  isRevealed
                    ? 'bg-slate-950 border-amber-500/40'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {tierLabels[idx]}
                  </span>
                  {!isRevealed && <Lock className="w-3.5 h-3.5 text-slate-600" />}
                </div>
                {isRevealed ? (
                  <p className="text-sm text-slate-200 leading-relaxed">{hintText}</p>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Locked — reveal hints progressively if you need guidance.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-1">
          {unlockedHints < 3 && (
            <button
              onClick={onRevealNextHint}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Reveal Hint {unlockedHints + 1}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm"
          >
            Return to Chamber
          </button>
        </div>
      </div>
    </div>
  );
};
