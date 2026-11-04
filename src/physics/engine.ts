import { PhysicsBody, Constraint, WaterZone, GravityWell, Vector2 } from '../types/physics';

export class PhysicsWorld {
  bodies: PhysicsBody[] = [];
  constraints: Constraint[] = [];
  waterZones: WaterZone[] = [];
  gravityWells: GravityWell[] = [];

  gravity: Vector2 = { x: 0, y: 980 }; // standard 9.8 m/s^2 scaled to pixels
  airResistance: number = 0.001; // linear drag
  bounds = { width: 1000, height: 650 };
  timeScale: number = 1.0;
  paused: boolean = false;

  subSteps: number = 8; // high stability sub-stepping

  constructor(width: number = 1000, height: number = 650) {
    this.bounds = { width, height };
  }

  reset() {
    this.bodies = [];
    this.constraints = [];
    this.waterZones = [];
    this.gravityWells = [];
  }

  addBody(body: PhysicsBody) {
    this.bodies.push(body);
    return body;
  }

  removeBody(id: string) {
    this.bodies = this.bodies.filter(b => b.id !== id);
    this.constraints = this.constraints.filter(c => c.bodyAId !== id && c.bodyBId !== id);
  }

  addConstraint(constraint: Constraint) {
    this.constraints.push(constraint);
  }

  step(rawDt: number) {
    if (this.paused) return;

    // Clamp dt to avoid spiral of death
    const dt = Math.min(rawDt, 0.033) * this.timeScale;
    const subDt = dt / this.subSteps;

    for (let s = 0; s < this.subSteps; s++) {
      this.applyForces(subDt);
      this.integrate(subDt);
      this.resolveConstraints(subDt);
      this.resolveCollisions();
      this.handleBoundaries();
    }

    // Update trails and metrics at normal step rate
    this.updateMetrics();
  }

  private applyForces(dt: number) {
    for (const b of this.bodies) {
      if (b.isStatic) continue;

      // 1. Gravity
      b.vx += this.gravity.x * dt;
      b.vy += this.gravity.y * dt;

      // 2. Air resistance / Aerodynamic drag
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 0) {
        const dragMagnitude = this.airResistance * speed * dt;
        const dragFactor = Math.max(0, 1 - dragMagnitude);
        b.vx *= dragFactor;
        b.vy *= dragFactor;
      }

      // 3. Fluid Buoyancy (Archimedes' Principle)
      for (const water of this.waterZones) {
        if (
          b.x + b.radius > water.x &&
          b.x - b.radius < water.x + water.width &&
          b.y + b.radius > water.y &&
          b.y - b.radius < water.y + water.height
        ) {
          b.inWater = true;
          // Calculate submerged fraction
          const bodyTop = b.y - (b.type === 'circle' ? b.radius : b.height / 2);
          const bodyBottom = b.y + (b.type === 'circle' ? b.radius : b.height / 2);
          const submergedHeight = Math.min(bodyBottom, water.y + water.height) - Math.max(bodyTop, water.y);
          const totalHeight = b.type === 'circle' ? b.radius * 2 : b.height;
          const submergedFraction = Math.max(0, Math.min(1, submergedHeight / totalHeight));

          const bodyDensity = b.density || 1.0;
          // Buoyancy force upward: F_b = rho * V * g
          const buoyantAcceleration = (water.density / bodyDensity) * this.gravity.y * submergedFraction;
          b.vy -= buoyantAcceleration * dt;

          // Water viscosity damping
          const waterDrag = Math.min(1, water.viscosity * dt * submergedFraction * 12);
          b.vx *= 1 - waterDrag;
          b.vy *= 1 - waterDrag;
        } else {
          b.inWater = false;
        }
      }

      // 4. Gravity Wells (Attractors/Repulsors)
      for (const well of this.gravityWells) {
        const dx = well.x - b.x;
        const dy = well.y - b.y;
        const distSq = dx * dx + dy * dy + 400; // softening factor
        const dist = Math.sqrt(distSq);
        const force = (well.mass * 50000) / distSq;
        b.vx += (dx / dist) * force * dt;
        b.vy += (dy / dist) * force * dt;
      }

      // 5. Electrostatic forces (Coulomb's Law)
      if (b.charge) {
        for (const other of this.bodies) {
          if (other === b || !other.charge) continue;
          const dx = other.x - b.x;
          const dy = other.y - b.y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          // Like charges repel (positive product -> push away)
          // Coulomb constant
          const coulombForce = -(b.charge * other.charge * 120000) / distSq;
          b.vx += (dx / dist) * (coulombForce * b.inverseMass) * dt;
          b.vy += (dy / dist) * (coulombForce * b.inverseMass) * dt;
        }
      }
    }
  }

  private integrate(dt: number) {
    for (const b of this.bodies) {
      if (b.isStatic) continue;

      b.prevX = b.x;
      b.prevY = b.y;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Angular integration
      b.angle += b.angularVelocity * dt;
      b.angularVelocity *= 0.995; // slight rotational damping
    }
  }

  private resolveConstraints(dt: number) {
    for (const c of this.constraints) {
      const a = this.bodies.find(b => b.id === c.bodyAId);
      const b = this.bodies.find(body => body.id === c.bodyBId);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const delta = dist - c.length;

      const nx = dx / dist;
      const ny = dy / dist;

      if (c.type === 'spring') {
        // Hooke's Law: F = -k * x - damping * relative_velocity
        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const dampFactor = c.damping ?? 0.2;
        const relSpeed = relVx * nx + relVy * ny;

        const force = (c.stiffness * 800 * delta) + (dampFactor * 20 * relSpeed);

        if (!a.isStatic) {
          a.vx += (force * a.inverseMass * nx) * dt;
          a.vy += (force * a.inverseMass * ny) * dt;
        }
        if (!b.isStatic) {
          b.vx -= (force * b.inverseMass * nx) * dt;
          b.vy -= (force * b.inverseMass * ny) * dt;
        }
      } else if (c.type === 'rod' || (c.type === 'rope' && delta > 0)) {
        // Distance constraint positional correction
        const totalMass = a.inverseMass + b.inverseMass;
        if (totalMass === 0) continue;

        const correction = delta * c.stiffness;
        const massRatioA = a.inverseMass / totalMass;
        const massRatioB = b.inverseMass / totalMass;

        if (!a.isStatic) {
          a.x += nx * correction * massRatioA;
          a.y += ny * correction * massRatioA;
          // Damp velocity along constraint axis
          const vDotN = a.vx * nx + a.vy * ny;
          a.vx -= vDotN * nx * 0.2;
          a.vy -= vDotN * ny * 0.2;
        }
        if (!b.isStatic) {
          b.x -= nx * correction * massRatioB;
          b.y -= ny * correction * massRatioB;
          const vDotN = b.vx * nx + b.vy * ny;
          b.vx -= vDotN * nx * 0.2;
          b.vy -= vDotN * ny * 0.2;
        }
      }
    }
  }

  private resolveCollisions() {
    const count = this.bodies.length;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];

        if (a.isStatic && b.isStatic) continue;

        if (a.type === 'circle' && b.type === 'circle') {
          this.resolveCircleCircle(a, b);
        } else if (a.type === 'circle' && (b.type === 'box' || b.type === 'ramp')) {
          this.resolveCircleBox(a, b);
        } else if ((a.type === 'box' || a.type === 'ramp') && b.type === 'circle') {
          this.resolveCircleBox(b, a);
        } else if (a.type === 'box' && b.type === 'box') {
          this.resolveBoxBox(a, b);
        }
      }
    }
  }

  private resolveCircleCircle(a: PhysicsBody, b: PhysicsBody) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.radius + b.radius;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const penetration = minDist - dist;

      // Position separation
      const totalInvMass = a.inverseMass + b.inverseMass;
      if (totalInvMass === 0) return;

      const sepA = (a.inverseMass / totalInvMass) * penetration;
      const sepB = (b.inverseMass / totalInvMass) * penetration;

      if (!a.isStatic) {
        a.x -= nx * sepA;
        a.y -= ny * sepA;
      }
      if (!b.isStatic) {
        b.x += nx * sepB;
        b.y += ny * sepB;
      }

      // Impulse resolution (restitution & friction)
      const relVx = b.vx - a.vx;
      const relVy = b.vy - a.vy;
      const velAlongNormal = relVx * nx + relVy * ny;

      if (velAlongNormal > 0) return; // moving apart

      const restitution = Math.min(a.restitution, b.restitution);
      const impulseMag = -(1 + restitution) * velAlongNormal / totalInvMass;

      const impulseX = impulseMag * nx;
      const impulseY = impulseMag * ny;

      if (!a.isStatic) {
        a.vx -= impulseX * a.inverseMass;
        a.vy -= impulseY * a.inverseMass;
      }
      if (!b.isStatic) {
        b.vx += impulseX * b.inverseMass;
        b.vy += impulseY * b.inverseMass;
      }

      // Tangential friction
      const tangentX = -ny;
      const tangentY = nx;
      const velAlongTangent = relVx * tangentX + relVy * tangentY;
      const friction = Math.sqrt(a.friction * b.friction);
      const frictionImpulse = -velAlongTangent * friction / totalInvMass;

      if (!a.isStatic) {
        a.vx -= frictionImpulse * tangentX * a.inverseMass;
        a.vy -= frictionImpulse * tangentY * a.inverseMass;
      }
      if (!b.isStatic) {
        b.vx += frictionImpulse * tangentX * b.inverseMass;
        b.vy += frictionImpulse * tangentY * b.inverseMass;
      }
    }
  }

  private resolveCircleBox(c: PhysicsBody, b: PhysicsBody) {
    // Transform circle into box's local space if rotated
    const cos = Math.cos(-b.angle);
    const sin = Math.sin(-b.angle);

    const relX = c.x - b.x;
    const relY = c.y - b.y;

    const localX = cos * relX - sin * relY;
    const localY = sin * relX + cos * relY;

    const halfW = b.width / 2;
    const halfH = b.height / 2;

    // Closest point on box
    const clampedX = Math.max(-halfW, Math.min(halfW, localX));
    const clampedY = Math.max(-halfH, Math.min(halfH, localY));

    const diffX = localX - clampedX;
    const diffY = localY - clampedY;
    const distSq = diffX * diffX + diffY * diffY;

    if (distSq < c.radius * c.radius) {
      let normalX: number;
      let normalY: number;
      let penetration: number;

      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        normalX = diffX / dist;
        normalY = diffY / dist;
        penetration = c.radius - dist;
      } else {
        // Center is inside the box: push out along closest edge
        const distToRight = halfW - localX;
        const distToLeft = localX + halfW;
        const distToBottom = halfH - localY;
        const distToTop = localY + halfH;
        const minEdge = Math.min(distToRight, distToLeft, distToBottom, distToTop);

        if (minEdge === distToRight) { normalX = 1; normalY = 0; penetration = distToRight + c.radius; }
        else if (minEdge === distToLeft) { normalX = -1; normalY = 0; penetration = distToLeft + c.radius; }
        else if (minEdge === distToBottom) { normalX = 0; normalY = 1; penetration = distToBottom + c.radius; }
        else { normalX = 0; normalY = -1; penetration = distToTop + c.radius; }
      }

      // Convert normal back to world space
      const worldNormX = Math.cos(b.angle) * normalX - Math.sin(b.angle) * normalY;
      const worldNormY = Math.sin(b.angle) * normalX + Math.cos(b.angle) * normalY;

      // Position fix
      const totalInvMass = c.inverseMass + b.inverseMass;
      if (totalInvMass === 0) return;

      if (!c.isStatic) {
        c.x += worldNormX * penetration * (c.inverseMass / totalInvMass);
        c.y += worldNormY * penetration * (c.inverseMass / totalInvMass);
      }
      if (!b.isStatic) {
        b.x -= worldNormX * penetration * (b.inverseMass / totalInvMass);
        b.y -= worldNormY * penetration * (b.inverseMass / totalInvMass);
      }

      // Impulse
      const relVx = c.vx - b.vx;
      const relVy = c.vy - b.vy;
      const velAlongNormal = relVx * worldNormX + relVy * worldNormY;

      if (velAlongNormal < 0) {
        const restitution = Math.min(c.restitution, b.restitution);
        const impulseMag = -(1 + restitution) * velAlongNormal / totalInvMass;

        if (!c.isStatic) {
          c.vx += impulseMag * worldNormX * c.inverseMass;
          c.vy += impulseMag * worldNormY * c.inverseMass;
        }
        if (!b.isStatic) {
          b.vx -= impulseMag * worldNormX * b.inverseMass;
          b.vy -= impulseMag * worldNormY * b.inverseMass;
        }

        // Tangential friction
        const tangentX = -worldNormY;
        const tangentY = worldNormX;
        const velAlongTangent = relVx * tangentX + relVy * tangentY;
        const friction = Math.sqrt(c.friction * b.friction);
        const fImpulse = -velAlongTangent * friction / totalInvMass;

        if (!c.isStatic) {
          c.vx += fImpulse * tangentX * c.inverseMass;
          c.vy += fImpulse * tangentY * c.inverseMass;
        }
        if (!b.isStatic) {
          b.vx -= fImpulse * tangentX * b.inverseMass;
          b.vy -= fImpulse * tangentY * b.inverseMass;
        }
      }
    }
  }

  private resolveBoxBox(a: PhysicsBody, b: PhysicsBody) {
    // Axis-aligned bounding box collision (for dominon/stack blocks)
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const halfWA = a.width / 2;
    const halfHA = a.height / 2;
    const halfWB = b.width / 2;
    const halfHB = b.height / 2;

    const overlapX = (halfWA + halfWB) - Math.abs(dx);
    const overlapY = (halfHA + halfHB) - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
      let nx = 0;
      let ny = 0;
      let penetration = 0;

      if (overlapX < overlapY) {
        nx = dx > 0 ? 1 : -1;
        penetration = overlapX;
      } else {
        ny = dy > 0 ? 1 : -1;
        penetration = overlapY;
      }

      const totalInvMass = a.inverseMass + b.inverseMass;
      if (totalInvMass === 0) return;

      if (!a.isStatic) {
        a.x -= nx * penetration * (a.inverseMass / totalInvMass);
        a.y -= ny * penetration * (a.inverseMass / totalInvMass);
      }
      if (!b.isStatic) {
        b.x += nx * penetration * (b.inverseMass / totalInvMass);
        b.y += ny * penetration * (b.inverseMass / totalInvMass);
      }

      const relVx = b.vx - a.vx;
      const relVy = b.vy - a.vy;
      const velAlongNormal = relVx * nx + relVy * ny;

      if (velAlongNormal < 0) {
        const restitution = Math.min(a.restitution, b.restitution);
        const impulseMag = -(1 + restitution) * velAlongNormal / totalInvMass;

        if (!a.isStatic) {
          a.vx -= impulseMag * nx * a.inverseMass;
          a.vy -= impulseMag * ny * a.inverseMass;
        }
        if (!b.isStatic) {
          b.vx += impulseMag * nx * b.inverseMass;
          b.vy += impulseMag * ny * b.inverseMass;
        }
      }
    }
  }

  private handleBoundaries() {
    for (const b of this.bodies) {
      if (b.isStatic) continue;

      const r = b.type === 'circle' ? b.radius : Math.max(b.width, b.height) / 2;

      // Floor
      if (b.y + r > this.bounds.height) {
        b.y = this.bounds.height - r;
        if (b.vy > 0) {
          b.vy = -b.vy * b.restitution;
          b.vx *= (1 - b.friction * 0.1);
          if (Math.abs(b.vy) < 15) b.vy = 0;
        }
      }

      // Ceiling
      if (b.y - r < 0) {
        b.y = r;
        if (b.vy < 0) {
          b.vy = -b.vy * b.restitution;
        }
      }

      // Left Wall
      if (b.x - r < 0) {
        b.x = r;
        if (b.vx < 0) {
          b.vx = -b.vx * b.restitution;
        }
      }

      // Right Wall
      if (b.x + r > this.bounds.width) {
        b.x = this.bounds.width - r;
        if (b.vx > 0) {
          b.vx = -b.vx * b.restitution;
        }
      }
    }
  }

  private updateMetrics() {
    for (const b of this.bodies) {
      if (!b.trail) b.trail = [];
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 5 && !b.isStatic) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 50) {
          b.trail.shift();
        }
      }
    }
  }

  // Calculate live mechanical energy in the system
  calculateEnergy(): { kinetic: number; potential: number; total: number } {
    let kinetic = 0;
    let potential = 0;

    for (const b of this.bodies) {
      if (b.isStatic) continue;
      const speed = Math.hypot(b.vx, b.vy);
      const k = 0.5 * b.mass * (speed * speed) / 1000;
      // Potential energy relative to floor: Ep = m * g * h
      const h = Math.max(0, this.bounds.height - b.y);
      const p = (b.mass * (this.gravity.y / 100) * h) / 1000;

      kinetic += k;
      potential += p;
    }

    return {
      kinetic: Math.round(kinetic * 10) / 10,
      potential: Math.round(potential * 10) / 10,
      total: Math.round((kinetic + potential) * 10) / 10,
    };
  }
}
