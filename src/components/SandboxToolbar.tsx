import React from 'react';
import { MousePointer, Circle, Square, Triangle, Trash2, Zap, Waves, Sparkles, Orbit } from 'lucide-react';

interface SandboxToolbarProps {
  currentTool: string;
  setCurrentTool: (tool: string) => void;
  gravityY: number;
  setGravityY: (g: number) => void;
  airResistance: number;
  setAirResistance: (r: number) => void;
  spawnBounciness: number;
  setSpawnBounciness: (b: number) => void;
  spawnMass: number;
  setSpawnMass: (m: number) => void;
  onClearAll: () => void;
  onLoadPreset: (preset: 'dominoes' | 'cradle' | 'zerog') => void;
}

export const SandboxToolbar: React.FC<SandboxToolbarProps> = ({
  currentTool,
  setCurrentTool,
  gravityY,
  setGravityY,
  airResistance,
  setAirResistance,
  spawnBounciness,
  setSpawnBounciness,
  spawnMass,
  setSpawnMass,
  onClearAll,
  onLoadPreset,
}) => {
  const tools = [
    { id: 'drag', label: 'Interact / Drag', icon: MousePointer },
    { id: 'ball', label: 'Sphere', icon: Circle },
    { id: 'box', label: 'Box', icon: Square },
    { id: 'ramp', label: 'Incline Ramp', icon: Triangle },
    { id: 'trampoline', label: 'Trampoline', icon: Sparkles },
    { id: 'charge_pos', label: 'Pos Charge (+)', icon: Zap },
    { id: 'charge_neg', label: 'Neg Charge (−)', icon: Zap },
    { id: 'water', label: 'Water Pool', icon: Waves },
    { id: 'pin', label: 'Fixed Pivot', icon: Orbit },
  ];

  return (
    <div className="w-84 bg-slate-900/95 border-l border-slate-800 flex flex-col h-full overflow-y-auto z-10 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">SANDBOX LAB</h2>
          <p className="text-xs text-slate-400 font-mono">Free Simulation & Playground</p>
        </div>
        <button
          onClick={onClearAll}
          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
          title="Clear Sandbox"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tool Palette */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <span className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
          Creation Tools
        </span>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((t) => {
            const Icon = t.icon;
            const isSelected = currentTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setCurrentTool(t.id)}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-medium ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 font-mono pt-1">
          Select a tool, then click anywhere on the canvas to place.
        </p>
      </div>

      {/* Physics Environment Modifiers */}
      <div className="p-4 border-b border-slate-800 space-y-4">
        <span className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
          Field Dynamics
        </span>

        {/* Gravity Slider */}
        <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Gravitational Field</span>
            <span className="font-mono text-sky-400 font-bold">{(gravityY / 100).toFixed(1)} m/s²</span>
          </div>
          <input
            type="range"
            min="0"
            max="2500"
            step="50"
            value={gravityY}
            onChange={(e) => setGravityY(Number(e.target.value))}
            className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <button onClick={() => setGravityY(0)} className="hover:text-sky-400">Zero-G</button>
            <button onClick={() => setGravityY(162)} className="hover:text-sky-400">Moon (1.6)</button>
            <button onClick={() => setGravityY(980)} className="hover:text-sky-400">Earth (9.8)</button>
            <button onClick={() => setGravityY(2480)} className="hover:text-sky-400">Jupiter (24.8)</button>
          </div>
        </div>

        {/* Air Resistance */}
        <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Fluid / Air Drag</span>
            <span className="font-mono text-sky-400 font-bold">{(airResistance * 1000).toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.005"
            step="0.0002"
            value={airResistance}
            onChange={(e) => setAirResistance(Number(e.target.value))}
            className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Spawn Properties */}
      <div className="p-4 border-b border-slate-800 space-y-4">
        <span className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
          Material Properties
        </span>

        {/* Bounciness / Restitution */}
        <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Restitution (Bounciness)</span>
            <span className="font-mono text-sky-400 font-bold">{Math.round(spawnBounciness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.0"
            step="0.05"
            value={spawnBounciness}
            onChange={(e) => setSpawnBounciness(Number(e.target.value))}
            className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Mass */}
        <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Mass</span>
            <span className="font-mono text-sky-400 font-bold">{spawnMass.toFixed(1)} kg</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="10.0"
            step="0.5"
            value={spawnMass}
            onChange={(e) => setSpawnMass(Number(e.target.value))}
            className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Quick Setup Presets */}
      <div className="p-4 space-y-2">
        <span className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
          Quick Demo Scenes
        </span>
        <div className="space-y-1.5">
          <button
            onClick={() => onLoadPreset('dominoes')}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center justify-between transition-all"
          >
            <span>Domino Chain Reaction</span>
            <span className="font-mono text-[10px] text-sky-400">Load</span>
          </button>
          <button
            onClick={() => onLoadPreset('cradle')}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center justify-between transition-all"
          >
            <span>5-Ball Newton\'s Cradle</span>
            <span className="font-mono text-[10px] text-sky-400">Load</span>
          </button>
          <button
            onClick={() => onLoadPreset('zerog')}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center justify-between transition-all"
          >
            <span>Zero-G Electrostatic Orbit</span>
            <span className="font-mono text-[10px] text-sky-400">Load</span>
          </button>
        </div>
      </div>
    </div>
  );
};
