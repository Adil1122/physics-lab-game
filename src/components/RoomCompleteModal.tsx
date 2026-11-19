import React, { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock, HelpCircle, Star, XCircle } from 'lucide-react';
import { RoomDefinition } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface RoomCompleteModalProps {
  room: RoomDefinition;
  timeSeconds: number;
  hintsUsed: number;
  baseRoomScore: number;
  starsEarned: number;
  onContinue: (quizBonusPoints: number) => void;
}

export const RoomCompleteModal: React.FC<RoomCompleteModalProps> = ({
  room,
  timeSeconds,
  hintsUsed,
  baseRoomScore,
  starsEarned,
  onContinue,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const questions = room.educational.questions;
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = questions.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex,
  ).length;
  const quizBonus = correctCount * 50;

  const handleSelectOption = (questionId: string, optionIdx: number, correctIdx: number) => {
    if (selectedAnswers[questionId] !== undefined) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    if (optionIdx === correctIdx) {
      soundEngine.playSwitchActivate();
    } else {
      soundEngine.playError();
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/90 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header & Stars */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              {room.code} Cleared
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-0.5">
              {room.title}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-6 h-6 ${
                    s <= starsEarned ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-xs text-slate-400">Room Score</div>
              <div className="text-lg font-bold text-cyan-400">{baseRoomScore + quizBonus}</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-slate-400">Time Taken</div>
              <div className="text-white font-bold text-sm">{timeSeconds}s</div>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-slate-400">Hints Used</div>
              <div className="text-white font-bold text-sm">{hintsUsed} / 3</div>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-slate-400">Quiz Bonus</div>
              <div className="text-emerald-400 font-bold text-sm">+{quizBonus} pts</div>
            </div>
          </div>
        </div>

        {/* Educational Breakdown */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Physics Concept Learned: {room.educational.concept}</span>
            </div>
            <code className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 font-bold">
              {room.educational.formula}
            </code>
          </div>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            <strong className="text-white">How the Puzzle Demonstrated It:</strong>{' '}
            {room.educational.puzzleExplanation}
          </p>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            <strong className="text-cyan-300">Real-Life Example:</strong>{' '}
            {room.educational.realLifeExample}
          </p>
        </div>

        {/* Interactive 3-Question Knowledge Check */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              Knowledge Check (+50 pts per correct answer)
            </h3>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {answeredCount}/{questions.length} Answered
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIdx) => {
              const chosen = selectedAnswers[q.id];
              const isAnswered = chosen !== undefined;
              return (
                <div
                  key={q.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5"
                >
                  <p className="text-sm font-semibold text-white">
                    {qIdx + 1}. {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctIndex;
                      const isSelected = chosen === oIdx;
                      let btnClass =
                        'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200';
                      if (isAnswered) {
                        if (isCorrect) {
                          btnClass =
                            'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold';
                        } else if (isSelected) {
                          btnClass = 'bg-red-500/20 border-red-500 text-red-200';
                        } else {
                          btnClass = 'bg-slate-900/50 border-slate-800 text-slate-500';
                        }
                      }
                      return (
                        <button
                          key={oIdx}
                          disabled={isAnswered}
                          onClick={() => handleSelectOption(q.id, oIdx, q.correctIndex)}
                          className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex items-center justify-between gap-2 ${btnClass}`}
                        >
                          <span>{opt}</span>
                          {isAnswered && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {isAnswered && isSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {isAnswered && (
                    <p className="text-xs text-slate-300 pt-1">
                      <span
                        className={
                          chosen === q.correctIndex
                            ? 'text-emerald-400 font-bold'
                            : 'text-amber-400 font-bold'
                        }
                      >
                        {chosen === q.correctIndex ? 'Correct! ' : 'Review: '}
                      </span>
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onContinue(quizBonus);
          }}
          className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <span>
            {room.id === 5 ? 'Complete Escape & View Final Results' : `Proceed to Room ${room.id + 1}`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
