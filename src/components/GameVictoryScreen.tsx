import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, Clock, Home, RotateCcw, Star, Trophy } from 'lucide-react';
import { ROOM_ORDER, ROOMS_DATA } from '../data/roomsData';
import { SaveData } from '../types/game';

interface GameVictoryScreenProps {
  saveData: SaveData;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameVictoryScreen: React.FC<GameVictoryScreenProps> = ({
  saveData,
  onPlayAgain,
  onMainMenu,
}) => {
  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#38bdf8', '#a855f7', '#10b981', '#fbbf24'],
    });
  }, []);

  const roomsCompleted = ROOM_ORDER.filter((id) => saveData.rooms[id].completed).length;
  const totalStars = ROOM_ORDER.reduce((s, id) => s + saveData.rooms[id].stars, 0);
  const totalTime = ROOM_ORDER.reduce(
    (s, id) => s + (saveData.rooms[id].bestTimeSeconds ?? 0),
    0,
  );

  const badgeTitle =
    totalStars >= 13
      ? 'Quantum Nobel Laureate'
      : totalStars >= 9
      ? 'Senior Lab Physicist'
      : 'Certified Lab Escapee';

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/92 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-2xl p-7 md:p-9 shadow-2xl space-y-6 my-auto">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <Award className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight pt-2">
            CONGRATULATIONS!
          </h1>
          <p className="text-lg font-display font-bold text-emerald-400">
            YOU ESCAPED THE PHYSICS LAB!
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono tabular-nums">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <div className="text-xs text-slate-400">Total Score</div>
            <div className="text-lg font-bold text-white">{saveData.totalScore}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-xs text-slate-400">Total Time</div>
            <div className="text-lg font-bold text-white">{totalTime}s</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-slate-400">Rooms</div>
            <div className="text-lg font-bold text-white">{roomsCompleted} / 5</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400 mx-auto mb-1" />
            <div className="text-xs text-slate-400">Stars</div>
            <div className="text-lg font-bold text-white">{totalStars} / 15</div>
          </div>
        </div>

        {/* Final Achievement Badge */}
        <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-mono text-amber-400 uppercase font-bold">
                Final Achievement Badge
              </div>
              <div className="text-base font-display font-bold text-white">{badgeTitle}</div>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400">All 5 Labs Cleared</div>
        </div>

        {/* Physics Concepts Mastered */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="text-xs font-mono uppercase text-slate-400 font-bold">
            Physics Concepts Mastered
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {ROOM_ORDER.map((id) => (
              <div key={id} className="flex items-center gap-2 text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{ROOMS_DATA[id].educational.concept}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={onPlayAgain}
            className="py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
          <button
            onClick={onMainMenu}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
