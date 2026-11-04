import React from 'react';
import { Play, Pause, RotateCcw, Eye, ArrowUpRight, Compass, FlaskConical, Box, BookOpen } from 'lucide-react';

interface NavbarProps {
  mode: 'challenges' | 'sandbox' | 'theory';
  setMode: (mode: 'challenges' | 'sandbox' | 'theory') => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  onReset: () => void;
  timeScale: number;
  setTimeScale: (scale: number) => void;
  showVectors: boolean;
  setShowVectors: (val: boolean) => void;
  showTrajectories: boolean;
  setShowTrajectories: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  setMode,
  paused,
  setPaused,
  onReset,
  timeScale,
  setTimeScale,
  showVectors,
  setShowVectors,
  showTrajectories,
  setShowTrajectories,
}) => {
  return (
    <header className="h-16 px-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/30">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wide text-white">PHYSICS LAB</span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">Interactive Simulation & Puzzle Lab</p>
        </div>
      </div>

      {/* Mode Switcher */}
      <nav className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800">
        <button
          onClick={() => setMode('challenges')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'challenges'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Challenges</span>
        </button>
        <button
          onClick={() => setMode('sandbox')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'sandbox'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Sandbox</span>
        </button>
        <button
          onClick={() => setMode('theory')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'theory'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Theory & Equations</span>
        </button>
      </nav>

      {/* Simulation Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={() => setPaused(!paused)}
          className={`p-2 rounded-lg border transition-all ${
            paused
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          }`}
          title={paused ? 'Resume Simulation' : 'Pause Simulation'}
        >
          {paused ? <Play className="w-4 h-4 fill-emerald-400" /> : <Pause className="w-4 h-4 fill-slate-200" />}
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all"
          title="Reset Current Experiment"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
          {[0.25, 0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setTimeScale(s)}
              className={`px-2 py-1 text-[11px] font-mono rounded font-medium transition-all ${
                timeScale === s
                  ? 'bg-sky-500/20 text-sky-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Visual Overlays Toggles */}
        <div className="h-5 w-px bg-slate-800 mx-1" />

        <button
          onClick={() => setShowVectors(!showVectors)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            showVectors
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-300'
          }`}
          title="Toggle Velocity Vectors"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Vectors</span>
        </button>

        <button
          onClick={() => setShowTrajectories(!showTrajectories)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            showTrajectories
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-300'
          }`}
          title="Toggle Trajectory Guides"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Traces</span>
        </button>
      </div>
    </header>
  );
};
