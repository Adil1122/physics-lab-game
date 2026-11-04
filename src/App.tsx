import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { PhysicsWorld } from './physics/engine';
import { LEVELS } from './physics/levels';
import { Navbar } from './components/Navbar';
import { CanvasRenderer } from './components/CanvasRenderer';
import { ChallengePanel } from './components/ChallengePanel';
import { SandboxToolbar } from './components/SandboxToolbar';
import { EnergyHUD } from './components/EnergyHUD';
import { TheoryLab } from './components/TheoryLab';
import { LevelStar, PhysicsBody, Vector2 } from './types/physics';

export const App: React.FC = () => {
  const [mode, setMode] = useState<'challenges' | 'sandbox' | 'theory'>('challenges');
  const [paused, setPaused] = useState<boolean>(false);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);

  // Challenge mode state
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [stars, setStars] = useState<LevelStar[]>([]);
  const [starsCollected, setStarsCollected] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Player tuning variables
  const [cannonAngle, setCannonAngle] = useState<number>(48);
  const [cannonPower, setCannonPower] = useState<number>(820);
  const [dropHeight, setDropHeight] = useState<number>(180);
  const [massSlider, setMassSlider] = useState<number>(5.5);
  const [densitySlider, setDensitySlider] = useState<number>(1.08);

  // Sandbox mode state
  const [currentTool, setCurrentTool] = useState<string>('drag');
  const [gravityY, setGravityY] = useState<number>(980);
  const [airResistance, setAirResistance] = useState<number>(0.001);
  const [spawnBounciness, setSpawnBounciness] = useState<number>(0.8);
  const [spawnMass, setSpawnMass] = useState<number>(2.0);

  // Telemetry state
  const [energy, setEnergy] = useState<{ kinetic: number; potential: number; total: number }>({
    kinetic: 0,
    potential: 0,
    total: 0,
  });
  const [bodyCount, setBodyCount] = useState<number>(0);

  // Single persistent physics world
  const worldRef = useRef<PhysicsWorld>(new PhysicsWorld(1000, 650));
  const world = worldRef.current;

  // Load a level
  const loadLevel = useCallback((idx: number) => {
    const level = LEVELS[idx];
    world.reset();
    world.gravity = { x: 0, y: level.gravity };
    world.airResistance = level.airResistance;

    // Deep clone bodies
    for (const b of level.bodies) {
      world.addBody({ ...b, trail: [] });
    }

    // Constraints
    if (level.constraints) {
      for (const c of level.constraints) {
        world.addConstraint({ ...c });
      }
    }

    // Water zones
    if (level.waterZones) {
      world.waterZones = level.waterZones.map(w => ({ ...w }));
    }

    // Gravity wells
    if (level.gravityWells) {
      world.gravityWells = level.gravityWells.map(g => ({ ...g }));
    }

    // Stars
    if (level.stars) {
      setStars(level.stars.map(s => ({ ...s, collected: false })));
    } else {
      setStars([]);
    }

    setStarsCollected(0);
    setIsCompleted(false);

    // Default parameters for level
    if (level.playerAdjustable?.cannonAngle) setCannonAngle(level.playerAdjustable.cannonAngle.default);
    if (level.playerAdjustable?.cannonPower) setCannonPower(level.playerAdjustable.cannonPower.default);
    if (level.playerAdjustable?.dropHeight) setDropHeight(level.playerAdjustable.dropHeight.default);
    if (level.playerAdjustable?.massSlider) setMassSlider(level.playerAdjustable.massSlider.default);
    if (level.playerAdjustable?.densitySlider) setDensitySlider(level.playerAdjustable.densitySlider.default);

    setBodyCount(world.bodies.length);
  }, [world]);

  // Initial load
  useEffect(() => {
    loadLevel(0);
  }, [loadLevel]);

  // Update world physics settings on state change
  useEffect(() => {
    world.paused = paused;
  }, [paused, world]);

  useEffect(() => {
    world.timeScale = timeScale;
  }, [timeScale, world]);

  useEffect(() => {
    if (mode === 'sandbox') {
      world.gravity.y = gravityY;
      world.airResistance = airResistance;
    }
  }, [gravityY, airResistance, mode, world]);

  // Execute Experiment / Launch button
  const handleLaunch = () => {
    const level = LEVELS[currentLevelIndex];

    if (level.id === 1) {
      // Level 1: Fire cannon projectile
      // Remove any existing projectile
      world.removeBody('cannon_ball');

      const rad = (cannonAngle * Math.PI) / 180;
      const vx = cannonPower * Math.cos(rad);
      const vy = -cannonPower * Math.sin(rad);

      const ball: PhysicsBody = {
        id: 'cannon_ball',
        name: 'Titanium Shell',
        type: 'circle',
        x: 120,
        y: 550,
        prevX: 120,
        prevY: 550,
        vx,
        vy,
        radius: 14,
        width: 0,
        height: 0,
        angle: 0,
        angularVelocity: 0,
        mass: 2.0,
        inverseMass: 0.5,
        restitution: 0.35,
        friction: 0.3,
        color: '#f59e0b',
        isStatic: false,
        isDominant: true,
        trail: [],
      };
      world.addBody(ball);
      setPaused(false);
    } else if (level.id === 2) {
      // Level 2: Release pendulum with mass tuning
      const striker = world.bodies.find(b => b.id === 'striker');
      if (striker) {
        striker.mass = massSlider;
        striker.inverseMass = 1 / massSlider;
        striker.x = 120;
        striker.y = dropHeight;
        striker.vx = 0;
        striker.vy = 0;
        striker.trail = [];
      }
      setPaused(false);
    } else if (level.id === 3) {
      // Level 3: Submersible Bathysphere
      const sub = world.bodies.find(b => b.id === 'submarine');
      if (sub) {
        sub.density = densitySlider;
        sub.x = 500;
        sub.y = 80;
        sub.vx = 0;
        sub.vy = 0;
        sub.trail = [];
      }
      setPaused(false);
    } else if (level.id === 4) {
      // Level 4: Coaster loop
      const cart = world.bodies.find(b => b.id === 'cart');
      if (cart) {
        cart.x = 90;
        cart.y = dropHeight;
        cart.vx = 0;
        cart.vy = 0;
        cart.trail = [];
      }
      setPaused(false);
    } else if (level.id === 5) {
      // Level 5: Ion probe
      const probe = world.bodies.find(b => b.id === 'ion_probe');
      if (probe) {
        probe.x = 80;
        probe.y = 320;
        const rad = (cannonAngle * Math.PI) / 180;
        probe.vx = cannonPower * Math.cos(rad);
        probe.vy = cannonPower * Math.sin(rad);
        probe.trail = [];
      }
      setPaused(false);
    } else if (level.id === 6) {
      // Level 6: Chaos double pendulum
      const b1 = world.bodies.find(b => b.id === 'bob1');
      const b2 = world.bodies.find(b => b.id === 'bob2');
      if (b1 && b2) {
        const rad1 = (cannonAngle * Math.PI) / 180;
        const rad2 = (cannonPower * Math.PI) / 180;
        b1.x = 500 + Math.sin(rad1) * 130;
        b1.y = 180 + Math.cos(rad1) * 130;
        b1.vx = 0;
        b1.vy = 0;
        b2.x = b1.x + Math.sin(rad2) * 130;
        b2.y = b1.y + Math.cos(rad2) * 130;
        b2.vx = 0;
        b2.vy = 0;
        b2.trail = [];
      }
      setPaused(false);
    }
  };

  // Star collection handler
  const handleStarCollected = (starId: string) => {
    setStars(prev =>
      prev.map(s => (s.id === starId ? { ...s, collected: true } : s))
    );
    setStarsCollected(prev => prev + 1);
  };

  // Main game tick & Goal validation loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const gameLoop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      world.step(dt);

      // Update energy readout occasionally
      if (Math.random() < 0.25) {
        setEnergy(world.calculateEnergy());
        setBodyCount(world.bodies.length);
      }

      // Check level completion
      if (mode === 'challenges' && !isCompleted) {
        const level = LEVELS[currentLevelIndex];
        const goal = level.goal;

        if (goal.type === 'dock_in_zone' && goal.zone) {
          const target = goal.targetId
            ? world.bodies.find(b => b.id === goal.targetId)
            : world.bodies.find(b => b.id === 'cannon_ball' || b.isDominant);

          if (target) {
            const inX = target.x >= goal.zone.x && target.x <= goal.zone.x + goal.zone.width;
            const inY = target.y >= goal.zone.y && target.y <= goal.zone.y + goal.zone.height;
            const speed = Math.hypot(target.vx, target.vy);

            if (inX && inY && speed < 120) {
              setIsCompleted(true);
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24'],
              });
            }
          }
        } else if (goal.type === 'collect_stars') {
          if (stars.length > 0 && stars.every(s => s.collected)) {
            setIsCompleted(true);
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#ec4899', '#a855f7', '#fbbf24'],
            });
          }
        }
      }

      frameId = requestAnimationFrame(gameLoop);
    };

    frameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [world, mode, isCompleted, currentLevelIndex, stars]);

  // Sandbox spawn handler
  const handleSpawnObject = (pos: Vector2) => {
    if (mode !== 'sandbox') return;

    const id = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (currentTool === 'ball') {
      world.addBody({
        id,
        type: 'circle',
        x: pos.x,
        y: pos.y,
        prevX: pos.x,
        prevY: pos.y,
        vx: (Math.random() - 0.5) * 50,
        vy: 0,
        radius: 20 + Math.random() * 10,
        width: 0,
        height: 0,
        angle: 0,
        angularVelocity: 0,
        mass: spawnMass,
        inverseMass: 1 / spawnMass,
        restitution: spawnBounciness,
        friction: 0.2,
        color: '#38bdf8',
        isStatic: false,
      });
    } else if (currentTool === 'box') {
      world.addBody({
        id,
        type: 'box',
        x: pos.x,
        y: pos.y,
        prevX: pos.x,
        prevY: pos.y,
        vx: 0,
        vy: 0,
        radius: 0,
        width: 44,
        height: 44,
        angle: 0,
        angularVelocity: 0,
        mass: spawnMass,
        inverseMass: 1 / spawnMass,
        restitution: spawnBounciness,
        friction: 0.3,
        color: '#f59e0b',
        isStatic: false,
      });
    } else if (currentTool === 'ramp') {
      world.addBody({
        id,
        type: 'ramp',
        x: pos.x,
        y: pos.y,
        prevX: pos.x,
        prevY: pos.y,
        vx: 0,
        vy: 0,
        radius: 0,
        width: 160,
        height: 18,
        angle: 0.45,
        angularVelocity: 0,
        mass: 0,
        inverseMass: 0,
        restitution: 0.2,
        friction: 0.2,
        color: '#64748b',
        isStatic: true,
      });
    } else if (currentTool === 'trampoline') {
      world.addBody({
        id,
        type: 'box',
        x: pos.x,
        y: pos.y,
        prevX: pos.x,
        prevY: pos.y,
        vx: 0,
        vy: 0,
        radius: 0,
        width: 120,
        height: 16,
        angle: 0,
        angularVelocity: 0,
        mass: 0,
        inverseMass: 0,
        restitution: 1.25, // Super bouncy
        friction: 0.1,
        color: '#ec4899',
        isStatic: true,
      });
    } else if (currentTool === 'charge_pos') {
      world.addBody({
        id,
        name: 'Charge (+)',
        type: 'circle',
        x: pos.x,
        y: pos.y,
        prevX: pos.x,
        prevY: pos.y,
        vx: 0,
        vy: 0,
        radius: 22,
        width: 0,
        height: 0,
        angle: 0,
        angularVelocity: 0,
        mass: spawnMass,
        inverseMass: 1 / spawnMass,
        restitution: 0.8,
        friction: 0.1,
        color: '#ef4444',
        charge: 3.0,
        isStatic: false,
      });
    } else if (currentTool === 'charge_neg') {
      world.addBody({
        id,
        name: 'Charge (−)',
        type: 'circle',
        x: pos.x,
        y: pos.y,
        prevX: pos.x,
        prevY: pos.y,
        vx: 0,
        vy: 0,
        radius: 22,
        width: 0,
        height: 0,
        angle: 0,
        angularVelocity: 0,
        mass: spawnMass,
        inverseMass: 1 / spawnMass,
        restitution: 0.8,
        friction: 0.1,
        color: '#3b82f6',
        charge: -3.0,
        isStatic: false,
      });
    } else if (currentTool === 'water') {
      world.waterZones.push({
        x: pos.x - 120,
        y: pos.y - 60,
        width: 240,
        height: 160,
        density: 1.0,
        viscosity: 0.08,
      });
    } else if (currentTool === 'pin') {
      world.addBody({
        id,
        type: 'pin',
        x: pos.x,
        y: pos.y,
        prevX: pos.x,
        prevY: pos.y,
        vx: 0,
        vy: 0,
        radius: 8,
        width: 16,
        height: 16,
        angle: 0,
        angularVelocity: 0,
        mass: 0,
        inverseMass: 0,
        restitution: 0,
        friction: 0,
        color: '#ffffff',
        isStatic: true,
      });
    }

    setBodyCount(world.bodies.length);
  };

  // Sandbox Presets
  const handleLoadPreset = (preset: 'dominoes' | 'cradle' | 'zerog') => {
    world.reset();

    if (preset === 'dominoes') {
      setGravityY(980);
      world.gravity.y = 980;
      // Spawn shelf
      world.addBody({
        id: 'shelf',
        type: 'box',
        x: 500,
        y: 450,
        prevX: 500,
        prevY: 450,
        vx: 0,
        vy: 0,
        radius: 0,
        width: 700,
        height: 20,
        angle: 0,
        angularVelocity: 0,
        mass: 0,
        inverseMass: 0,
        restitution: 0.2,
        friction: 0.5,
        color: '#475569',
        isStatic: true,
      });

      // 10 Dominoes
      for (let i = 0; i < 11; i++) {
        world.addBody({
          id: `domino_${i}`,
          type: 'box',
          x: 220 + i * 45,
          y: 380,
          prevX: 220 + i * 45,
          prevY: 380,
          vx: 0,
          vy: 0,
          radius: 0,
          width: 14,
          height: 90,
          angle: 0,
          angularVelocity: 0,
          mass: 1.0,
          inverseMass: 1.0,
          restitution: 0.1,
          friction: 0.4,
          color: '#38bdf8',
          isStatic: false,
        });
      }

      // Starter trigger ball
      world.addBody({
        id: 'starter_ball',
        type: 'circle',
        x: 140,
        y: 340,
        prevX: 140,
        prevY: 340,
        vx: 180,
        vy: 0,
        radius: 24,
        width: 0,
        height: 0,
        angle: 0,
        angularVelocity: 0,
        mass: 3.0,
        inverseMass: 0.33,
        restitution: 0.5,
        friction: 0.2,
        color: '#f43f5e',
        isStatic: false,
      });
    } else if (preset === 'cradle') {
      setGravityY(980);
      world.gravity.y = 980;
      const startX = 360;
      const y = 140;

      for (let i = 0; i < 5; i++) {
        const pinId = `cradle_pin_${i}`;
        const bobId = `cradle_bob_${i}`;
        const bx = startX + i * 56;

        world.addBody({
          id: pinId,
          type: 'pin',
          x: bx,
          y,
          prevX: bx,
          prevY: y,
          vx: 0,
          vy: 0,
          radius: 6,
          width: 12,
          height: 12,
          angle: 0,
          angularVelocity: 0,
          mass: 0,
          inverseMass: 0,
          restitution: 0,
          friction: 0,
          color: '#94a3b8',
          isStatic: true,
        });

        // Pull left ball back
        const initialX = i === 0 ? bx - 140 : bx;
        const initialY = i === 0 ? y + 160 : y + 240;

        world.addBody({
          id: bobId,
          type: 'circle',
          x: initialX,
          y: initialY,
          prevX: initialX,
          prevY: initialY,
          vx: 0,
          vy: 0,
          radius: 27,
          width: 0,
          height: 0,
          angle: 0,
          angularVelocity: 0,
          mass: 2.0,
          inverseMass: 0.5,
          restitution: 0.99,
          friction: 0.01,
          color: i === 0 ? '#38bdf8' : '#94a3b8',
          isStatic: false,
        });

        world.addConstraint({
          id: `cradle_rod_${i}`,
          type: 'rod',
          bodyAId: pinId,
          bodyBId: bobId,
          length: 240,
          stiffness: 1.0,
        });
      }
    } else if (preset === 'zerog') {
      setGravityY(0);
      world.gravity.y = 0;

      // Central core charge
      world.addBody({
        id: 'core_charge',
        type: 'circle',
        x: 500,
        y: 325,
        prevX: 500,
        prevY: 325,
        vx: 0,
        vy: 0,
        radius: 36,
        width: 0,
        height: 0,
        angle: 0,
        angularVelocity: 0,
        mass: 0,
        inverseMass: 0,
        restitution: 0.5,
        friction: 0.1,
        color: '#ef4444',
        charge: 5.0,
        isStatic: true,
      });

      // Orbiting particles
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const dist = 180;
        const px = 500 + Math.cos(angle) * dist;
        const py = 325 + Math.sin(angle) * dist;
        const speed = 220;

        world.addBody({
          id: `satellite_${i}`,
          type: 'circle',
          x: px,
          y: py,
          prevX: px,
          prevY: py,
          vx: -Math.sin(angle) * speed,
          vy: Math.cos(angle) * speed,
          radius: 18,
          width: 0,
          height: 0,
          angle: 0,
          angularVelocity: 0,
          mass: 1.0,
          inverseMass: 1.0,
          restitution: 0.9,
          friction: 0.05,
          color: '#3b82f6',
          charge: -2.0, // opposite attracts
          isStatic: false,
          trail: [],
        });
      }
    }

    setPaused(false);
    setBodyCount(world.bodies.length);
  };

  const handleClearAll = () => {
    world.reset();
    setBodyCount(0);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        mode={mode}
        setMode={setMode}
        paused={paused}
        setPaused={setPaused}
        onReset={() => {
          if (mode === 'challenges') loadLevel(currentLevelIndex);
          else handleClearAll();
        }}
        timeScale={timeScale}
        setTimeScale={setTimeScale}
        showVectors={showVectors}
        setShowVectors={setShowVectors}
        showTrajectories={showTrajectories}
        setShowTrajectories={setShowTrajectories}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {mode === 'theory' ? (
          <TheoryLab />
        ) : (
          <>
            {/* Live Simulation Viewport */}
            <div className="flex-1 relative flex items-center justify-center p-3 bg-slate-950 overflow-hidden">
              <EnergyHUD
                energy={energy}
                bodyCount={bodyCount}
                gravityY={mode === 'sandbox' ? gravityY : (LEVELS[currentLevelIndex]?.gravity || 980)}
              />

              <CanvasRenderer
                world={world}
                stars={stars}
                showVectors={showVectors}
                showTrajectories={showTrajectories}
                onStarCollected={handleStarCollected}
                aimAngle={cannonAngle}
                aimPower={cannonPower}
                isCannonLevel={mode === 'challenges' && (currentLevelIndex === 0 || currentLevelIndex === 4)}
                cannonOrigin={{ x: 120, y: 550 }}
                currentTool={mode === 'sandbox' ? currentTool : 'drag'}
                onSpawnObject={handleSpawnObject}
              />
            </div>

            {/* Sidebar Controls */}
            {mode === 'challenges' ? (
              <ChallengePanel
                levels={LEVELS}
                currentLevelIndex={currentLevelIndex}
                onSelectLevel={(idx) => {
                  setCurrentLevelIndex(idx);
                  loadLevel(idx);
                }}
                cannonAngle={cannonAngle}
                setCannonAngle={setCannonAngle}
                cannonPower={cannonPower}
                setCannonPower={setCannonPower}
                dropHeight={dropHeight}
                setDropHeight={setDropHeight}
                massSlider={massSlider}
                setMassSlider={setMassSlider}
                densitySlider={densitySlider}
                setDensitySlider={setDensitySlider}
                onLaunch={handleLaunch}
                starsCollected={starsCollected}
                isCompleted={isCompleted}
                onNextLevel={() => {
                  if (currentLevelIndex < LEVELS.length - 1) {
                    const next = currentLevelIndex + 1;
                    setCurrentLevelIndex(next);
                    loadLevel(next);
                  }
                }}
              />
            ) : (
              <SandboxToolbar
                currentTool={currentTool}
                setCurrentTool={setCurrentTool}
                gravityY={gravityY}
                setGravityY={setGravityY}
                airResistance={airResistance}
                setAirResistance={setAirResistance}
                spawnBounciness={spawnBounciness}
                setSpawnBounciness={setSpawnBounciness}
                spawnMass={spawnMass}
                setSpawnMass={setSpawnMass}
                onClearAll={handleClearAll}
                onLoadPreset={handleLoadPreset}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
