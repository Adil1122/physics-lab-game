import React from 'react';
import { Home, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { GameSettings, RoomDefinition } from '../types/game';

interface PauseModalProps {
  room: RoomDefinition;
  settings: GameSettings;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onUpdateSettings: (next: GameSettings) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  room,
  settings,
  onResume,
  onRestart,
  onMainMenu,
  onUpdateSettings,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="text-center border-b border-slate-800 pb-4">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            Simulation Paused
          </div>
          <h2 className="font-display text-2xl font-bold text-white mt-1">
            {room.code}: {room.title}
          </h2>
        </div>

        {/* Quick Audio & Sensitivity Controls */}
        <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm">
          <button
            onClick={() => {
              const next = !settings.soundEnabled;
              onUpdateSettings({ ...settings, soundEnabled: next, musicEnabled: next });
            }}
            className="w-full flex items-center justify-between text-slate-200 hover:text-white"
          >
            <span>Audio & Ambient Synth</span>
            {settings.soundEnabled ? (
              <span className="inline-flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold">
                <Volume2 className="w-4 h-4" /> ON
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-mono font-bold">
                <VolumeX className="w-4 h-4" /> OFF
              </span>
            )}
          </button>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Mouse Sensitivity</span>
              <span className="text-cyan-400 tabular-nums">{settings.mouseSensitivity.toFixed(1)}×</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) =>
                onUpdateSettings({ ...settings, mouseSensitivity: Number(e.target.value) })
              }
              className="w-full accent-cyan-500"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Simulation</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Room</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
