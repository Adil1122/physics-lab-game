export interface Vector2 {
  x: number;
  y: number;
}

export type BodyType = 'circle' | 'box' | 'ramp' | 'pin';

export interface PhysicsBody {
  id: string;
  name?: string;
  type: BodyType;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number; // for circle
  width: number;  // for box / ramp
  height: number; // for box / ramp
  angle: number;  // radians
  angularVelocity: number;
  mass: number;   // 0 for static/pinned
  inverseMass: number;
  restitution: number; // bounciness [0, 1]
  friction: number;    // [0, 1]
  color: string;
  isStatic: boolean;
  charge?: number; // positive or negative for electrostatic
  density?: number; // for buoyancy (water is 1.0)
  inWater?: boolean;
  trail?: Vector2[];
  isTarget?: boolean;
  isGoal?: boolean;
  isHazard?: boolean;
  isDominant?: boolean;
  tag?: string;
}

export interface Constraint {
  id: string;
  type: 'spring' | 'rod' | 'rope';
  bodyAId: string;
  bodyBId: string;
  length: number;
  stiffness: number; // 0.05 to 1.0
  damping?: number;
  color?: string;
}

export interface WaterZone {
  x: number;
  y: number;
  width: number;
  height: number;
  density: number; // typically 1.0
  viscosity: number; // drag factor
  waveOffset?: number;
}

export interface GravityWell {
  id: string;
  x: number;
  y: number;
  mass: number; // positive = attract, negative = repel
  radius: number;
}

export interface LevelGoal {
  type: 'hit_target' | 'dock_in_zone' | 'collect_stars' | 'reach_speed' | 'trigger_domino';
  description: string;
  targetId?: string;
  zone?: { x: number; y: number; width: number; height: number };
  requiredStars?: number;
  requiredSpeed?: number;
}

export interface LevelStar {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  category: 'Kinematics' | 'Energy' | 'Momentum' | 'Fluids' | 'Chaos' | 'Gravity' | 'Mechanics';
  instructions: string;
  formula: string;
  concept: string;
  gravity: number;
  airResistance: number;
  bodies: PhysicsBody[];
  constraints?: Constraint[];
  waterZones?: WaterZone[];
  gravityWells?: GravityWell[];
  stars?: LevelStar[];
  goal: LevelGoal;
  playerAdjustable?: {
    cannonAngle?: { min: number; max: number; default: number; step: number };
    cannonPower?: { min: number; max: number; default: number; step: number };
    dropHeight?: { min: number; max: number; default: number };
    massSlider?: { min: number; max: number; default: number; label: string };
    densitySlider?: { min: number; max: number; default: number; label: string };
    allowCustomObjects?: boolean;
    availableSpawnTools?: ('ball' | 'box' | 'ramp' | 'trampoline' | 'spring' | 'magnet')[];
    maxCustomObjects?: number;
  };
}
