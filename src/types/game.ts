import * as THREE from 'three';

export type RoomId = 1 | 2 | 3 | 4 | 5;

export type GameScreen =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'room_complete'
  | 'victory';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface RoomEducationalContent {
  concept: string;
  formula: string;
  realLifeExample: string;
  puzzleExplanation: string;
  questions: QuizQuestion[];
}

export interface RoomDefinition {
  id: RoomId;
  code: string;
  title: string;
  subtitle: string;
  topic: string;
  primaryFormula: string;
  briefing: string;
  objectives: string[];
  hints: [string, string, string];
  educational: RoomEducationalContent;
  accentColor: string;
}

export interface RoomProgress {
  completed: boolean;
  unlocked: boolean;
  bestScore: number;
  bestTimeSeconds: number | null;
  stars: number; // 0 to 3
  hintsUsed: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  mouseSensitivity: number; // 0.3 to 2.0
  showFormulas: boolean;
  mobileControlsMode: 'auto' | 'always' | 'off';
}

export interface SaveData {
  rooms: Record<RoomId, RoomProgress>;
  totalScore: number;
  settings: GameSettings;
}

export interface LiveTelemetry {
  objectiveText: string;
  progressPercent: number;
  formulaLabel: string;
  formulaLiveValue: string;
  targetPrompt: string | null;
  isCarrying: boolean;
  carriedName: string | null;
  doorUnlocked: boolean;
  roomSpecificStatus: string;
  pointerLocked: boolean;
}

export interface DynamicBody {
  id: string;
  name: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
  radius: number;
  halfExtents: THREE.Vector3; // for boxes
  shape: 'sphere' | 'box';
  friction: number;
  restitution: number;
  pickable: boolean;
  pushable: boolean;
  isCarried: boolean;
  isMagnetic?: boolean;
  magnetPolarity?: 'N' | 'S' | null; // if permanent magnet
  onGround: boolean;
  userData?: Record<string, unknown>;
}

export interface InteractiveTarget {
  id: string;
  object: THREE.Object3D;
  label: string;
  formulaHint?: string;
  onInteract: () => void;
}
