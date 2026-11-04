import React from 'react';
import { Star, ChevronRight, CheckCircle2, Flame, Award } from 'lucide-react';
import { LevelConfig } from '../types/physics';

interface ChallengePanelProps {
  levels: LevelConfig[];
  currentLevelIndex: number;
  onSelectLevel: (idx: number) => void;
  cannonAngle: number;
  setCannonAngle: (angle: number) => void;
  cannonPower: number;
  setCannonPower: (power: number) => void;
  dropHeight: number;
  setDropHeight: (h: number) => void;
  massSlider: number;
  setMassSlider: (m: number) => void;
  densitySlider: number;
  setDensitySlider: (d: number) => void;
  onLaunch: () => void;
  starsCollected: number;
  isCompleted: boolean;
  onNextLevel: () => void;
}

export const ChallengePanel: React.FC<ChallengePanelProps> = ({
  levels,
  currentLevelIndex,
  onSelectLevel,
  cannonAngle,
  setCannonAngle,
  cannonPower,
  setCannonPower,
  dropHeight,
  setDropHeight,
  massSlider,
  setMassSlider,
  densitySlider,
  setDensitySlider,
  onLaunch,
  starsCollected,
  isCompleted,
  onNextLevel,
}) => {
  const currentLevel = levels[currentLevelIndex];

  return (
    <div className="w-84 bg-slate-900/95 border-l border-slate-800 flex flex-col h-full overflow-y-auto z-10 shrink-0">
      {/* Level Selection Pills */}
      <div className="p-4 border-b border-slate-800">
        <div className="text-xs font-mono font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Laboratory Experiments</span>
          <span className="text-sky-400 font-bold">{currentLevelIndex + 1}/{levels.length}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {levels.map((lvl, idx) => (
            <button
              key={lvl.id}
              onClick={() => onSelectLevel(idx)}
              className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                currentLevelIndex === idx
                  ? 'bg-sky-500 text-white ring-2 ring-sky-400/50 shadow-md shadow-sky-500/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700/60'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Mission Briefing */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {currentLevel.category}
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= starsCollected
                    ? 'text-amber-400 fill-amber-400 drop-shadow'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-white tracking-tight">{currentLevel.title}</h2>
          <p className="text-xs text-sky-400 font-mono mt-0.5">{currentLevel.subtitle}</p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          {currentLevel.instructions}
        </p>

        {/* Physics Formula Badge */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block mb-1">Theoretical Governing Law</span>
          <code className="text-xs font-mono font-bold text-sky-300 block overflow-x-auto py-0.5">
            {currentLevel.formula}
          </code>
        </div>
      </div>

      {/* Mission Parameters Tuning Controls */}
      <div className="p-4 flex-1 space-y-4">
        <h3 className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
          Experimental Parameters
        </h3>

        {/* Cannon Controls (Level 1 & Level 5) */}
        {currentLevel.playerAdjustable?.cannonAngle && (
          <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Trajectory Angle</span>
              <span className="font-mono text-sky-400 font-bold">{cannonAngle}°</span>
            </div>
            <input
              type="range"
              min={currentLevel.playerAdjustable.cannonAngle.min}
              max={currentLevel.playerAdjustable.cannonAngle.max}
              step={currentLevel.playerAdjustable.cannonAngle.step || 1}
              value={cannonAngle}
              onChange={(e) => setCannonAngle(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {currentLevel.playerAdjustable?.cannonPower && (
          <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Launch Velocity (v₀)</span>
              <span className="font-mono text-sky-400 font-bold">{cannonPower} px/s</span>
            </div>
            <input
              type="range"
              min={currentLevel.playerAdjustable.cannonPower.min}
              max={currentLevel.playerAdjustable.cannonPower.max}
              step={currentLevel.playerAdjustable.cannonPower.step || 10}
              value={cannonPower}
              onChange={(e) => setCannonPower(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Drop Height Slider (Level 2 & Level 4) */}
        {currentLevel.playerAdjustable?.dropHeight && (
          <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Release Height</span>
              <span className="font-mono text-sky-400 font-bold">{Math.round(650 - dropHeight)} px</span>
            </div>
            <input
              type="range"
              min={currentLevel.playerAdjustable.dropHeight.min}
              max={currentLevel.playerAdjustable.dropHeight.max}
              value={dropHeight}
              onChange={(e) => setDropHeight(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Mass Slider (Level 2) */}
        {currentLevel.playerAdjustable?.massSlider && (
          <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{currentLevel.playerAdjustable.massSlider.label}</span>
              <span className="font-mono text-sky-400 font-bold">{massSlider.toFixed(1)} kg</span>
            </div>
            <input
              type="range"
              min={currentLevel.playerAdjustable.massSlider.min}
              max={currentLevel.playerAdjustable.massSlider.max}
              step="0.1"
              value={massSlider}
              onChange={(e) => setMassSlider(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Density Slider (Level 3) */}
        {currentLevel.playerAdjustable?.densitySlider && (
          <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{currentLevel.playerAdjustable.densitySlider.label}</span>
              <span className="font-mono text-sky-400 font-bold">{densitySlider.toFixed(2)} g/cm³</span>
            </div>
            <input
              type="range"
              min={currentLevel.playerAdjustable.densitySlider.min}
              max={currentLevel.playerAdjustable.densitySlider.max}
              step="0.01"
              value={densitySlider}
              onChange={(e) => setDensitySlider(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Floats (&lt; 1.0)</span>
              <span>Water (1.0)</span>
              <span>Sinks (&gt; 1.0)</span>
            </div>
          </div>
        )}

        {/* Launch / Fire Action Button */}
        <button
          onClick={onLaunch}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Flame className="w-4 h-4 fill-white" />
          <span>EXECUTE EXPERIMENT</span>
        </button>

        {/* Level Goal Status */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Objective</div>
          <div className="flex items-start gap-2 text-xs text-slate-200">
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-600'}`} />
            <span>{currentLevel.goal.description}</span>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="m-4 p-4 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Experiment Validated!</span>
          </div>
          <p className="text-xs text-slate-300">
            Physics principles confirmed with {starsCollected}/3 quantum data stars collected.
          </p>
          {currentLevelIndex < levels.length - 1 && (
            <button
              onClick={onNextLevel}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1 transition-all"
            >
              <span>Next Experiment</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
