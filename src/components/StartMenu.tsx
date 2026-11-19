import React, { useState } from 'react';
import {
  Atom,
  BookOpen,
  CheckCircle2,
  Grid,
  Lock,
  Play,
  RotateCcw,
  Settings,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ROOM_ORDER, ROOMS_DATA } from '../data/roomsData';
import { GameSettings, RoomId, SaveData } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface StartMenuProps {
  saveData: SaveData;
  onStartGame: (roomId: RoomId) => void;
  onUpdateSettings: (next: GameSettings) => void;
  onResetSave: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  saveData,
  onStartGame,
  onUpdateSettings,
  onResetSave,
}) => {
  const [modal, setModal] = useState<'none' | 'how' | 'levels' | 'settings'>('none');
  const [confirmReset, setConfirmReset] = useState(false);

  const completedCount = ROOM_ORDER.filter((id) => saveData.rooms[id].completed).length;
  const totalStars = ROOM_ORDER.reduce((sum, id) => sum + saveData.rooms[id].stars, 0);

  // Next unlocked incomplete room, or Room 1
  const nextPlayableRoom: RoomId =
    ROOM_ORDER.find((id) => saveData.rooms[id].unlocked && !saveData.rooms[id].completed) || 1;

  const openModal = (target: 'how' | 'levels' | 'settings') => {
    soundEngine.unlock();
    soundEngine.playClick();
    setConfirmReset(false);
    setModal(target);
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Top Progress Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3 text-xs font-mono text-slate-300 bg-slate-950/85 border border-slate-800 px-4 py-2.5 rounded-xl">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="tabular-nums font-semibold text-white">Score: {saveData.totalScore}</span>
          <span className="text-slate-600">·</span>
          <span className="tabular-nums">Rooms: {completedCount}/5</span>
          <span className="text-slate-600">·</span>
          <span className="tabular-nums flex items-center gap-1 text-amber-300">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {totalStars}/15
          </span>
        </div>

        <button
          onClick={() => {
            soundEngine.unlock();
            const nextMuted = !saveData.settings.soundEnabled;
            onUpdateSettings({
              ...saveData.settings,
              soundEnabled: nextMuted,
              musicEnabled: nextMuted,
            });
          }}
          className="flex items-center gap-2 text-xs font-medium text-slate-200 bg-slate-950/85 hover:bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl transition-colors"
        >
          {saveData.settings.soundEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
          <span>{saveData.settings.soundEnabled ? 'Audio On' : 'Audio Muted'}</span>
        </button>
      </div>

      {/* Main Hero Menu Card (Positioned left/bottom-left so 3D gyro core shines on center-right!) */}
      <div className="max-w-xl bg-slate-950/88 border border-slate-800 rounded-2xl p-7 md:p-9 shadow-2xl pointer-events-auto my-auto">
        <div className="flex items-center gap-2.5 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-3">
          <Atom className="w-4 h-4" />
          <span>Interactive 3D Physics Adventure</span>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          PHYSICS ESCAPE
        </h1>
        <p className="text-lg md:text-xl font-medium text-cyan-300 mt-1">
          The Science Experiment
        </p>

        <p className="text-sm text-slate-300 leading-relaxed mt-4">
          Trapped inside a sealed futuristic research complex, you must master gravity, Newtonian forces, laser optics, electromagnetism, and energy conservation across five interactive 3D chambers to unlock your escape.
        </p>

        {/* Primary & Secondary Menu Actions */}
        <div className="mt-7 space-y-3">
          <button
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playClick();
              onStartGame(nextPlayableRoom);
            }}
            className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2.5 transition-colors shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{completedCount > 0 ? `START GAME (ROOM ${nextPlayableRoom})` : 'START GAME'}</span>
          </button>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => openModal('how')}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>How To Play</span>
            </button>

            <button
              onClick={() => openModal('levels')}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Grid className="w-3.5 h-3.5 text-purple-400" />
              <span>Level Select</span>
            </button>

            <button
              onClick={() => openModal('settings')}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtle footer hint */}
      <div className="text-xs text-slate-400 font-mono pointer-events-auto">
        5 Escape Chambers · Real-Time 3D Physics · Knowledge Check Quizzes
      </div>

      {/* HOW TO PLAY MODAL */}
      {modal === 'how' && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-lg font-bold text-white">How To Play</h2>
              <button
                onClick={() => setModal('none')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Explore each 3D laboratory room in first-person, inspect physical objects, and solve the room’s physics puzzle to unlock the exit blast door.
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs font-mono">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-cyan-400 font-bold block">W A S D / Arrows</span>
                  <span className="text-slate-400">Move around the room</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-cyan-400 font-bold block">Mouse / Click-Drag</span>
                  <span className="text-slate-400">Look around 360°</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-cyan-400 font-bold block">Left Click or E</span>
                  <span className="text-slate-400">Pick up / Push / Activate</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-cyan-400 font-bold block">Space · H · ESC</span>
                  <span className="text-slate-400">Jump · Hint · Pause</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 pt-1">
                Tip: Mobile & touch devices automatically receive an on-screen movement pad, look touch zone, Jump, and Interact buttons.
              </p>
            </div>

            <button
              onClick={() => setModal('none')}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* LEVEL SELECT MODAL */}
      {modal === 'levels' && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-lg font-bold text-white">Laboratory Chambers</h2>
              <button
                onClick={() => setModal('none')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {ROOM_ORDER.map((id) => {
                const room = ROOMS_DATA[id];
                const prog = saveData.rooms[id];
                return (
                  <div
                    key={id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      prog.unlocked
                        ? 'bg-slate-950/90 border-slate-800'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span style={{ color: room.accentColor }} className="font-bold">
                          {room.code}
                        </span>
                        <span>·</span>
                        <span>{room.subtitle}</span>
                        {prog.completed && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white">{room.title}</h3>
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400 tabular-nums">
                        <span className="flex items-center gap-1">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= prog.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </span>
                        <span>Best Score: {prog.bestScore}</span>
                        {prog.bestTimeSeconds !== null && (
                          <span>Best Time: {prog.bestTimeSeconds}s</span>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={!prog.unlocked}
                      onClick={() => {
                        soundEngine.playClick();
                        setModal('none');
                        onStartGame(id);
                      }}
                      className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors ${
                        prog.unlocked
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {prog.unlocked ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Enter Room</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {modal === 'settings' && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-lg font-bold text-white">Settings</h2>
              <button
                onClick={() => setModal('none')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <label className="flex items-center justify-between">
                <span className="text-slate-200 font-medium">Sound Effects</span>
                <input
                  type="checkbox"
                  checked={saveData.settings.soundEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...saveData.settings, soundEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-slate-200 font-medium">Ambient Lab Music</span>
                <input
                  type="checkbox"
                  checked={saveData.settings.musicEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...saveData.settings, musicEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-slate-200 font-medium">Show Live Physics Formulas</span>
                <input
                  type="checkbox"
                  checked={saveData.settings.showFormulas}
                  onChange={(e) =>
                    onUpdateSettings({ ...saveData.settings, showFormulas: e.target.checked })
                  }
                  className="w-4 h-4 accent-cyan-500"
                />
              </label>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Mouse Look Sensitivity</span>
                  <span className="font-mono text-cyan-400 tabular-nums">
                    {saveData.settings.mouseSensitivity.toFixed(1)}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.0"
                  step="0.1"
                  value={saveData.settings.mouseSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...saveData.settings,
                      mouseSensitivity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-medium">Touch Controls</span>
                <select
                  value={saveData.settings.mobileControlsMode}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...saveData.settings,
                      mobileControlsMode: e.target.value as GameSettings['mobileControlsMode'],
                    })
                  }
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                >
                  <option value="auto">Auto (Touch/Mobile)</option>
                  <option value="always">Always Show</option>
                  <option value="off">Off</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800">
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Saved Progress</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onResetSave();
                        setConfirmReset(false);
                      }}
                      className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setModal('none')}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
