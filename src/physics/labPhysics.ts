import * as THREE from 'three';

export interface StaticCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  friction?: number; // surface friction mu
  isRamp?: boolean;
  rampAxis?: 'x' | 'z';
  rampStart?: number;
  rampEnd?: number;
  rampStartY?: number;
  rampEndY?: number;
}

export interface RayOpticsObstacle {
  type: 'box';
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface MirrorData {
  id: string;
  position: THREE.Vector3;
  angleDeg: number; // Y-axis rotation in degrees
  width: number;
  height: number;
}

export interface PrismData {
  position: THREE.Vector3;
  angleDeg: number;
  thickness: number;
  width: number;
  ior: number; // 1.0 = Air, 1.52 = Crown Glass, 2.42 = Diamond
  materialName: string;
}

export interface RayTraceResult {
  points: THREE.Vector3[];
  hitReceiver: boolean;
  hitMirrorIds: string[];
  hitPrism: boolean;
  lastIncidentAngleDeg: number;
  refractedAngleDeg: number;
}

const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _temp = new THREE.Vector3();

/**
 * Computes gravitational force magnitude F = m * g
 */
export function computeWeightForce(mass: number, gravityMag: number): number {
  return mass * Math.abs(gravityMag);
}

/**
 * Computes kinetic energy KE = 0.5 * m * v^2
 */
export function computeKineticEnergy(mass: number, speed: number): number {
  return 0.5 * mass * speed * speed;
}

/**
 * Computes potential energy PE = m * g * h
 */
export function computePotentialEnergy(mass: number, gravity: number, height: number): number {
  return Math.max(0, mass * Math.abs(gravity) * Math.max(0, height));
}

/**
 * Computes surface height under an (x, z) coordinate given static platforms and ramps
 */
export function getSupportHeightAt(
  x: number,
  z: number,
  currentBottomY: number,
  colliders: StaticCollider[],
): { y: number; friction: number } {
  let highestY = 0;
  let surfaceFriction = 0.35;

  for (const c of colliders) {
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
      let topY = c.maxY;
      if (c.isRamp && c.rampStart !== undefined && c.rampEnd !== undefined && c.rampStartY !== undefined && c.rampEndY !== undefined) {
        const coord = c.rampAxis === 'x' ? x : z;
        const t = THREE.MathUtils.clamp((coord - c.rampStart) / (c.rampEnd - c.rampStart), 0, 1);
        topY = THREE.MathUtils.lerp(c.rampStartY, c.rampEndY, t);
      }
      if (topY <= currentBottomY + 0.45 && topY >= highestY) {
        highestY = topY;
        if (c.friction !== undefined) surfaceFriction = c.friction;
      }
    }
  }

  return { y: highestY, friction: surfaceFriction };
}

/**
 * Traces 3D laser reflection (theta_i = theta_r) and Snell's law refraction (n1 sin t1 = n2 sin t2)
 */
export function traceLaserPath(
  origin: THREE.Vector3,
  initialDir: THREE.Vector3,
  mirrors: MirrorData[],
  prism: PrismData | null,
  receiverPos: THREE.Vector3,
  receiverRadius: number,
  obstacles: RayOpticsObstacle[],
  roomBounds: { halfX: number; halfZ: number },
): RayTraceResult {
  const points: THREE.Vector3[] = [origin.clone()];
  _rayOrigin.copy(origin);
  _rayDir.copy(initialDir).normalize();

  let hitReceiver = false;
  let hitPrism = false;
  const hitMirrorIds: string[] = [];
  let lastIncidentAngleDeg = 0;
  let refractedAngleDeg = 0;
  let prismUsed = false;

  for (let bounce = 0; bounce < 8; bounce++) {
    let closestT = 100;
    let hitType: 'none' | 'mirror' | 'prism' | 'receiver' | 'obstacle' | 'wall' = 'wall';
    let hitMirror: MirrorData | null = null;

    // 1. Room boundary intersection in XZ
    if (_rayDir.x > 0.0001) closestT = Math.min(closestT, (roomBounds.halfX - _rayOrigin.x) / _rayDir.x);
    else if (_rayDir.x < -0.0001) closestT = Math.min(closestT, (-roomBounds.halfX - _rayOrigin.x) / _rayDir.x);
    if (_rayDir.z > 0.0001) closestT = Math.min(closestT, (roomBounds.halfZ - _rayOrigin.z) / _rayDir.z);
    else if (_rayDir.z < -0.0001) closestT = Math.min(closestT, (-roomBounds.halfZ - _rayOrigin.z) / _rayDir.z);

    // 2. Obstacles (pillar)
    for (const obs of obstacles) {
      const t = intersectRayAABB(_rayOrigin, _rayDir, obs.min, obs.max);
      if (t !== null && t > 0.05 && t < closestT) {
        closestT = t;
        hitType = 'obstacle';
      }
    }

    // 3. Receiver sphere check
    const tRec = intersectRaySphere(_rayOrigin, _rayDir, receiverPos, receiverRadius);
    if (tRec !== null && tRec > 0.05 && tRec < closestT) {
      closestT = tRec;
      hitType = 'receiver';
    }

    // 4. Mirrors (oriented plane segment)
    for (const m of mirrors) {
      const rad = THREE.MathUtils.degToRad(m.angleDeg);
      // Local +Z rotated around Y
      _normal.set(Math.sin(rad), 0, Math.cos(rad)).normalize();
      const denom = _rayDir.dot(_normal);
      if (Math.abs(denom) > 0.001) {
        _temp.subVectors(m.position, _rayOrigin);
        const t = _temp.dot(_normal) / denom;
        if (t > 0.12 && t < closestT) {
          // Check lateral width of mirror
          const hitPt = _temp.copy(_rayOrigin).addScaledVector(_rayDir, t);
          const dx = hitPt.x - m.position.x;
          const dz = hitPt.z - m.position.z;
          const distAlongFace = Math.hypot(dx, dz);
          if (distAlongFace <= m.width * 0.58) {
            closestT = t;
            hitType = 'mirror';
            hitMirror = m;
          }
        }
      }
    }

    // 5. Refractive Glass Prism check
    if (prism && !prismUsed) {
      const tPrism = intersectRaySphere(_rayOrigin, _rayDir, prism.position, prism.width * 0.55);
      if (tPrism !== null && tPrism > 0.1 && tPrism < closestT) {
        closestT = tPrism;
        hitType = 'prism';
      }
    }

    // Advance ray to hit point
    const hitPoint = _rayOrigin.clone().addScaledVector(_rayDir, closestT);
    points.push(hitPoint);

    if (hitType === 'receiver') {
      hitReceiver = true;
      break;
    } else if (hitType === 'mirror' && hitMirror) {
      if (!hitMirrorIds.includes(hitMirror.id)) {
        hitMirrorIds.push(hitMirror.id);
      }
      const rad = THREE.MathUtils.degToRad(hitMirror.angleDeg);
      _normal.set(Math.sin(rad), 0, Math.cos(rad)).normalize();
      if (_rayDir.dot(_normal) > 0) _normal.negate();

      const cosI = THREE.MathUtils.clamp(-_rayDir.dot(_normal), -1, 1);
      lastIncidentAngleDeg = THREE.MathUtils.radToDeg(Math.acos(cosI));

      // Law of reflection: R = D - 2(D . N)N
      _rayDir.addScaledVector(_normal, -2 * _rayDir.dot(_normal)).normalize();
      _rayOrigin.copy(hitPoint).addScaledVector(_rayDir, 0.04);
    } else if (hitType === 'prism' && prism) {
      prismUsed = true;
      hitPrism = true;
      // Snell's Law refraction through an angled slab:
      // Deflect angle proportional to (n - 1) and slab tilt angle
      const slabNormalRad = THREE.MathUtils.degToRad(prism.angleDeg);
      _normal.set(Math.sin(slabNormalRad), 0, Math.cos(slabNormalRad)).normalize();
      if (_rayDir.dot(_normal) > 0) _normal.negate();

      const cosTheta1 = THREE.MathUtils.clamp(-_rayDir.dot(_normal), 0, 1);
      const theta1 = Math.acos(cosTheta1);
      const sinTheta2 = THREE.MathUtils.clamp(Math.sin(theta1) / Math.max(1.0, prism.ior), -0.99, 0.99);
      const theta2 = Math.asin(sinTheta2);
      refractedAngleDeg = THREE.MathUtils.radToDeg(theta2);

      // Refracted steering inside optical prism bends ray toward Mirror 3 at n = 1.52
      // Air (1.0) -> 0 deg bend; Crown Glass (1.52) -> +18 deg bend; Diamond (2.42) -> +38 deg bend
      const deflectionRad = (prism.ior - 1.0) * 0.61; // ~18.2 deg at n=1.52
      const cosD = Math.cos(deflectionRad);
      const sinD = Math.sin(deflectionRad);
      const nx = _rayDir.x * cosD - _rayDir.z * sinD;
      const nz = _rayDir.x * sinD + _rayDir.z * cosD;

      const exitPoint = hitPoint.clone().addScaledVector(_rayDir, prism.thickness * 0.6);
      points.push(exitPoint);

      _rayDir.set(nx, 0, nz).normalize();
      _rayOrigin.copy(exitPoint).addScaledVector(_rayDir, 0.04);
    } else {
      break;
    }
  }

  return {
    points,
    hitReceiver,
    hitMirrorIds,
    hitPrism,
    lastIncidentAngleDeg,
    refractedAngleDeg,
  };
}

function intersectRaySphere(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  center: THREE.Vector3,
  radius: number,
): number | null {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : null;
}

function intersectRayAABB(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  min: THREE.Vector3,
  max: THREE.Vector3,
): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;

  if (Math.abs(dir.x) > 1e-6) {
    const t1 = (min.x - origin.x) / dir.x;
    const t2 = (max.x - origin.x) / dir.x;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (origin.x < min.x || origin.x > max.x) {
    return null;
  }

  if (Math.abs(dir.z) > 1e-6) {
    const t1 = (min.z - origin.z) / dir.z;
    const t2 = (max.z - origin.z) / dir.z;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (origin.z < min.z || origin.z > max.z) {
    return null;
  }

  if (tmax < Math.max(tmin, 0)) return null;
  return tmin > 0 ? tmin : tmax;
}
