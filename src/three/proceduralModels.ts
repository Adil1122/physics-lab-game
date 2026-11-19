import * as THREE from 'three';
import { createHologramTexture, LabMaterials } from './materials';

export interface ExitDoorHandle {
  group: THREE.Group;
  leftLeaf: THREE.Mesh;
  rightLeaf: THREE.Mesh;
  statusLightMat: THREE.MeshStandardMaterial;
  portalMesh: THREE.Mesh;
  openProgress: number;
}

export function buildFuturisticExitDoor(mats: LabMaterials): ExitDoorHandle {
  const group = new THREE.Group();

  // Outer armored arch (left pillar, right pillar, header lintel)
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 0.55), mats.darkTrim);
  leftPillar.position.set(-1.35, 1.8, 0);
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 0.55), mats.darkTrim);
  rightPillar.position.set(1.35, 1.8, 0);
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;

  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 0.65), mats.darkTrim);
  topHeader.position.set(0, 3.65, 0);
  topHeader.castShadow = true;

  // Threshold sill
  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.6), mats.steelSurface);
  sill.position.set(0, 0.04, 0);

  // Twin sliding armored blast leaves
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.28,
    metalness: 0.85,
  });
  const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.12, 3.3, 0.22), leafMat);
  leftLeaf.position.set(-0.56, 1.68, 0);
  leftLeaf.castShadow = true;

  const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.12, 3.3, 0.22), leafMat);
  rightLeaf.position.set(0.56, 1.68, 0);
  rightLeaf.castShadow = true;

  // Status beacon bar above door (Red when locked -> Emerald when unlocked)
  const statusLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.2,
  });
  const statusBar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.14), statusLightMat);
  statusBar.position.set(0, 3.65, 0.32);

  // Side accent strips
  const leftStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.1, 0.1), statusLightMat);
  leftStrip.position.set(-1.12, 1.68, 0.27);
  const rightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.1, 0.1), statusLightMat);
  rightStrip.position.set(1.12, 1.68, 0.27);

  // Glowing exit energy portal behind the leaves
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const portalMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.3), portalMat);
  portalMesh.position.set(0, 1.68, -0.18);

  group.add(
    leftPillar,
    rightPillar,
    topHeader,
    sill,
    leftLeaf,
    rightLeaf,
    statusBar,
    leftStrip,
    rightStrip,
    portalMesh,
  );

  return {
    group,
    leftLeaf,
    rightLeaf,
    statusLightMat,
    portalMesh,
    openProgress: 0,
  };
}

export function buildConsolePedestal(
  mats: LabMaterials,
  screenColor: number,
  screenText: string,
): { group: THREE.Group; screenMesh: THREE.Mesh; screenMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.14, 8), mats.darkTrim);
  base.position.y = 0.07;
  base.castShadow = true;
  base.receiveShadow = true;

  const column = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.05, 0.26), mats.steelSurface);
  column.position.y = 0.65;
  column.castShadow = true;

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.36), mats.neonCyan);
  collar.position.y = 0.2;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.54, 0.14), mats.darkTrim);
  head.position.set(0, 1.28, 0.05);
  head.rotation.x = -0.45;
  head.castShadow = true;

  const screenMat = new THREE.MeshStandardMaterial({
    color: screenColor,
    emissive: screenColor,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.1,
  });

  // Draw crisp label texture on console screen
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#09111f';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#' + screenColor.toString(16).padStart(6, '0');
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 300);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  const lines = screenText.split('\n');
  lines.forEach((ln, idx) => {
    ctx.fillText(ln, 256, 130 + idx * 48);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  screenMat.map = tex;
  screenMat.emissiveMap = tex;

  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.44), screenMat);
  screenMesh.position.set(0, 1.31, 0.11);
  screenMesh.rotation.x = -0.45;

  group.add(base, column, collar, head, screenMesh);
  return { group, screenMesh, screenMat };
}

export function updateConsoleScreenText(
  screenMat: THREE.MeshStandardMaterial,
  accentHex: string,
  lines: string[],
) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#08101d';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 300);
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 30px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  lines.forEach((ln, idx) => {
    ctx.fillStyle = idx === 0 ? accentHex : '#e2e8f0';
    ctx.font = idx === 0 ? 'bold 28px Orbitron, sans-serif' : 'bold 32px "JetBrains Mono", monospace';
    ctx.fillText(ln, 256, 98 + idx * 54);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  screenMat.map?.dispose();
  screenMat.map = tex;
  screenMat.emissiveMap = tex;
  screenMat.needsUpdate = true;
}

export function buildPressurePad(
  mats: LabMaterials,
  size = 1.6,
): { group: THREE.Group; coreMat: THREE.MeshStandardMaterial; coreMesh: THREE.Mesh } {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(size + 0.3, 0.1, size + 0.3), mats.darkTrim);
  frame.position.y = 0.05;
  frame.receiveShadow = true;

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.1,
    roughness: 0.3,
    metalness: 0.4,
  });

  const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.14, size), coreMat);
  coreMesh.position.y = 0.08;
  coreMesh.receiveShadow = true;

  // 4 corner bumper posts
  const offset = size * 0.52;
  [
    [-offset, -offset],
    [offset, -offset],
    [-offset, offset],
    [offset, offset],
  ].forEach(([cx, cz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8), mats.steelSurface);
    post.position.set(cx, 0.11, cz);
    group.add(post);
  });

  group.add(frame, coreMesh);
  return { group, coreMat, coreMesh };
}

export function buildMirrorPedestal(mats: LabMaterials): {
  group: THREE.Group;
  headPivot: THREE.Group;
  mirrorGlass: THREE.Mesh;
} {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.16, 16), mats.darkTrim);
  base.position.y = 0.08;
  base.castShadow = true;
  base.receiveShadow = true;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.05, 12), mats.steelSurface);
  stem.position.y = 0.68;
  stem.castShadow = true;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 8, 24), mats.neonPurple);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.18;

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.45, 0);

  // Mirror backing housing
  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.12), mats.darkTrim);
  housing.castShadow = true;

  // Reflective mirror face (normal points +Z in local space)
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    metalness: 0.98,
    roughness: 0.04,
  });
  const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.78, 0.04), mirrorMat);
  mirrorGlass.position.z = 0.065;

  // Top alignment notch
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), mats.neonCyan);
  pointer.rotation.x = Math.PI / 2;
  pointer.position.set(0, 0.52, 0.1);

  headPivot.add(housing, mirrorGlass, pointer);
  group.add(base, stem, ring, headPivot);

  return { group, headPivot, mirrorGlass };
}

export function buildLaserEmitter(mats: LabMaterials): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.2, 8), mats.darkTrim);
  base.position.y = 0.1;
  base.castShadow = true;

  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.25, 0.35), mats.steelSurface);
  pylon.position.y = 0.8;
  pylon.castShadow = true;

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 16), mats.darkTrim);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 1.45, 0.15);
  barrel.castShadow = true;

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), mats.neonCyan);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.45, 0.58);

  const fin1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.5), mats.neonBlue);
  fin1.position.set(0, 1.45, 0.1);
  const fin2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.5), mats.neonBlue);
  fin2.position.set(0, 1.45, 0.1);

  group.add(base, pylon, barrel, lens, fin1, fin2);
  return group;
}

export function buildElectromagnetCoil(
  mats: LabMaterials,
  polarity: 'N' | 'S',
): { group: THREE.Group; capMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.1), mats.darkTrim);
  base.position.y = 0.125;
  base.castShadow = true;

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 16), mats.steelSurface);
  core.position.y = 0.85;
  core.castShadow = true;

  // Copper/gold induction windings
  const coilMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.88,
    roughness: 0.22,
  });
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.065, 10, 24), coilMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.45 + i * 0.19;
    group.add(ring);
  }

  const capColor = polarity === 'N' ? 0xef4444 : 0x3b82f6;
  const capMat = new THREE.MeshStandardMaterial({
    color: capColor,
    emissive: capColor,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.4,
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 16), capMat);
  cap.position.y = 1.48;

  group.add(base, core, cap);
  return { group, capMat };
}

export function buildEnergyGenerator(mats: LabMaterials): {
  group: THREE.Group;
  rotor: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 2.2), mats.darkTrim);
  plinth.position.y = 0.2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 1.8, 16), mats.steelSurface);
  housing.rotation.z = Math.PI / 2;
  housing.position.set(0, 1.35, 0);
  housing.castShadow = true;

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.6,
  });
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.08, 12, 32), ringMat);
  glowRing.rotation.y = Math.PI / 2;
  glowRing.position.set(-0.6, 1.35, 0);

  const rotor = new THREE.Group();
  rotor.position.set(-0.95, 1.35, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.24, 12), mats.darkTrim);
  hub.rotation.z = Math.PI / 2;
  rotor.add(hub);

  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.22), mats.neonCyan);
    const angle = (i * Math.PI) / 3;
    blade.position.set(0, Math.cos(angle) * 0.55, Math.sin(angle) * 0.55);
    blade.rotation.x = angle;
    rotor.add(blade);
  }

  // Impact collector funnel on top/side
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.35, 0.55, 16), mats.darkTrim);
  funnel.rotation.z = Math.PI / 4;
  funnel.position.set(-1.15, 1.85, 0);

  group.add(plinth, housing, glowRing, rotor, funnel);
  return { group, rotor, ringMat };
}

export function buildHologramBoard(
  title: string,
  subtitle: string,
  formula: string,
  accentHex: string,
  maxAniso = 4,
): THREE.Group {
  const group = new THREE.Group();

  const tex = createHologramTexture(title, subtitle, formula, accentHex, maxAniso);
  const panelMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  });

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.9), panelMat);
  panel.position.y = 2.4;

  // Twin slim hologram projector pylons
  const standMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
  });
  const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.4, 8), standMat);
  leftPost.position.set(-1.6, 0.7, 0);
  const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.4, 8), standMat);
  rightPost.position.set(1.6, 0.7, 0);

  group.add(panel, leftPost, rightPost);
  return group;
}
