import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PhysicsWorld } from '../physics/engine';
import { PhysicsBody, LevelStar, Vector2 } from '../types/physics';

interface CanvasRendererProps {
  world: PhysicsWorld;
  stars?: LevelStar[];
  showVectors: boolean;
  showTrajectories: boolean;
  onStarCollected?: (starId: string) => void;
  onGoalAchieved?: () => void;
  isGoalChecked?: boolean;
  aimAngle?: number;
  aimPower?: number;
  isCannonLevel?: boolean;
  cannonOrigin?: Vector2;
  currentTool?: string;
  onSpawnObject?: (pos: Vector2) => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  world,
  stars = [],
  showVectors,
  showTrajectories,
  onStarCollected,
  onGoalAchieved,
  isGoalChecked,
  aimAngle = 45,
  aimPower = 600,
  isCannonLevel = false,
  cannonOrigin = { x: 120, y: 550 },
  currentTool = 'drag',
  onSpawnObject,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [draggedBody, setDraggedBody] = useState<PhysicsBody | null>(null);
  const dragOffsetRef = useRef<Vector2>({ x: 0, y: 0 });
  const mousePosRef = useRef<Vector2>({ x: 0, y: 0 });
  const waterTimeRef = useRef<number>(0);

  // Get mouse coordinates relative to world space
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Vector2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = world.bounds.width / rect.width;
    const scaleY = world.bounds.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [world.bounds]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    mousePosRef.current = coords;

    if (currentTool !== 'drag') {
      if (onSpawnObject) {
        onSpawnObject(coords);
      }
      return;
    }

    // Find clicked body
    for (let i = world.bodies.length - 1; i >= 0; i--) {
      const b = world.bodies[i];
      if (b.isStatic && b.type !== 'pin') continue;

      const dist = Math.hypot(coords.x - b.x, coords.y - b.y);
      const hitRadius = b.type === 'circle' ? b.radius : Math.max(b.width, b.height) / 2;

      if (dist <= hitRadius + 10) {
        setDraggedBody(b);
        dragOffsetRef.current = { x: b.x - coords.x, y: b.y - coords.y };
        b.vx = 0;
        b.vy = 0;
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    mousePosRef.current = coords;

    if (draggedBody && currentTool === 'drag') {
      const targetX = coords.x + dragOffsetRef.current.x;
      const targetY = coords.y + dragOffsetRef.current.y;

      draggedBody.vx = (targetX - draggedBody.x) * 20;
      draggedBody.vy = (targetY - draggedBody.y) * 20;

      draggedBody.x = targetX;
      draggedBody.y = targetY;
      draggedBody.prevX = targetX;
      draggedBody.prevY = targetY;
    }
  };

  const handleMouseUp = () => {
    setDraggedBody(null);
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      waterTimeRef.current += 0.04;
      const t = waterTimeRef.current;

      ctx.clearRect(0, 0, world.bounds.width, world.bounds.height);

      // 1. Draw Lab Grid Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, world.bounds.width, world.bounds.height);

      // Fine grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < world.bounds.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, world.bounds.height);
        ctx.stroke();
      }
      for (let y = 0; y < world.bounds.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(world.bounds.width, y);
        ctx.stroke();
      }

      // Major grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < world.bounds.width; x += gridSize * 4) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, world.bounds.height);
        ctx.stroke();
      }
      for (let y = 0; y < world.bounds.height; y += gridSize * 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(world.bounds.width, y);
        ctx.stroke();
      }

      // 2. Draw Water Zones
      for (const w of world.waterZones) {
        // Fluid body gradient
        const waterGrad = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.height);
        waterGrad.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
        waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.65)');
        ctx.fillStyle = waterGrad;

        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        // Sine wave top surface
        const waveStep = 10;
        for (let x = w.x; x <= w.x + w.width; x += waveStep) {
          const waveY = w.y + Math.sin(x * 0.04 + t * 2) * 4;
          ctx.lineTo(x, waveY);
        }
        ctx.lineTo(w.x + w.width, w.y + w.height);
        ctx.lineTo(w.x, w.y + w.height);
        ctx.closePath();
        ctx.fill();

        // Water surface highlight
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = w.x; x <= w.x + w.width; x += waveStep) {
          const waveY = w.y + Math.sin(x * 0.04 + t * 2) * 4;
          if (x === w.x) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }

      // 3. Draw Trajectory Prediction for Cannon
      if (isCannonLevel && showTrajectories) {
        const rad = (aimAngle * Math.PI) / 180;
        const v0 = aimPower;
        const vx = v0 * Math.cos(rad);
        const vy = -v0 * Math.sin(rad);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();

        let px = cannonOrigin.x;
        let py = cannonOrigin.y;
        ctx.moveTo(px, py);

        const dtSim = 0.03;
        let simVx = vx;
        let simVy = vy;

        for (let step = 0; step < 70; step++) {
          simVy += world.gravity.y * dtSim;
          px += simVx * dtSim;
          py += simVy * dtSim;

          if (py > world.bounds.height || px > world.bounds.width) break;

          if (step % 3 === 0) {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw Constraints (Springs, Rods, Ropes)
      for (const c of world.constraints) {
        const a = world.bodies.find(b => b.id === c.bodyAId);
        const b = world.bodies.find(b => b.id === c.bodyBId);
        if (!a || !b) continue;

        ctx.save();
        if (c.type === 'spring') {
          // Draw coiled spring
          ctx.strokeStyle = c.color || '#38bdf8';
          ctx.lineWidth = 3;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          ctx.translate(a.x, a.y);
          ctx.rotate(angle);

          ctx.beginPath();
          ctx.moveTo(0, 0);
          const coils = 12;
          const step = dist / coils;
          for (let i = 1; i <= coils; i++) {
            const zigX = (i - 0.5) * step;
            const zigY = (i % 2 === 0 ? 1 : -1) * 8;
            ctx.lineTo(zigX, zigY);
          }
          ctx.lineTo(dist, 0);
          ctx.stroke();
        } else {
          // Rigid rod / rope
          ctx.strokeStyle = c.color || '#94a3b8';
          ctx.lineWidth = c.type === 'rod' ? 4 : 2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5. Draw Trails
      for (const b of world.bodies) {
        if (b.trail && b.trail.length > 1 && !b.isStatic) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(b.trail[0].x, b.trail[0].y);
          for (let i = 1; i < b.trail.length; i++) {
            ctx.lineTo(b.trail[i].x, b.trail[i].y);
          }
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.45;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 6. Draw Stars (Collectible Nodes)
      for (const s of stars) {
        if (s.collected) continue;

        ctx.save();
        const pulse = Math.sin(t * 3 + s.x) * 3;
        const currentRadius = s.radius + pulse;

        // Glow ring
        const starGrad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, currentRadius + 8);
        starGrad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
        starGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
        starGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = starGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, currentRadius + 8, 0, Math.PI * 2);
        ctx.fill();

        // 5-point star
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        const spikes = 5;
        const rot = Math.PI / 2 * 3 + t;
        const outer = currentRadius;
        const inner = currentRadius * 0.5;
        let step = Math.PI / spikes;

        let x = s.x;
        let y = s.y;
        ctx.moveTo(s.x, s.y - outer);
        for (let i = 0; i < spikes; i++) {
          x = s.x + Math.cos(rot + i * step * 2) * outer;
          y = s.y + Math.sin(rot + i * step * 2) * outer;
          ctx.lineTo(x, y);
          x = s.x + Math.cos(rot + (i * 2 + 1) * step) * inner;
          y = s.y + Math.sin(rot + (i * 2 + 1) * step) * inner;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Collision check with dynamic dominant bodies
        for (const b of world.bodies) {
          if (!b.isStatic && (b.isDominant || b.type === 'circle')) {
            const d = Math.hypot(b.x - s.x, b.y - s.y);
            if (d < b.radius + s.radius) {
              s.collected = true;
              if (onStarCollected) onStarCollected(s.id);
            }
          }
        }
      }

      // 7. Draw Physics Bodies
      for (const b of world.bodies) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        // Electrostatic charge aura
        if (b.charge) {
          ctx.save();
          const auraGrad = ctx.createRadialGradient(0, 0, b.radius, 0, 0, b.radius + 20);
          if (b.charge > 0) {
            auraGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
            auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          } else {
            auraGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
            auraGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
          }
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius + 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (b.type === 'circle') {
          // Circle Body
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();

          // Border & gloss
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Direction notch
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(b.radius - 2, 0);
          ctx.stroke();

          // Charge symbol
          if (b.charge) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "JetBrains Mono"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.charge > 0 ? '+' : '−', 0, 0);
          }
        } else if (b.type === 'box' || b.type === 'ramp') {
          // Box / Ramp Body
          if (b.isGoal) {
            // Glowing goal sensor
            ctx.fillStyle = b.color;
            ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.strokeRect(-b.width / 2, -b.height / 2, b.width, b.height);
          } else {
            ctx.fillStyle = b.color;
            ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);

            // Metallic border
            ctx.strokeStyle = b.isStatic ? '#334155' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-b.width / 2, -b.height / 2, b.width, b.height);

            // Lab diagonal stripes for static obstacles
            if (b.isStatic && b.width > 20 && b.height > 20) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
              ctx.lineWidth = 2;
              for (let lineX = -b.width; lineX < b.width; lineX += 16) {
                ctx.beginPath();
                ctx.moveTo(lineX, -b.height / 2);
                ctx.lineTo(lineX + 16, b.height / 2);
                ctx.stroke();
              }
            }
          }
        } else if (b.type === 'pin') {
          // Pivot pin
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(0, 0, b.radius / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // 8. Velocity Vectors
        if (showVectors && !b.isStatic) {
          const speed = Math.hypot(b.vx, b.vy);
          if (speed > 8) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.fillStyle = '#38bdf8';
            ctx.lineWidth = 2;
            const vectorScale = 0.12;
            const arrowX = b.x + b.vx * vectorScale;
            const arrowY = b.y + b.vy * vectorScale;

            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(arrowX, arrowY);
            ctx.stroke();

            // Arrow head
            const arrowAngle = Math.atan2(b.vy, b.vx);
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 8 * Math.cos(arrowAngle - 0.4), arrowY - 8 * Math.sin(arrowAngle - 0.4));
            ctx.lineTo(arrowX - 8 * Math.cos(arrowAngle + 0.4), arrowY - 8 * Math.sin(arrowAngle + 0.4));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // 9. Cannon Barrel (if level has cannon)
      if (isCannonLevel) {
        ctx.save();
        ctx.translate(cannonOrigin.x, cannonOrigin.y);
        ctx.rotate((-aimAngle * Math.PI) / 180);

        // Barrel gradient
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(0, -14, 56, 28);
        ctx.strokeRect(0, -14, 56, 28);

        // Cannon base mount
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cannonOrigin.x, cannonOrigin.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [world, stars, showVectors, showTrajectories, aimAngle, aimPower, isCannonLevel, cannonOrigin, onStarCollected]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-950 select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        width={world.bounds.width}
        height={world.bounds.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full object-contain rounded-xl shadow-2xl border border-slate-800 cursor-crosshair"
      />
    </div>
  );
};
