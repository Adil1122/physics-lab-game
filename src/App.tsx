import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ROOM_ORDER, ROOMS_DATA } from './data/roomsData';
import { GameScreen, GameSettings, LiveTelemetry, RoomId, SaveData } from './types/game';
import { loadSaveData, persistSaveData, resetSaveData } from './storage/saveManager';
import { soundEngine } from './audio/soundEngine';
import { GameViewport, MobileInputState, ViewportActionsRef } from './components/GameViewport';
import { StartMenu } from './components/StartMenu';
import { GameHUD } from './components/GameHUD';
import { HintModal } from './components/HintModal';
import { PauseModal } from './components/PauseModal';
import { RoomCompleteModal } from './components/RoomCompleteModal';
import { GameVictoryScreen } from './components/GameVictoryScreen';

const INITIAL_TELEMETRY: LiveTelemetry = {
  objectiveText: 'Explore the laboratory and inspect physics apparatus',
  progressPercent: 0,
  formulaLabel: 'F = m · g',
  formulaLiveValue: '',
  targetPrompt: null,
  isCarrying: false,
  carriedName: null,
  doorUnlocked: false,
  roomSpecificStatus: '',
  pointerLocked: false,
};

export const App: React.FC = () => {
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<RoomId>(1);
  const [resetCounter, setResetCounter] = useState(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [roomStepScore, setRoomStepScore] = useState(0);
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [doorToastVisible, setDoorToastVisible] = useState(false);

  const [telemetry, setTelemetry] = useState<LiveTelemetry>(INITIAL_TELEMETRY);
  const [lastCompletedStats, setLastCompletedStats] = useState<{
    timeSeconds: number;
    hintsUsed: number;
    baseScore: number;
    stars: number;
  } | null>(null);

  const mobileInputRef = useRef<MobileInputState>({ forward: 0, right: 0, jump: false });
  const actionsRef = useRef<ViewportActionsRef | null>(null);

  useEffect(() => {
    soundEngine.setSettings(saveData.settings.soundEnabled, saveData.settings.musicEnabled);
  }, [saveData.settings.soundEnabled, saveData.settings.musicEnabled]);

  // Room timer ticks only while actively playing without modals open
  useEffect(() => {
    if (screen !== 'playing' || hintModalOpen) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, hintModalOpen]);

  const updateSettings = useCallback((nextSettings: GameSettings) => {
    setSaveData((prev) => {
      const updated: SaveData = { ...prev, settings: nextSettings };
      persistSaveData(updated);
      return updated;
    });
  }, []);

  const startRoom = useCallback((roomId: RoomId) => {
    setCurrentRoomId(roomId);
    setElapsedSeconds(0);
    setHintsUsed(0);
    setRoomStepScore(0);
    setHintModalOpen(false);
    setDoorToastVisible(false);
    setTelemetry(INITIAL_TELEMETRY);
    setResetCounter((c) => c + 1);
    setScreen('playing');
  }, []);

  const handleRestartRoom = useCallback(() => {
    soundEngine.playClick();
    startRoom(currentRoomId);
  }, [currentRoomId, startRoom]);

  const handleDoorUnlocked = useCallback(() => {
    setDoorToastVisible(true);
    window.setTimeout(() => setDoorToastVisible(false), 4500);
  }, []);

  const handleRoomExited = useCallback(() => {
    const timeBonus = Math.max(50, 350 - elapsedSeconds * 2);
    const hintPenalty = hintsUsed * 60;
    const completionBase = 400;
    const baseScore = Math.max(200, completionBase + roomStepScore + timeBonus - hintPenalty);

    let stars = 1;
    if (hintsUsed === 0 && elapsedSeconds <= 150) stars = 3;
    else if (hintsUsed <= 1 && elapsedSeconds <= 240) stars = 2;

    setLastCompletedStats({
      timeSeconds: elapsedSeconds,
      hintsUsed,
      baseScore,
      stars,
    });
    soundEngine.playVictory();
    setScreen('room_complete');
  }, [elapsedSeconds, hintsUsed, roomStepScore]);

  const handleContinueAfterComplete = useCallback(
    (quizBonusPoints: number) => {
      if (!lastCompletedStats) return;
      const finalRoomScore = lastCompletedStats.baseScore + quizBonusPoints;

      setSaveData((prev) => {
        const nextRooms = { ...prev.rooms };
        const existing = nextRooms[currentRoomId];
        nextRooms[currentRoomId] = {
          completed: true,
          unlocked: true,
          bestScore: Math.max(existing.bestScore, finalRoomScore),
          bestTimeSeconds:
            existing.bestTimeSeconds === null
              ? lastCompletedStats.timeSeconds
              : Math.min(existing.bestTimeSeconds, lastCompletedStats.timeSeconds),
          stars: Math.max(existing.stars, lastCompletedStats.stars),
          hintsUsed: lastCompletedStats.hintsUsed,
        };

        if (currentRoomId < 5) {
          const nextId = (currentRoomId + 1) as RoomId;
          nextRooms[nextId] = { ...nextRooms[nextId], unlocked: true };
        }

        const totalScore = ROOM_ORDER.reduce((sum, id) => sum + nextRooms[id].bestScore, 0);
        const updated: SaveData = {
          ...prev,
          rooms: nextRooms,
          totalScore,
        };
        persistSaveData(updated);
        return updated;
      });

      if (currentRoomId === 5) {
        setScreen('victory');
      } else {
        startRoom((currentRoomId + 1) as RoomId);
      }
    },
    [currentRoomId, lastCompletedStats, startRoom],
  );

  const handleOpenHint = useCallback(() => {
    if (screen !== 'playing') return;
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    soundEngine.playHint();
    setHintModalOpen(true);
  }, [screen]);

  const handleRevealNextHint = useCallback(() => {
    soundEngine.playHint();
    setHintsUsed((h) => Math.min(3, h + 1));
  }, []);

  const currentRoom = ROOMS_DATA[currentRoomId];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Persistent 3D WebGL Viewport */}
      <GameViewport
        screen={hintModalOpen ? 'paused' : screen}
        roomId={currentRoomId}
        resetCounter={resetCounter}
        settings={saveData.settings}
        mobileInputRef={mobileInputRef}
        actionsRef={actionsRef}
        onPauseRequest={() => {
          if (hintModalOpen) {
            setHintModalOpen(false);
          } else if (screen === 'playing') {
            setScreen('paused');
          } else if (screen === 'paused') {
            setScreen('playing');
          }
        }}
        onHintRequest={handleOpenHint}
        onDoorUnlocked={handleDoorUnlocked}
        onRoomExited={handleRoomExited}
        onPuzzleStepScore={(pts) => setRoomStepScore((s) => s + pts)}
        onTelemetry={setTelemetry}
      />

      {/* Start Menu */}
      {screen === 'menu' && (
        <StartMenu
          saveData={saveData}
          onStartGame={startRoom}
          onUpdateSettings={updateSettings}
          onResetSave={() => setSaveData(resetSaveData())}
        />
      )}

      {/* Active In-Game HUD */}
      {screen === 'playing' && (
        <>
          <GameHUD
            room={currentRoom}
            telemetry={telemetry}
            score={saveData.totalScore + roomStepScore}
            elapsedSeconds={elapsedSeconds}
            hintsUsed={hintsUsed}
            settings={saveData.settings}
            mobileInputRef={mobileInputRef}
            actionsRef={actionsRef}
            onOpenHint={handleOpenHint}
            onPause={() => setScreen('paused')}
            onRestart={handleRestartRoom}
            onToggleAudio={() =>
              updateSettings({
                ...saveData.settings,
                soundEnabled: !saveData.settings.soundEnabled,
                musicEnabled: !saveData.settings.soundEnabled,
              })
            }
          />

          {doorToastVisible && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-emerald-950 border border-emerald-500/60 text-emerald-200 px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Exit Blast Door Unlocked — Walk through the portal!</span>
            </div>
          )}
        </>
      )}

      {/* Hint Modal */}
      {screen === 'playing' && hintModalOpen && (
        <HintModal
          room={currentRoom}
          unlockedHints={hintsUsed}
          onRevealNextHint={handleRevealNextHint}
          onClose={() => setHintModalOpen(false)}
        />
      )}

      {/* Pause Modal */}
      {screen === 'paused' && (
        <PauseModal
          room={currentRoom}
          settings={saveData.settings}
          onResume={() => {
            soundEngine.playClick();
            setScreen('playing');
          }}
          onRestart={handleRestartRoom}
          onMainMenu={() => {
            soundEngine.playClick();
            setScreen('menu');
          }}
          onUpdateSettings={updateSettings}
        />
      )}

      {/* Room Complete Educational Debrief & Quiz */}
      {screen === 'room_complete' && lastCompletedStats && (
        <RoomCompleteModal
          room={currentRoom}
          timeSeconds={lastCompletedStats.timeSeconds}
          hintsUsed={lastCompletedStats.hintsUsed}
          baseRoomScore={lastCompletedStats.baseScore}
          starsEarned={lastCompletedStats.stars}
          onContinue={handleContinueAfterComplete}
        />
      )}

      {/* Final Escape Victory Screen */}
      {screen === 'victory' && (
        <GameVictoryScreen
          saveData={saveData}
          onPlayAgain={() => {
            soundEngine.playClick();
            startRoom(1);
          }}
          onMainMenu={() => {
            soundEngine.playClick();
            setScreen('menu');
          }}
        />
      )}
    </div>
  );
};

export default App;
