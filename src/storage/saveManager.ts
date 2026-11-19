import { GameSettings, RoomId, RoomProgress, SaveData } from '../types/game';

const STORAGE_KEY = 'physics_escape_save_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  mouseSensitivity: 1.0,
  showFormulas: true,
  mobileControlsMode: 'auto',
};

export function createInitialSaveData(): SaveData {
  const createRoom = (unlocked: boolean): RoomProgress => ({
    completed: false,
    unlocked,
    bestScore: 0,
    bestTimeSeconds: null,
    stars: 0,
    hintsUsed: 0,
  });

  return {
    rooms: {
      1: createRoom(true),
      2: createRoom(false),
      3: createRoom(false),
      4: createRoom(false),
      5: createRoom(false),
    },
    totalScore: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = createInitialSaveData();
    const mergedRooms: Record<RoomId, RoomProgress> = { ...base.rooms };
    ([1, 2, 3, 4, 5] as RoomId[]).forEach((id) => {
      if (parsed.rooms && parsed.rooms[id]) {
        mergedRooms[id] = { ...base.rooms[id], ...parsed.rooms[id] };
      }
    });
    mergedRooms[1].unlocked = true;
    const totalScore = ([1, 2, 3, 4, 5] as RoomId[]).reduce(
      (sum, id) => sum + (mergedRooms[id]?.bestScore || 0),
      0,
    );
    return {
      rooms: mergedRooms,
      totalScore,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return createInitialSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetSaveData(): SaveData {
  const fresh = createInitialSaveData();
  persistSaveData(fresh);
  return fresh;
}
