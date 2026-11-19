import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameSettings, LiveTelemetry, RoomDefinition } from '../types/game';
import { MobileInputState, ViewportActionsRef } from './GameViewport';

interface GameHUDProps {
  room: RoomDefinition;
  telemetry: LiveTelemetry;
  score: number;
  elapsedSeconds: number;
  hintsUsed: number;
  settings: GameSettings;
  mobileInputRef: React.MutableRefObject<MobileInputState>;
  actionsRef: React.MutableRefObject<ViewportActionsRef | null>;
  onOpenHint: () => void;
  onPause: () => void;
  onRestart: () => void;
  onToggleAudio: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  room,
  telemetry,
  score,
  elapsedSeconds,
  hintsUsed,
  settings,
  mobileInputRef,
  actionsRef,
  onOpenHint,
  onPause,
  onRestart,
  onToggleAudio,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const lookTouchRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(window.innerWidth < 820 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const showMobileControls =
    settings.mobileControlsMode === 'always' ||
    (settings.mobileControlsMode === 'auto' && isTouchDevice);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-4">
      {/* TOP BAR HUD */}
      <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Left: Room Title & Live Objective */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span style={{ color: room.accentColor }} className="font-bold">
              {room.code} · {room.title}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 tabular-nums">{telemetry.progressPercent}% Complete</span>
          </div>
          <p className="text-xs md:text-sm font-medium text-white mt-0.5 truncate max-w-lg">
            {telemetry.objectiveText}
          </p>
        </div>

        {/* Right: Metrics & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs font-mono tabular-nums">
            <div>
              <span className="text-slate-400">SCORE </span>
              <span className="text-cyan-400 font-bold">{score}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-400">TIME </span>
              <span className="text-white font-bold">{formattedTime}</span>
            </div>
          </div>

          <button
            onClick={onOpenHint}
            className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="Show Physics Hint (H)"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Hint ({hintsUsed}/3)</span>
          </button>

          <button
            onClick={onToggleAudio}
            className="p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-200 transition-colors"
            title="Toggle Audio"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={onRestart}
            className="p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-200 transition-colors"
            title="Restart Room"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPause}
            className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Pause Game (ESC)"
          >
            <Pause className="w-4 h-4" />
            <span className="hidden sm:inline">Pause</span>
          </button>
        </div>
      </div>

      {/* CENTER CROSSHAIR & TARGET PROMPT */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex flex-col items-center">
          {/* Reticle */}
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 transition-transform duration-150 ${
              telemetry.targetPrompt
                ? 'border-cyan-400 scale-125 bg-cyan-400/25'
                : 'border-white/70 bg-transparent'
            }`}
          />
          {telemetry.targetPrompt && (
            <div className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-950/90 border border-cyan-500/40 text-xs font-medium text-cyan-200 shadow-lg max-w-xs text-center">
              <span className="font-mono font-bold text-cyan-400">[E / Click]</span>{' '}
              {telemetry.targetPrompt}
            </div>
          )}
          {telemetry.isCarrying && telemetry.carriedName && (
            <div className="mt-2 px-3 py-1 rounded-lg bg-slate-950/90 border border-emerald-500/40 text-xs font-mono text-emerald-300">
              Carrying: {telemetry.carriedName}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE TOUCH CONTROLS (if touch / enabled) */}
      {showMobileControls && (
        <div className="fixed inset-x-4 bottom-24 flex items-end justify-between pointer-events-none z-20">
          {/* Left Movement Pad */}
          <div className="grid grid-cols-3 gap-1.5 w-36 pointer-events-auto">
            <div />
            <button
              onPointerDown={() => { mobileInputRef.current.forward = 1; }}
              onPointerUp={() => { mobileInputRef.current.forward = 0; }}
              onPointerLeave={() => { mobileInputRef.current.forward = 0; }}
              className="h-11 rounded-lg bg-slate-900/90 border border-slate-700 text-white font-bold text-sm active:bg-cyan-500 active:text-slate-950"
            >
              ▲
            </button>
            <div />
            <button
              onPointerDown={() => { mobileInputRef.current.right = -1; }}
              onPointerUp={() => { mobileInputRef.current.right = 0; }}
              onPointerLeave={() => { mobileInputRef.current.right = 0; }}
              className="h-11 rounded-lg bg-slate-900/90 border border-slate-700 text-white font-bold text-sm active:bg-cyan-500 active:text-slate-950"
            >
              ◀
            </button>
            <button
              onPointerDown={() => { mobileInputRef.current.forward = -1; }}
              onPointerUp={() => { mobileInputRef.current.forward = 0; }}
              onPointerLeave={() => { mobileInputRef.current.forward = 0; }}
              className="h-11 rounded-lg bg-slate-900/90 border border-slate-700 text-white font-bold text-sm active:bg-cyan-500 active:text-slate-950"
            >
              ▼
            </button>
            <button
              onPointerDown={() => { mobileInputRef.current.right = 1; }}
              onPointerUp={() => { mobileInputRef.current.right = 0; }}
              onPointerLeave={() => { mobileInputRef.current.right = 0; }}
              className="h-11 rounded-lg bg-slate-900/90 border border-slate-700 text-white font-bold text-sm active:bg-cyan-500 active:text-slate-950"
            >
              ▶
            </button>
          </div>

          {/* Right Look Pad + Action Buttons */}
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <div
              onTouchStart={(e) => {
                const t = e.changedTouches[0];
                lookTouchRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
              }}
              onTouchMove={(e) => {
                if (!lookTouchRef.current) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                  const t = e.changedTouches[i];
                  if (t.identifier === lookTouchRef.current.id) {
                    const dx = t.clientX - lookTouchRef.current.x;
                    const dy = t.clientY - lookTouchRef.current.y;
                    lookTouchRef.current.x = t.clientX;
                    lookTouchRef.current.y = t.clientY;
                    actionsRef.current?.lookDelta(dx * 1.4, dy * 1.4);
                  }
                }
              }}
              onTouchEnd={() => {
                lookTouchRef.current = null;
              }}
              className="w-36 h-20 rounded-xl bg-slate-900/75 border border-slate-700 flex items-center justify-center text-[11px] font-mono text-slate-400"
            >
              Drag to Look
            </div>
            <div className="flex gap-2">
              <button
                onPointerDown={() => { mobileInputRef.current.jump = true; }}
                onPointerUp={() => { mobileInputRef.current.jump = false; }}
                onPointerLeave={() => { mobileInputRef.current.jump = false; }}
                className="h-11 px-4 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-xs font-bold active:bg-cyan-500 active:text-slate-950"
              >
                Jump
              </button>
              <button
                onClick={() => actionsRef.current?.interact()}
                className="h-11 px-4 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold"
              >
                Interact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE BOTTOM CONTROL & FORMULA DOCK */}
      <div className="flex flex-col items-center pointer-events-auto">
        <button
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="px-3 py-1 rounded-t-lg bg-slate-950/90 border border-b-0 border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Physics & Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="w-full max-w-4xl bg-slate-950/92 border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl">
            {settings.showFormulas ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold">{telemetry.formulaLabel}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-200 tabular-nums">{telemetry.formulaLiveValue}</span>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-400">{telemetry.roomSpecificStatus}</div>
            )}

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 shrink-0">
              <span>WASD: Move</span>
              <span>·</span>
              <span>Mouse/Drag: Look</span>
              <span>·</span>
              <span>E/Click: Interact</span>
              <span>·</span>
              <span>Space: Jump</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
