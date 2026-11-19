import * as THREE from 'three';

export interface LabMaterials {
  floorMetal: THREE.MeshStandardMaterial;
  wallPanel: THREE.MeshStandardMaterial;
  ceilingDark: THREE.MeshStandardMaterial;
  darkTrim: THREE.MeshStandardMaterial;
  glassWall: THREE.MeshPhysicalMaterial;
  neonCyan: THREE.MeshStandardMaterial;
  neonPurple: THREE.MeshStandardMaterial;
  neonBlue: THREE.MeshStandardMaterial;
  neonEmerald: THREE.MeshStandardMaterial;
  neonAmber: THREE.MeshStandardMaterial;
  neonRed: THREE.MeshStandardMaterial;
  iceSurface: THREE.MeshStandardMaterial;
  steelSurface: THREE.MeshStandardMaterial;
  rubberSurface: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  materials: THREE.Material[];
}

function createFloorGridTexture(accentHex: string, maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0e1726';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle brushed metal plate tiles
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  for (let x = 0; x <= 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Fine calibration grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Corner bolt accents & glowing seam
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.35;
  for (let x = 0; x < 512; x += 128) {
    for (let y = 0; y < 512; y += 128) {
      ctx.fillRect(x + 6, y + 6, 4, 4);
      ctx.fillRect(x + 118, y + 118, 4, 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = maxAniso;
  return tex;
}

function createWallPanelTexture(accentHex: string, maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 512, 512);

  // Recessed sci-fi wall panels
  ctx.fillStyle = '#162033';
  ctx.fillRect(16, 20, 224, 220);
  ctx.fillRect(272, 20, 224, 220);
  ctx.fillRect(16, 272, 224, 220);
  ctx.fillRect(272, 272, 224, 220);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 20, 224, 220);
  ctx.strokeRect(272, 20, 224, 220);
  ctx.strokeRect(16, 272, 224, 220);
  ctx.strokeRect(272, 272, 224, 220);

  // Accent horizontal light seam
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 252, 512, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.anisotropy = maxAniso;
  return tex;
}

function createTrackTexture(baseColor: string, stripeColor: string, label: string, maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 6;
  for (let x = 24; x < 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x + 28, 128);
    ctx.lineTo(x, 236);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 28px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 256, 138);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createHologramTexture(
  title: string,
  subtitle: string,
  formula: string,
  accentHex = '#38bdf8',
  maxAniso = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#07101f';
  ctx.fillRect(0, 0, 768, 384);

  // Subtle holographic scanlines
  ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
  for (let y = 0; y < 384; y += 8) {
    ctx.fillRect(0, y, 768, 2);
  }

  // Border frame
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 748, 364);

  // Header strip
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(14, 14, 740, 62);
  ctx.globalAlpha = 1;

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 30px Orbitron, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title.toUpperCase(), 36, 56);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '500 24px Outfit, sans-serif';
  wrapText(ctx, subtitle, 36, 128, 696, 34);

  // Formula box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(36, 250, 696, 94);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 250, 696, 94);

  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 30px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(formula, 384, 308);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  let line = '';
  let currY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currY);
      line = words[n] + ' ';
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currY);
}

export function createLabMaterials(
  renderer: THREE.WebGLRenderer,
  accentHex: string,
  isSoftwareGl: boolean,
): LabMaterials {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const floorTex = createFloorGridTexture(accentHex, maxAniso);
  const wallTex = createWallPanelTexture(accentHex, maxAniso);
  const iceTex = createTrackTexture('#0c4a6e', '#7dd3fc', 'ICE  μ = 0.04', maxAniso);
  const steelTex = createTrackTexture('#334155', '#94a3b8', 'STEEL  μ = 0.25', maxAniso);
  const rubberTex = createTrackTexture('#3f1d2b', '#fb7185', 'RUBBER  μ = 0.65', maxAniso);
  textures.push(floorTex, wallTex, iceTex, steelTex, rubberTex);

  const floorMetal = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.35,
    metalness: 0.65,
  });

  const wallPanel = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.55,
    metalness: 0.45,
  });

  const ceilingDark = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    roughness: 0.75,
    metalness: 0.3,
  });

  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.85,
  });

  const glassWall = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    roughness: 0.08,
    metalness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.78,
    transparent: true,
    opacity: isSoftwareGl ? 0.32 : 1,
    ior: 1.5,
    thickness: 0.4,
    depthWrite: false,
  });

  const makeNeon = (hex: number) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: 1.6,
      roughness: 0.25,
      metalness: 0.2,
    });

  const neonCyan = makeNeon(0x06b6d4);
  const neonPurple = makeNeon(0xa855f7);
  const neonBlue = makeNeon(0x3b82f6);
  const neonEmerald = makeNeon(0x10b981);
  const neonAmber = makeNeon(0xf59e0b);
  const neonRed = makeNeon(0xef4444);

  const iceSurface = new THREE.MeshStandardMaterial({
    map: iceTex,
    roughness: 0.08,
    metalness: 0.15,
  });
  const steelSurface = new THREE.MeshStandardMaterial({
    map: steelTex,
    roughness: 0.35,
    metalness: 0.8,
  });
  const rubberSurface = new THREE.MeshStandardMaterial({
    map: rubberTex,
    roughness: 0.9,
    metalness: 0.05,
  });

  materials.push(
    floorMetal,
    wallPanel,
    ceilingDark,
    darkTrim,
    glassWall,
    neonCyan,
    neonPurple,
    neonBlue,
    neonEmerald,
    neonAmber,
    neonRed,
    iceSurface,
    steelSurface,
    rubberSurface,
  );

  return {
    floorMetal,
    wallPanel,
    ceilingDark,
    darkTrim,
    glassWall,
    neonCyan,
    neonPurple,
    neonBlue,
    neonEmerald,
    neonAmber,
    neonRed,
    iceSurface,
    steelSurface,
    rubberSurface,
    textures,
    materials,
  };
}
