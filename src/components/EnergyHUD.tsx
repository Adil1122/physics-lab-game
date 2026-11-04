import React from 'react';
import { Activity, Gauge, Zap } from 'lucide-react';

interface EnergyHUDProps {
  energy: { kinetic: number; potential: number; total: number };
  bodyCount: number;
  gravityY: number;
}

export const EnergyHUD: React.FC<EnergyHUDProps> = ({ energy, bodyCount, gravityY }) => {
  const maxDisplayEnergy = Math.max(100, energy.total * 1.2);
  const kPercent = Math.min(100, (energy.kinetic / maxDisplayEnergy) * 100);
  const pPercent = Math.min(100, (energy.potential / maxDisplayEnergy) * 100);

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none select-none">
      {/* Energy Monitor Box */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl w-64 pointer-events-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>MECHANICAL ENERGY</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-bold">{energy.total.toFixed(1)} J</span>
        </div>

        {/* Energy breakdown bars */}
        <div className="space-y-1.5 text-[11px] font-mono">
          {/* Kinetic */}
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Kinetic (Ek)</span>
              </span>
              <span className="text-cyan-300 font-semibold">{energy.kinetic.toFixed(1)} J</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-75"
                style={{ width: `${kPercent}%` }}
              />
            </div>
          </div>

          {/* Potential */}
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>Potential (Ep)</span>
              </span>
              <span className="text-amber-300 font-semibold">{energy.potential.toFixed(1)} J</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-75"
                style={{ width: `${pPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Formula reminder */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>E_tot = ½mv² + mgh</span>
          <span className="text-emerald-400 font-bold">Conserved</span>
        </div>
      </div>

      {/* Telemetry Pill */}
      <div className="flex items-center gap-2">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
          <Gauge className="w-3 h-3 text-sky-400" />
          <span>g: {(gravityY / 100).toFixed(1)} m/s²</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Objects: {bodyCount}</span>
        </div>
      </div>
    </div>
  );
};
