import * as THREE from 'three';
import {
  DynamicBody,
  InteractiveTarget,
  LiveTelemetry,
  RoomId,
} from '../types/game';
import { ROOMS_DATA } from '../data/roomsData';
import { soundEngine } from '../audio/soundEngine';
import {
  computeKineticEnergy,
  computePotentialEnergy,
  computeWeightForce,
  getSupportHeightAt,
  MirrorData,
  PrismData,
  RayOpticsObstacle,
  StaticCollider,
  traceLaserPath,
} from '../physics/labPhysics';
import { createLabMaterials, LabMaterials } from './materials';
import {
  buildConsolePedestal,
  buildElectromagnetCoil,
  buildEnergyGenerator,
  buildFuturisticExitDoor,
  buildHologramBoard,
  buildLaserEmitter,
  buildMirrorPedestal,
  buildPressurePad,
  ExitDoorHandle,
  updateConsoleScreenText,
} from './proceduralModels';

interface ParticleBurst {
  points: THREE.Points;
  velocities: Float32Array;
  age: number;
  maxAge: number;
}

export interface RoomRuntimeCallbacks {
  onDoorUnlocked: () => void;
  onRoomExited: () => void;
  onPuzzleStepScore: (points: number) => void;
  onTelemetry: (telemetry: LiveTelemetry) => void;
}

export class RoomController {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private callbacks: RoomRuntimeCallbacks;

  private roomGroup = new THREE.Group();
  private mats: LabMaterials | null = null;
  private disposables: { dispose: () => void }[] = [];

  public currentRoomId: RoomId | 'menu' = 'menu';
  public colliders: StaticCollider[] = [];
  public dynamicBodies: DynamicBody[] = [];
  public interactives: InteractiveTarget[] = [];
  public doorHandle: ExitDoorHandle | null = null;
  public doorUnlocked = false;
  public doorPos = new THREE.Vector3(0, 0, -9.8);
  public roomBounds = { halfX: 9.4, halfZ: 9.4, height: 7.2 };

  // Player physics state
  public playerPos = new THREE.Vector3(0, 1.7, 7.2);
  public playerVel = new THREE.Vector3();
  public playerGrounded = true;
  public playerYaw = 0;
  public playerPitch = 0;
  public carriedBody: DynamicBody | null = null;

  // Escape cutscene state (Room 5)
  public escaping = false;
  private escapeTimer = 0;
  private hasExited = false;

  // Visual effects
  private particles: ParticleBurst[] = [];
  private animatedMeshes: ((t: number, dt: number) => void)[] = [];
  private scoredMilestones = new Set<string>();

  // Room-specific states
  // Room 1
  private r1Gravity = -9.8;
  private r1GravityModeIndex = 0; // 0: Earth -9.8, 1: Moon -1.6, 2: High-G -19.6, 3: Invert +9.8
  private r1Lock1 = false;
  private r1Lock2 = false;
  private r1PlatePad: { coreMat: THREE.MeshStandardMaterial } | null = null;
  private r1CeilingMat: THREE.MeshStandardMaterial | null = null;
  private r1ConsoleMat: THREE.MeshStandardMaterial | null = null;

  // Room 2
  private r2ForceLevelIndex = 0; // 0: 60N, 1: 180N, 2: 360N
  private r2PadA = false;
  private r2PadB = false;
  private r2PadAMat: THREE.MeshStandardMaterial | null = null;
  private r2PadBMat: THREE.MeshStandardMaterial | null = null;
  private r2ConsoleMat: THREE.MeshStandardMaterial | null = null;
  private r2ForceArrow: THREE.Group | null = null;
  private r2ForceArrowTimer = 0;
  private r2LastAccelText = 'Select Force & push crates';

  // Room 3
  private r3Mirrors: {
    data: MirrorData;
    headPivot: THREE.Group;
  }[] = [];
  private r3Prism: PrismData | null = null;
  private r3PrismIndex = 0; // 0: Air 1.0, 1: Crown Glass 1.52, 2: Diamond 2.42
  private r3PrismMesh: THREE.Mesh | null = null;
  private r3PrismConsoleMat: THREE.MeshStandardMaterial | null = null;
  private r3ReceiverMat: THREE.MeshStandardMaterial | null = null;
  private r3ReceiverPos = new THREE.Vector3(-1.83, 1.45, -8.96);
  private r3BeamGroup = new THREE.Group();
  private r3Obstacles: RayOpticsObstacle[] = [];
  private r3Solved = false;
  private r3Status = 'Align mirrors & glass prism to hit Receiver';

  // Room 4
  private r4CoilOn = false;
  private r4CoilMat: THREE.MeshStandardMaterial | null = null;
  private r4CoilConsoleMat: THREE.MeshStandardMaterial | null = null;
  private r4CubePolarity: 'N' | 'S' = 'N';
  private r4CubeMesh: THREE.Group | null = null;
  private r4Lock1 = false;
  private r4Lock2 = false;
  private r4Pad1Mat: THREE.MeshStandardMaterial | null = null;
  private r4Pad2Mat: THREE.MeshStandardMaterial | null = null;
  private r4FieldLinesGroup = new THREE.Group();

  // Room 5
  private r5DropHeightIndex = 0; // 0: 2m, 1: 5m, 2: 8m
  private r5Ramp1Aligned = false;
  private r5Ramp2Aligned = false;
  private r5Ramp1Mesh: THREE.Mesh | null = null;
  private r5Ramp2Mesh: THREE.Mesh | null = null;
  private r5Ramp1LeverMat: THREE.MeshStandardMaterial | null = null;
  private r5Ramp2LeverMat: THREE.MeshStandardMaterial | null = null;
  private r5TowerConsoleMat: THREE.MeshStandardMaterial | null = null;
  private r5BallMesh: THREE.Mesh | null = null;
  private r5BallActive = false;
  private r5BallS = 0; // parametric progress 0..1 along track
  private r5BallSpeed = 0;
  private r5TotalEnergy = 0;
  private r5CurrentPE = 0;
  private r5CurrentKE = 0;
  private r5Generator: { rotor: THREE.Group; ringMat: THREE.MeshStandardMaterial } | null = null;
  private r5GeneratorSpin = 0.4;
  private r5StatusMsg = 'Align Ramps 1 & 2, set Drop Height, then Launch!';

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    isSoftwareGl: boolean,
    callbacks: RoomRuntimeCallbacks,
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.callbacks = callbacks;
    this.scene.add(this.roomGroup);
  }

  public disposeCurrentRoom() {
    this.scene.remove(this.roomGroup);
    this.roomGroup.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];

    if (this.mats) {
      this.mats.textures.forEach((t) => t.dispose());
      this.mats.materials.forEach((m) => m.dispose());
      this.mats = null;
    }

    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    this.colliders = [];
    this.dynamicBodies = [];
    this.interactives = [];
    this.particles = [];
    this.animatedMeshes = [];
    this.scoredMilestones.clear();
    this.doorHandle = null;
    this.doorUnlocked = false;
    this.carriedBody = null;
    this.escaping = false;
    this.escapeTimer = 0;
    this.hasExited = false;
  }

  public loadMenuBackdrop() {
    this.disposeCurrentRoom();
    this.currentRoomId = 'menu';

    const mats = createLabMaterials(this.renderer, '#38bdf8', this.isSoftwareGl);
    this.mats = mats;

    this.scene.background = new THREE.Color(0x050914);
    this.scene.fog = new THREE.FogExp2(0x050914, 0.032);

    this.buildShell(22, 22, 8.5, mats, 0x38bdf8);

    // Central animated futuristic quantum-gravity gyroscope core
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 2.4, 0);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.06, 16, 48), mats.neonCyan);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.05, 16, 48), mats.neonPurple);
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 16, 48), mats.neonBlue);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), mats.neonCyan);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 0.5, 16), mats.darkTrim);
    pedestal.position.y = -2.15;

    coreGroup.add(ring1, ring2, ring3, orb, pedestal);
    this.roomGroup.add(coreGroup);

    const door = buildFuturisticExitDoor(mats);
    door.group.position.set(0, 0, -10.7);
    this.roomGroup.add(door.group);

    this.animatedMeshes.push((t) => {
      ring1.rotation.x = t * 0.55;
      ring1.rotation.y = t * 0.35;
      ring2.rotation.y = -t * 0.7;
      ring2.rotation.z = t * 0.4;
      ring3.rotation.x = -t * 0.9;
      orb.rotation.y = t * 0.8;
      orb.position.y = Math.sin(t * 1.8) * 0.12;
    });
  }

  public loadRoom(roomId: RoomId) {
    this.disposeCurrentRoom();
    this.currentRoomId = roomId;

    const info = ROOMS_DATA[roomId];
    const accentNum = parseInt(info.accentColor.replace('#', ''), 16);
    const mats = createLabMaterials(this.renderer, info.accentColor, this.isSoftwareGl);
    this.mats = mats;

    this.scene.background = new THREE.Color(0x060b17);
    this.scene.fog = new THREE.FogExp2(0x060b17, 0.022);

    const halfW = roomId === 5 ? 11 : 10;
    const halfD = roomId === 5 ? 11 : 10;
    const wallH = roomId === 5 ? 9.0 : 7.5;
    this.roomBounds = { halfX: halfW - 0.65, halfZ: halfD - 0.65, height: wallH - 0.4 };
    this.doorPos.set(0, 0, -halfD + 0.25);

    this.playerPos.set(0, 1.7, halfD - 2.4);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = 0;
    this.playerPitch = -0.05;
    this.playerGrounded = true;

    this.buildShell(halfW * 2, halfD * 2, wallH, mats, accentNum);

    // Exit door
    this.doorHandle = buildFuturisticExitDoor(mats);
    this.doorHandle.group.position.copy(this.doorPos);
    this.roomGroup.add(this.doorHandle.group);

    // Hologram Formula Board
    const holo = buildHologramBoard(
      `${info.code}: ${info.title}`,
      info.subtitle,
      info.primaryFormula,
      info.accentColor,
      Math.min(8, this.renderer.capabilities.getMaxAnisotropy()),
    );
    holo.position.set(-5.6, 0, -halfD + 1.8);
    holo.rotation.y = 0.35;
    this.roomGroup.add(holo);

    if (roomId === 1) this.buildRoom1(mats);
    else if (roomId === 2) this.buildRoom2(mats);
    else if (roomId === 3) this.buildRoom3(mats);
    else if (roomId === 4) this.buildRoom4(mats);
    else if (roomId === 5) this.buildRoom5(mats);
  }

  private buildShell(
    width: number,
    depth: number,
    height: number,
    mats: LabMaterials,
    accentHex: number,
  ) {
    // 3-point lighting rig (max 1 shadow caster for speed)
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.95);
    this.roomGroup.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    keyLight.position.set(4, height - 0.8, 5);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.roomGroup.add(keyLight);

    const accentLight = new THREE.PointLight(accentHex, 2.2, 24, 1.4);
    accentLight.position.set(0, height - 1.5, -depth * 0.25);
    this.roomGroup.add(accentLight);

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mats.floorMetal);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mats.ceilingDark);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    this.roomGroup.add(ceiling);

    // Overhead light strips
    const stripGeo = new THREE.BoxGeometry(width * 0.65, 0.08, 0.28);
    [-depth * 0.25, depth * 0.22].forEach((zPos) => {
      const strip = new THREE.Mesh(stripGeo, mats.neonCyan);
      strip.position.set(0, height - 0.05, zPos);
      this.roomGroup.add(strip);
    });

    // Perimeter Walls
    const wallSpecs: [number, number, number, number, number, number][] = [
      [0, height / 2, -depth / 2, width, height, 0],
      [0, height / 2, depth / 2, width, height, Math.PI],
      [-width / 2, height / 2, 0, depth, height, Math.PI / 2],
      [width / 2, height / 2, 0, depth, height, -Math.PI / 2],
    ];
    wallSpecs.forEach(([x, y, z, w, h, rotY]) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats.wallPanel);
      wall.position.set(x, y, z);
      wall.rotation.y = rotY;
      wall.receiveShadow = true;
      this.roomGroup.add(wall);
    });

    // Side decorative glass observation partitions
    const glassGeo = new THREE.BoxGeometry(0.12, 2.4, 5.2);
    [-width / 2 + 0.4, width / 2 - 0.4].forEach((gx) => {
      const gp = new THREE.Mesh(glassGeo, mats.glassWall);
      gp.position.set(gx, 1.3, 0);
      gp.renderOrder = 4;
      this.roomGroup.add(gp);
    });
  }

  private addBoxCollider(
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    friction = 0.35,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.roomGroup.add(mesh);

    this.colliders.push({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minY: cy - h / 2,
      maxY: cy + h / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
      friction,
    });
    return mesh;
  }

  // ==================== ROOM 1: GRAVITY CHAMBER ====================
  private buildRoom1(mats: LabMaterials) {
    this.r1Gravity = -9.8;
    this.r1GravityModeIndex = 0;
    this.r1Lock1 = false;
    this.r1Lock2 = false;

    // Floating test platforms (accessible by jumping, especially in Moon gravity!)
    this.addBoxCollider(-5, 1.15, 0.2, 3.2, 0.3, 3.2, mats.darkTrim);
    this.addBoxCollider(5, 2.15, -1.8, 3.2, 0.3, 3.2, mats.darkTrim);

    // Pedestals for the two spheres
    this.addBoxCollider(-5, 0.4, 4.2, 1.4, 0.8, 1.4, mats.steelSurface);
    this.addBoxCollider(5, 0.4, 4.2, 1.4, 0.8, 1.4, mats.steelSurface);

    // Sphere 1: Light Titanium Sphere (2 kg)
    const lightGroup = new THREE.Group();
    const lightMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, metalness: 0.85, roughness: 0.18 }),
    );
    lightMesh.castShadow = true;
    const lightBand = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 24), mats.neonCyan);
    lightGroup.add(lightMesh, lightBand);
    lightGroup.position.set(-5, 1.16, 4.2);
    this.roomGroup.add(lightGroup);

    const lightBody: DynamicBody = {
      id: 'light_ball',
      name: 'Titanium Sphere (2 kg)',
      mesh: lightGroup,
      position: lightGroup.position,
      velocity: new THREE.Vector3(),
      mass: 2,
      radius: 0.36,
      halfExtents: new THREE.Vector3(0.36, 0.36, 0.36),
      shape: 'sphere',
      friction: 0.25,
      restitution: 0.42,
      pickable: true,
      pushable: false,
      isCarried: false,
      onGround: true,
    };

    // Sphere 2: Heavy Lead Core Sphere (8 kg)
    const heavyGroup = new THREE.Group();
    const heavyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.92, roughness: 0.35 }),
    );
    heavyMesh.castShadow = true;
    const heavyBand = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 24), mats.neonAmber);
    heavyGroup.add(heavyMesh, heavyBand);
    heavyGroup.position.set(5, 1.26, 4.2);
    this.roomGroup.add(heavyGroup);

    const heavyBody: DynamicBody = {
      id: 'heavy_ball',
      name: 'Heavy Lead Sphere (8 kg)',
      mesh: heavyGroup,
      position: heavyGroup.position,
      velocity: new THREE.Vector3(),
      mass: 8,
      radius: 0.46,
      halfExtents: new THREE.Vector3(0.46, 0.46, 0.46),
      shape: 'sphere',
      friction: 0.35,
      restitution: 0.2,
      pickable: true,
      pushable: false,
      isCarried: false,
      onGround: true,
    };

    this.dynamicBodies.push(lightBody, heavyBody);

    // Lock 1: Floor Weight Pressure Plate (requires >= 50 N)
    const plate = buildPressurePad(mats, 1.8);
    plate.group.position.set(3.6, 0, -6.2);
    this.roomGroup.add(plate.group);
    this.r1PlatePad = plate;

    // Lock 2: Ceiling Kinetic Switch at (-3.6, 6.8, -4.5)
    const ceilSwitchGroup = new THREE.Group();
    ceilSwitchGroup.position.set(-3.6, 6.95, -4.5);
    const ceilHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.75, 0.45, 16), mats.darkTrim);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.25,
    });
    const ceilDome = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.22, 16), ceilMat);
    ceilDome.position.y = -0.25;
    // Vertical guide beam so player spots the ceiling switch effortlessly
    const guideBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 6.6, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 }),
    );
    guideBeam.position.y = -3.45;
    ceilSwitchGroup.add(ceilHousing, ceilDome, guideBeam);
    this.roomGroup.add(ceilSwitchGroup);
    this.r1CeilingMat = ceilMat;

    // Glowing floor target ring directly beneath Ceiling Kinetic Switch
    const liftRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
    );
    liftRing.rotation.x = -Math.PI / 2;
    liftRing.position.set(-3.6, 0.02, -4.5);
    this.roomGroup.add(liftRing);

    // Gravity Control Console
    const consoleObj = buildConsolePedestal(mats, 0x38bdf8, 'GRAVITY\nEARTH 9.8');
    consoleObj.group.position.set(-6.8, 0, -2.5);
    consoleObj.group.rotation.y = 0.7;
    this.roomGroup.add(consoleObj.group);
    this.r1ConsoleMat = consoleObj.screenMat;

    const modes = [
      { label: 'EARTH -9.8 m/s²', g: -9.8, hex: '#38bdf8' },
      { label: 'MOON -1.6 m/s²', g: -1.6, hex: '#a855f7' },
      { label: 'HIGH-G -19.6 m/s²', g: -19.6, hex: '#f59e0b' },
      { label: 'INVERT +9.8 m/s²', g: 9.8, hex: '#10b981' },
    ];

    this.interactives.push({
      id: 'gravity_console',
      object: consoleObj.group,
      label: 'Cycle Gravity Field (Earth / Moon / High-G / Invert)',
      formulaHint: 'F = m · g',
      onInteract: () => {
        this.r1GravityModeIndex = (this.r1GravityModeIndex + 1) % modes.length;
        const m = modes[this.r1GravityModeIndex];
        this.r1Gravity = m.g;
        soundEngine.playSwitchActivate();
        if (this.r1ConsoleMat) {
          updateConsoleScreenText(this.r1ConsoleMat, m.hex, ['GRAVITY FIELD', m.label]);
        }
        // Release carried object if gravity flips upward so player watches it float
        if (m.g > 0 && this.carriedBody) {
          this.carriedBody.isCarried = false;
          this.carriedBody = null;
        }
      },
    });
  }

  // ==================== ROOM 2: FORCE & MOTION LAB ====================
  private buildRoom2(mats: LabMaterials) {
    this.r2ForceLevelIndex = 0;
    this.r2PadA = false;
    this.r2PadB = false;

    // Track 1 (Left x = -4.5): Slick Ice Track + Ramp up to Pad A
    const iceTrack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 10.2), mats.iceSurface);
    iceTrack.position.set(-4.5, 0.02, 1.5);
    iceTrack.receiveShadow = true;
    this.roomGroup.add(iceTrack);
    this.colliders.push({
      minX: -5.7,
      maxX: -3.3,
      minY: 0,
      maxY: 0.04,
      minZ: -3.6,
      maxZ: 6.6,
      friction: 0.04,
    });

    // Inclined Ramp from z = -1.5 (y = 0) up to z = -4.5 (y = 0.85)
    const rampGeo = new THREE.BoxGeometry(2.4, 0.14, 3.12);
    const rampMesh = new THREE.Mesh(rampGeo, mats.iceSurface);
    rampMesh.position.set(-4.5, 0.42, -3.0);
    rampMesh.rotation.x = 0.276;
    rampMesh.receiveShadow = true;
    this.roomGroup.add(rampMesh);
    this.colliders.push({
      minX: -5.7,
      maxX: -3.3,
      minY: 0,
      maxY: 0.9,
      minZ: -4.5,
      maxZ: -1.5,
      friction: 0.04,
      isRamp: true,
      rampAxis: 'z',
      rampStart: -1.5,
      rampEnd: -4.5,
      rampStartY: 0.04,
      rampEndY: 0.88,
    });

    // Elevated Platform A at (-4.5, 0.88, -6.2)
    this.addBoxCollider(-4.5, 0.44, -6.2, 2.5, 0.88, 3.4, mats.darkTrim, 0.35);
    const padA = buildPressurePad(mats, 1.7);
    padA.group.position.set(-4.5, 0.88, -6.2);
    this.roomGroup.add(padA.group);
    this.r2PadAMat = padA.coreMat;

    // Backstops behind Pad A & Pad B so pushed crates stop cleanly on target
    this.addBoxCollider(-4.5, 1.45, -7.8, 2.5, 1.2, 0.3, mats.darkTrim);
    this.addBoxCollider(0, 0.6, -7.8, 2.8, 1.2, 0.3, mats.darkTrim);

    // Track 2 (Center x = 0): Brushed Steel Track to Pad B
    const steelTrack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 12.6), mats.steelSurface);
    steelTrack.position.set(0, 0.02, -0.5);
    steelTrack.receiveShadow = true;
    this.roomGroup.add(steelTrack);
    this.colliders.push({
      minX: -1.3,
      maxX: 1.3,
      minY: 0,
      maxY: 0.04,
      minZ: -6.8,
      maxZ: 5.8,
      friction: 0.25,
    });

    const padB = buildPressurePad(mats, 1.8);
    padB.group.position.set(0, 0, -6.2);
    this.roomGroup.add(padB.group);
    this.r2PadBMat = padB.coreMat;

    // Track 3 (Right x = +4.8): High-Friction Rubber Demo Track
    const rubberTrack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 11.0), mats.rubberSurface);
    rubberTrack.position.set(4.8, 0.02, 0);
    rubberTrack.receiveShadow = true;
    this.roomGroup.add(rubberTrack);
    this.colliders.push({
      minX: 3.6,
      maxX: 6.0,
      minY: 0,
      maxY: 0.04,
      minZ: -5.5,
      maxZ: 5.5,
      friction: 0.65,
    });

    // Crates
    const makeCrate = (
      id: string,
      name: string,
      pos: [number, number, number],
      size: number,
      mass: number,
      trimMat: THREE.Material,
    ) => {
      const grp = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 }),
      );
      box.castShadow = true;
      box.receiveShadow = true;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(size + 0.04, 0.14, size + 0.04), trimMat);
      grp.add(box, strip);
      grp.position.set(pos[0], pos[1], pos[2]);
      this.roomGroup.add(grp);

      const body: DynamicBody = {
        id,
        name,
        mesh: grp,
        position: grp.position,
        velocity: new THREE.Vector3(),
        mass,
        radius: size * 0.5,
        halfExtents: new THREE.Vector3(size * 0.5, size * 0.5, size * 0.5),
        shape: 'box',
        friction: 0.25,
        restitution: 0.15,
        pickable: false,
        pushable: true,
        isCarried: false,
        onGround: true,
      };
      this.dynamicBodies.push(body);
    };

    makeCrate('light_crate', '5 kg Titanium Crate (Click / E to Push)', [-4.5, 0.45, 4.6], 0.9, 5, mats.neonCyan);
    makeCrate('heavy_crate', '20 kg Heavy Crate (Click / E to Push)', [0, 0.55, 4.2], 1.1, 20, mats.neonAmber);
    makeCrate('demo_crate', '10 kg Rubber-Track Test Crate (Compare μ=0.65)', [4.8, 0.48, 3.5], 0.95, 10, mats.neonRed);

    // Visual Force Vector Arrow
    const arrowGrp = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), mats.neonCyan);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.6;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), mats.neonCyan);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -1.3;
    arrowGrp.add(shaft, tip);
    arrowGrp.visible = false;
    this.roomGroup.add(arrowGrp);
    this.r2ForceArrow = arrowGrp;

    // Force Selector Console + Reset Crates Console
    const forceConsole = buildConsolePedestal(mats, 0x22d3ee, 'THRUST FORCE\n60 N');
    forceConsole.group.position.set(7.2, 0, 5.2);
    forceConsole.group.rotation.y = -0.65;
    this.roomGroup.add(forceConsole.group);
    this.r2ConsoleMat = forceConsole.screenMat;

    const forces = [60, 180, 360];
    this.interactives.push({
      id: 'force_console',
      object: forceConsole.group,
      label: 'Adjust Applied Push Force (60 N / 180 N / 360 N)',
      formulaHint: 'F_net = F_app − μ·m·g',
      onInteract: () => {
        this.r2ForceLevelIndex = (this.r2ForceLevelIndex + 1) % forces.length;
        const f = forces[this.r2ForceLevelIndex];
        soundEngine.playSwitchActivate();
        if (this.r2ConsoleMat) {
          updateConsoleScreenText(this.r2ConsoleMat, '#22d3ee', ['THRUST FORCE', `${f} N`]);
        }
      },
    });

    const resetConsole = buildConsolePedestal(mats, 0xf59e0b, 'RESET\nCRATES');
    resetConsole.group.position.set(-7.2, 0, 5.2);
    resetConsole.group.rotation.y = 0.65;
    this.roomGroup.add(resetConsole.group);
    this.interactives.push({
      id: 'reset_crates',
      object: resetConsole.group,
      label: 'Reset Crates to Starting Positions',
      onInteract: () => {
        soundEngine.playClick();
        const lc = this.dynamicBodies.find((b) => b.id === 'light_crate');
        const hc = this.dynamicBodies.find((b) => b.id === 'heavy_crate');
        const dc = this.dynamicBodies.find((b) => b.id === 'demo_crate');
        if (lc) { lc.position.set(-4.5, 0.45, 4.6); lc.velocity.set(0, 0, 0); }
        if (hc) { hc.position.set(0, 0.55, 4.2); hc.velocity.set(0, 0, 0); }
        if (dc) { dc.position.set(4.8, 0.48, 3.5); dc.velocity.set(0, 0, 0); }
      },
    });
  }

  // ==================== ROOM 3: OPTICS LASER ROOM ====================
  private buildRoom3(mats: LabMaterials) {
    this.r3Mirrors = [];
    this.r3Solved = false;
    this.r3PrismIndex = 0;

    // Central Obstruction Pillar blocking direct path
    const pillar = this.addBoxCollider(0, 2.0, 0.6, 2.2, 4.0, 2.2, mats.darkTrim);
    const pillarRing = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.14, 2.26), mats.neonPurple);
    pillarRing.position.set(0, 1.45, 0.6);
    this.roomGroup.add(pillarRing);
    void pillar;
    this.r3Obstacles = [
      {
        type: 'box',
        min: new THREE.Vector3(-1.1, 0, -0.5),
        max: new THREE.Vector3(1.1, 4.0, 1.7),
      },
    ];

    // Laser Emitter at (-6.5, 0, 5.0) aiming +X
    const emitter = buildLaserEmitter(mats);
    emitter.position.set(-6.5, 0, 5.0);
    emitter.rotation.y = Math.PI / 2;
    this.roomGroup.add(emitter);

    // 3 Rotatable Mirror Pedestals
    const mirrorConfigs: { id: string; pos: [number, number, number]; startAngle: number; targetHint: string }[] = [
      { id: 'mirror_1', pos: [3.5, 0, 5.0], startAngle: 15, targetHint: '45°' },
      { id: 'mirror_2', pos: [3.5, 0, -3.5], startAngle: -15, targetHint: '-45°' },
      { id: 'mirror_3', pos: [-5.5, 0, -4.86], startAngle: -105, targetHint: '-75°' },
    ];

    mirrorConfigs.forEach((cfg, idx) => {
      const ped = buildMirrorPedestal(mats);
      ped.group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      ped.headPivot.rotation.y = THREE.MathUtils.degToRad(cfg.startAngle);
      this.roomGroup.add(ped.group);

      const mData: MirrorData = {
        id: cfg.id,
        position: new THREE.Vector3(cfg.pos[0], 1.45, cfg.pos[2]),
        angleDeg: cfg.startAngle,
        width: 1.15,
        height: 0.9,
      };
      this.r3Mirrors.push({ data: mData, headPivot: ped.headPivot });

      this.interactives.push({
        id: cfg.id,
        object: ped.group,
        label: `Rotate Mirror ${idx + 1} (+15°) — Current: ${mData.angleDeg}°`,
        formulaHint: 'θ_i = θ_r',
        onInteract: () => {
          mData.angleDeg += 15;
          if (mData.angleDeg > 180) mData.angleDeg -= 360;
          ped.headPivot.rotation.y = THREE.MathUtils.degToRad(mData.angleDeg);
          soundEngine.playLaserRotate();
          const target = this.interactives.find((it) => it.id === cfg.id);
          if (target) {
            target.label = `Rotate Mirror ${idx + 1} (+15°) — Current: ${mData.angleDeg}°`;
          }
          this.updateLaserTrace();
        },
      });
    });

    // Refractive Glass Prism Block at (-1.0, 1.45, -3.5)
    const prismBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.0, 12), mats.darkTrim);
    prismBase.position.set(-1.0, 0.5, -3.5);
    this.roomGroup.add(prismBase);

    const prismMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      metalness: 0.0,
      transmission: this.isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.35 : 1,
      ior: 1.52,
      thickness: 0.8,
    });
    this.disposables.push(prismMat);

    const prismBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 1.1), prismMat);
    prismBlock.position.set(-1.0, 1.45, -3.5);
    prismBlock.rotation.y = THREE.MathUtils.degToRad(30);
    this.roomGroup.add(prismBlock);
    this.r3PrismMesh = prismBlock;

    this.r3Prism = {
      position: new THREE.Vector3(-1.0, 1.45, -3.5),
      angleDeg: 30,
      thickness: 0.7,
      width: 1.1,
      ior: 1.0,
      materialName: 'Air (n = 1.00)',
    };

    const prismConsole = buildConsolePedestal(mats, 0xa855f7, 'PRISM MEDIUM\nAIR n=1.00');
    prismConsole.group.position.set(-1.0, 0, -1.6);
    this.roomGroup.add(prismConsole.group);
    this.r3PrismConsoleMat = prismConsole.screenMat;

    const prismMedia = [
      { name: 'AIR n=1.00', ior: 1.0, color: 0x94a3b8, hex: '#94a3b8' },
      { name: 'GLASS n=1.52', ior: 1.52, color: 0x38bdf8, hex: '#38bdf8' },
      { name: 'DIAMOND n=2.42', ior: 2.42, color: 0xa855f7, hex: '#a855f7' },
    ];

    this.interactives.push({
      id: 'prism_console',
      object: prismConsole.group,
      label: 'Change Prism Medium (Air n=1.00 / Glass n=1.52 / Diamond n=2.42)',
      formulaHint: 'n₁·sin(θ₁) = n₂·sin(θ₂)',
      onInteract: () => {
        this.r3PrismIndex = (this.r3PrismIndex + 1) % prismMedia.length;
        const med = prismMedia[this.r3PrismIndex];
        if (this.r3Prism) {
          this.r3Prism.ior = med.ior;
          this.r3Prism.materialName = med.name;
        }
        if (this.r3PrismMesh) {
          const pm = this.r3PrismMesh.material as THREE.MeshPhysicalMaterial;
          pm.color.setHex(med.color);
          pm.ior = med.ior;
        }
        if (this.r3PrismConsoleMat) {
          updateConsoleScreenText(this.r3PrismConsoleMat, med.hex, ['PRISM MEDIUM', med.name]);
        }
        soundEngine.playSwitchActivate();
        this.updateLaserTrace();
      },
    });

    // Photonic Receiver Sensor on exit wall
    const recStand = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.4, 12), mats.darkTrim);
    recStand.position.set(this.r3ReceiverPos.x, 0.7, this.r3ReceiverPos.z);
    const recMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    this.disposables.push(recMat);
    const recSphere = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 20), recMat);
    recSphere.position.copy(this.r3ReceiverPos);
    const recHalo = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 24), mats.neonPurple);
    recHalo.position.copy(this.r3ReceiverPos);
    this.roomGroup.add(recStand, recSphere, recHalo);
    this.r3ReceiverMat = recMat;

    this.roomGroup.add(this.r3BeamGroup);
    this.updateLaserTrace();
  }

  private updateLaserTrace() {
    while (this.r3BeamGroup.children.length > 0) {
      const ch = this.r3BeamGroup.children[0] as THREE.Mesh;
      if (ch.geometry) ch.geometry.dispose();
      this.r3BeamGroup.remove(ch);
    }

    const origin = new THREE.Vector3(-5.95, 1.45, 5.0);
    const initialDir = new THREE.Vector3(1, 0, 0);
    const trace = traceLaserPath(
      origin,
      initialDir,
      this.r3Mirrors.map((m) => m.data),
      this.r3Prism,
      this.r3ReceiverPos,
      0.65,
      this.r3Obstacles,
      this.roomBounds,
    );

    const beamMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
    });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.disposables.push(beamMat, glowMat, sparkMat);

    for (let i = 0; i < trace.points.length - 1; i++) {
      const a = trace.points[i];
      const b = trace.points[i + 1];
      const dist = a.distanceTo(b);
      if (dist < 0.02) continue;

      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, dist, 8), beamMat);
      core.position.copy(mid);
      core.quaternion.copy(quat);

      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, dist, 8), glowMat);
      outer.position.copy(mid);
      outer.quaternion.copy(quat);

      this.r3BeamGroup.add(core, outer);

      if (i > 0) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), sparkMat);
        spark.position.copy(a);
        this.r3BeamGroup.add(spark);
      }
    }

    this.r3Solved = trace.hitReceiver;
    if (trace.hitReceiver) {
      if (this.r3ReceiverMat) {
        this.r3ReceiverMat.color.setHex(0x10b981);
        this.r3ReceiverMat.emissive.setHex(0x10b981);
      }
      this.r3Status = `Receiver Energized! (θ_i=θ_r=${Math.round(trace.lastIncidentAngleDeg)}°, Prism=${this.r3Prism?.materialName})`;
      if (!this.doorUnlocked) {
        this.unlockDoor();
        this.spawnBurst(this.r3ReceiverPos, 0x10b981, 45);
        this.awardMilestone('r3_receiver', 300);
      }
    } else {
      const hitStr = `${trace.hitMirrorIds.length}/3 Mirrors${trace.hitPrism ? ' + Prism' : ''}`;
      this.r3Status = `Beam Path: ${hitStr} — Align remaining optics`;
    }
  }

  // ==================== ROOM 4: MAGNETIC MYSTERY ROOM ====================
  private buildRoom4(mats: LabMaterials) {
    this.r4CoilOn = false;
    this.r4CubePolarity = 'N';
    this.r4Lock1 = false;
    this.r4Lock2 = false;

    // Left Channel (-4.5): Glass guide rails for Ferromagnetic Iron Core
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 10.2), mats.glassWall);
    railL.position.set(-5.35, 0.45, -0.5);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 10.2), mats.glassWall);
    railR.position.set(-3.65, 0.45, -0.5);
    this.roomGroup.add(railL, railR);

    // Electromagnet Coil A at (-4.5, 0, -6.2)
    const coil = buildElectromagnetCoil(mats, 'N');
    coil.group.position.set(-4.5, 0, -6.2);
    this.roomGroup.add(coil.group);
    this.r4CoilMat = coil.capMat;
    this.r4CoilMat.emissiveIntensity = 0.25;

    // Inductive Pad 1 at (-4.5, 0, -4.4)
    const pad1 = buildPressurePad(mats, 1.5);
    pad1.group.position.set(-4.5, 0, -4.4);
    this.roomGroup.add(pad1.group);
    this.r4Pad1Mat = pad1.coreMat;

    // Ferromagnetic Iron Core Sphere at (-4.5, 0.48, 3.6)
    const ironMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.95, roughness: 0.22 }),
    );
    ironMesh.position.set(-4.5, 0.48, 3.6);
    ironMesh.castShadow = true;
    this.roomGroup.add(ironMesh);

    const ironCore: DynamicBody = {
      id: 'iron_core',
      name: 'Ferromagnetic Iron Core',
      mesh: ironMesh,
      position: ironMesh.position,
      velocity: new THREE.Vector3(),
      mass: 6,
      radius: 0.48,
      halfExtents: new THREE.Vector3(0.48, 0.48, 0.48),
      shape: 'sphere',
      friction: 0.12,
      restitution: 0.2,
      pickable: false,
      pushable: true,
      isCarried: false,
      isMagnetic: true,
      magnetPolarity: null,
      onGround: true,
    };

    // Electromagnet Console
    const coilConsole = buildConsolePedestal(mats, 0x6366f1, 'COIL A: OFF\nMAG FIELD: 0 T');
    coilConsole.group.position.set(-7.5, 0, 0.8);
    coilConsole.group.rotation.y = 1.0;
    this.roomGroup.add(coilConsole.group);
    this.r4CoilConsoleMat = coilConsole.screenMat;

    this.interactives.push({
      id: 'coil_console',
      object: coilConsole.group,
      label: 'Toggle Electromagnet Coil A (ON / OFF)',
      formulaHint: 'B = μ₀ · n · I',
      onInteract: () => {
        this.r4CoilOn = !this.r4CoilOn;
        soundEngine.playSwitchActivate();
        if (this.r4CoilMat) {
          this.r4CoilMat.emissiveIntensity = this.r4CoilOn ? 2.2 : 0.25;
        }
        if (this.r4CoilConsoleMat) {
          updateConsoleScreenText(
            this.r4CoilConsoleMat,
            this.r4CoilOn ? '#10b981' : '#6366f1',
            ['ELECTROMAGNET', this.r4CoilOn ? 'COIL A: ON' : 'COIL A: OFF'],
          );
        }
        this.rebuildMagneticFieldLines();
      },
    });

    // Right Channel (+4.5): Polarized Magnetic Slider + Socket 2
    const pad2 = buildPressurePad(mats, 1.6);
    pad2.group.position.set(4.5, 0, -5.2);
    this.roomGroup.add(pad2.group);
    this.r4Pad2Mat = pad2.coreMat;

    // Polarized Slider Block (North Red on +Z side, South Blue on -Z side)
    const sliderGrp = new THREE.Group();
    const nHalf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.5), mats.neonRed);
    nHalf.position.z = 0.25;
    const sHalf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.5), mats.neonBlue);
    sHalf.position.z = -0.25;
    sliderGrp.add(nHalf, sHalf);
    sliderGrp.position.set(4.5, 0.45, 2.2);
    this.roomGroup.add(sliderGrp);

    const sliderBody: DynamicBody = {
      id: 'mag_slider',
      name: 'Polarized Slider (Front: N / Back: S)',
      mesh: sliderGrp,
      position: sliderGrp.position,
      velocity: new THREE.Vector3(),
      mass: 4,
      radius: 0.52,
      halfExtents: new THREE.Vector3(0.5, 0.45, 0.5),
      shape: 'box',
      friction: 0.08,
      restitution: 0.2,
      pickable: false,
      pushable: false,
      isCarried: false,
      isMagnetic: true,
      magnetPolarity: 'N',
      onGround: true,
    };

    // Portable Magnet Cube
    const cubeGrp = new THREE.Group();
    const cubeN = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.33), mats.neonRed);
    cubeN.position.z = -0.165; // -Z facing forward
    const cubeS = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.33), mats.neonBlue);
    cubeS.position.z = 0.165;
    cubeGrp.add(cubeN, cubeS);
    cubeGrp.position.set(1.8, 0.45, 4.4);
    this.roomGroup.add(cubeGrp);
    this.r4CubeMesh = cubeGrp;

    const cubeBody: DynamicBody = {
      id: 'portable_magnet',
      name: 'Portable Magnet Cube (Facing Pole: N)',
      mesh: cubeGrp,
      position: cubeGrp.position,
      velocity: new THREE.Vector3(),
      mass: 2.5,
      radius: 0.38,
      halfExtents: new THREE.Vector3(0.33, 0.33, 0.33),
      shape: 'box',
      friction: 0.25,
      restitution: 0.2,
      pickable: true,
      pushable: false,
      isCarried: false,
      isMagnetic: true,
      magnetPolarity: 'N',
      onGround: true,
    };

    this.dynamicBodies.push(ironCore, sliderBody, cubeBody);

    // Polarity Flip Console
    const polConsole = buildConsolePedestal(mats, 0xef4444, 'CUBE POLE\nNORTH (RED)');
    polConsole.group.position.set(7.5, 0, 2.5);
    polConsole.group.rotation.y = -1.0;
    this.roomGroup.add(polConsole.group);

    this.interactives.push({
      id: 'polarity_console',
      object: polConsole.group,
      label: 'Flip Portable Magnet Polarity (North / South)',
      formulaHint: 'N ↔ N Repel | N ↔ S Attract',
      onInteract: () => {
        this.r4CubePolarity = this.r4CubePolarity === 'N' ? 'S' : 'N';
        cubeBody.magnetPolarity = this.r4CubePolarity;
        cubeBody.name = `Portable Magnet Cube (Facing Pole: ${this.r4CubePolarity})`;
        if (this.r4CubeMesh) {
          this.r4CubeMesh.rotation.y = this.r4CubePolarity === 'N' ? 0 : Math.PI;
        }
        updateConsoleScreenText(
          polConsole.screenMat,
          this.r4CubePolarity === 'N' ? '#ef4444' : '#3b82f6',
          ['CUBE POLE', this.r4CubePolarity === 'N' ? 'NORTH (RED)' : 'SOUTH (BLUE)'],
        );
        soundEngine.playSwitchActivate();
        this.rebuildMagneticFieldLines();
      },
    });

    this.roomGroup.add(this.r4FieldLinesGroup);
    this.rebuildMagneticFieldLines();
  }

  private rebuildMagneticFieldLines() {
    while (this.r4FieldLinesGroup.children.length > 0) {
      const ch = this.r4FieldLinesGroup.children[0] as THREE.Line;
      if (ch.geometry) ch.geometry.dispose();
      this.r4FieldLinesGroup.remove(ch);
    }

    // Animated dipole field arcs around Electromagnet Coil A
    const coilColor = this.r4CoilOn ? 0x38bdf8 : 0x334155;
    const coilLineMat = new THREE.LineBasicMaterial({
      color: coilColor,
      transparent: true,
      opacity: this.r4CoilOn ? 0.85 : 0.3,
    });
    this.disposables.push(coilLineMat);

    [-0.9, 0.9].forEach((sideX) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-4.5, 1.4, -6.2),
        new THREE.Vector3(-4.5 + sideX * 2.2, 2.3, -1.5),
        new THREE.Vector3(-4.5, 0.5, 3.2),
      );
      const pts = curve.getPoints(28);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.r4FieldLinesGroup.add(new THREE.Line(geo, coilLineMat));
    });

    // Dipole field loops around Polarized Slider
    const slider = this.dynamicBodies.find((b) => b.id === 'mag_slider');
    if (slider) {
      const sliderMat = new THREE.LineBasicMaterial({
        color: this.r4CubePolarity === 'N' ? 0xf87171 : 0x60a5fa,
        transparent: true,
        opacity: 0.7,
      });
      this.disposables.push(sliderMat);

      [-0.75, 0.75].forEach((offsetX) => {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(slider.position.x, 0.55, slider.position.z + 0.55),
          new THREE.Vector3(slider.position.x + offsetX * 1.8, 1.35, slider.position.z),
          new THREE.Vector3(slider.position.x, 0.55, slider.position.z - 0.55),
        );
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
        this.r4FieldLinesGroup.add(new THREE.Line(geo, sliderMat));
      });
    }
  }

  // ==================== ROOM 5: ENERGY ESCAPE CHAMBER ====================
  private buildRoom5(mats: LabMaterials) {
    this.r5DropHeightIndex = 0;
    this.r5Ramp1Aligned = false;
    this.r5Ramp2Aligned = false;
    this.r5BallActive = false;
    this.r5BallS = 0;
    this.r5GeneratorSpin = 0.4;
    this.r5StatusMsg = 'Align Ramps 1 & 2, set Height to 8 m, then Launch Sphere!';

    // Launch Tower at x = -7.5, z = -2.5
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.2, 1.4), mats.darkTrim);
    tower.position.set(-8.2, 4.1, -2.5);
    tower.castShadow = true;
    this.roomGroup.add(tower);

    // Height markers (2m, 5m, 8m)
    [2.0, 5.0, 8.0].forEach((h) => {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), mats.neonCyan);
      marker.position.set(-8.2, h, -2.5);
      this.roomGroup.add(marker);
    });

    // Fixed curved down-chute rails (-7.5 -> -2.5)
    const chute = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 1.1), mats.steelSurface);
    chute.position.set(-5.0, 2.1, -2.5);
    chute.rotation.z = -0.62;
    this.roomGroup.add(chute);

    // Adjustable Bridge Ramp 1 (-2.0 to +1.5)
    const ramp1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 1.1), mats.neonAmber);
    ramp1.position.set(-0.25, 0.35, -2.5);
    ramp1.rotation.z = -0.35; // Misaligned initially
    this.roomGroup.add(ramp1);
    this.r5Ramp1Mesh = ramp1;

    // Adjustable Boost Ramp 2 (+1.5 to +5.2)
    const ramp2 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 1.1), mats.neonAmber);
    ramp2.position.set(3.4, 0.55, -2.5);
    ramp2.rotation.z = -0.25; // Misaligned initially
    this.roomGroup.add(ramp2);
    this.r5Ramp2Mesh = ramp2;

    // Final Energy Generator at (+7.2, 0, -2.5)
    const gen = buildEnergyGenerator(mats);
    gen.group.position.set(7.2, 0, -2.5);
    this.roomGroup.add(gen.group);
    this.r5Generator = gen;

    // Energy Sphere (5 kg)
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.7,
        metalness: 0.7,
        roughness: 0.15,
      }),
    );
    ballMesh.position.set(-7.5, 2.2, -2.5);
    ballMesh.castShadow = true;
    this.roomGroup.add(ballMesh);
    this.r5BallMesh = ballMesh;

    // Controls: Tower Height Console, Ramp Lever 1, Ramp Lever 2, Launch Button Console
    const heightConsole = buildConsolePedestal(mats, 0x38bdf8, 'HEIGHT: 2.0 m\nPE = 98 J');
    heightConsole.group.position.set(-7.2, 0, 1.6);
    this.roomGroup.add(heightConsole.group);
    this.r5TowerConsoleMat = heightConsole.screenMat;

    const heights = [
      { h: 2.0, pe: 98 },
      { h: 5.0, pe: 245 },
      { h: 8.0, pe: 392 },
    ];
    this.interactives.push({
      id: 'height_console',
      object: heightConsole.group,
      label: 'Adjust Launch Height (2.0 m / 5.0 m / 8.0 m)',
      formulaHint: 'PE = m · g · h  (m = 5 kg)',
      onInteract: () => {
        if (this.r5BallActive) return;
        this.r5DropHeightIndex = (this.r5DropHeightIndex + 1) % heights.length;
        const cfg = heights[this.r5DropHeightIndex];
        if (this.r5BallMesh) {
          this.r5BallMesh.position.set(-7.5, cfg.h, -2.5);
        }
        if (this.r5TowerConsoleMat) {
          updateConsoleScreenText(this.r5TowerConsoleMat, '#38bdf8', [
            `HEIGHT: ${cfg.h.toFixed(1)} m`,
            `PE = ${cfg.pe} J`,
          ]);
        }
        soundEngine.playClick();
      },
    });

    const lever1 = buildConsolePedestal(mats, 0xf59e0b, 'RAMP 1\nMISALIGNED');
    lever1.group.position.set(-1.2, 0, 1.6);
    this.roomGroup.add(lever1.group);
    this.r5Ramp1LeverMat = lever1.screenMat;

    this.interactives.push({
      id: 'ramp1_lever',
      object: lever1.group,
      label: 'Toggle Bridge Ramp 1 (Align / Misalign)',
      onInteract: () => {
        this.r5Ramp1Aligned = !this.r5Ramp1Aligned;
        if (this.r5Ramp1Mesh) {
          this.r5Ramp1Mesh.rotation.z = this.r5Ramp1Aligned ? 0 : -0.35;
          this.r5Ramp1Mesh.position.y = this.r5Ramp1Aligned ? 0.55 : 0.35;
          this.r5Ramp1Mesh.material = this.r5Ramp1Aligned ? mats.neonEmerald : mats.neonAmber;
        }
        if (this.r5Ramp1LeverMat) {
          updateConsoleScreenText(
            this.r5Ramp1LeverMat,
            this.r5Ramp1Aligned ? '#10b981' : '#f59e0b',
            ['BRIDGE RAMP 1', this.r5Ramp1Aligned ? 'ALIGNED' : 'MISALIGNED'],
          );
        }
        soundEngine.playSwitchActivate();
      },
    });

    const lever2 = buildConsolePedestal(mats, 0xf59e0b, 'RAMP 2\nMISALIGNED');
    lever2.group.position.set(2.8, 0, 1.6);
    this.roomGroup.add(lever2.group);
    this.r5Ramp2LeverMat = lever2.screenMat;

    this.interactives.push({
      id: 'ramp2_lever',
      object: lever2.group,
      label: 'Toggle Boost Ramp 2 (Up-Slope / Misaligned)',
      onInteract: () => {
        this.r5Ramp2Aligned = !this.r5Ramp2Aligned;
        if (this.r5Ramp2Mesh) {
          this.r5Ramp2Mesh.rotation.z = this.r5Ramp2Aligned ? 0.34 : -0.25;
          this.r5Ramp2Mesh.position.y = this.r5Ramp2Aligned ? 1.15 : 0.55;
          this.r5Ramp2Mesh.material = this.r5Ramp2Aligned ? mats.neonEmerald : mats.neonAmber;
        }
        if (this.r5Ramp2LeverMat) {
          updateConsoleScreenText(
            this.r5Ramp2LeverMat,
            this.r5Ramp2Aligned ? '#10b981' : '#f59e0b',
            ['BOOST RAMP 2', this.r5Ramp2Aligned ? 'UP-SLOPE OK' : 'MISALIGNED'],
          );
        }
        soundEngine.playSwitchActivate();
      },
    });

    const launchConsole = buildConsolePedestal(mats, 0x10b981, 'LAUNCH\nSPHERE');
    launchConsole.group.position.set(-4.2, 0, 1.6);
    this.roomGroup.add(launchConsole.group);

    this.interactives.push({
      id: 'launch_sphere',
      object: launchConsole.group,
      label: 'Release 5 kg Energy Sphere Down Track',
      formulaHint: 'PE = mgh → KE = ½mv²',
      onInteract: () => {
        if (this.r5BallActive) return;
        const h = heights[this.r5DropHeightIndex].h;
        this.r5BallActive = true;
        this.r5BallS = 0;
        this.r5TotalEnergy = computePotentialEnergy(5, 9.8, h);
        this.r5CurrentPE = this.r5TotalEnergy;
        this.r5CurrentKE = 0;
        this.r5BallSpeed = 0;
        this.r5StatusMsg = 'Sphere launched! Converting PE → KE...';
        soundEngine.playPickup();
      },
    });
  }

  // ==================== INTERACTION & PLAYER ACTIONS ====================
  public interactWith(target: InteractiveTarget | null, lookDir: THREE.Vector3) {
    if (this.escaping) return;

    // If currently carrying an object and clicking / pressing E on non-interactive or directly dropping
    if (this.carriedBody && !target) {
      this.dropCarriedBody(lookDir);
      return;
    }

    if (target) {
      // Check if target is a dynamic body
      const body = this.dynamicBodies.find((b) => b.mesh === target.object || b.id === target.id);
      if (body) {
        if (body.pickable) {
          if (this.carriedBody === body) {
            this.dropCarriedBody(lookDir);
          } else {
            if (this.carriedBody) this.dropCarriedBody(lookDir);
            this.carriedBody = body;
            body.isCarried = true;
            body.velocity.set(0, 0, 0);
            soundEngine.playPickup();
          }
          return;
        }
        if (body.pushable && this.currentRoomId === 2) {
          this.pushRoom2Crate(body, lookDir);
          return;
        }
      }

      target.onInteract();
    }
  }

  public dropCarriedBody(lookDir: THREE.Vector3) {
    if (!this.carriedBody) return;
    const b = this.carriedBody;
    b.isCarried = false;
    b.velocity.set(lookDir.x * 2.4, 0.5, lookDir.z * 2.4);
    this.carriedBody = null;
    soundEngine.playDrop(0.8);
  }

  private pushRoom2Crate(body: DynamicBody, lookDir: THREE.Vector3) {
    const forces = [60, 180, 360];
    const appliedF = forces[this.r2ForceLevelIndex];

    // Push primarily along dominant axis toward target pads (-Z or +Z or player look XZ)
    const pushDir = new THREE.Vector3(lookDir.x, 0, lookDir.z).normalize();
    if (Math.abs(pushDir.z) > Math.abs(pushDir.x)) {
      pushDir.set(0, 0, Math.sign(pushDir.z));
    } else {
      pushDir.set(Math.sign(pushDir.x), 0, 0);
    }

    const support = getSupportHeightAt(body.position.x, body.position.z, body.position.y - body.halfExtents.y, this.colliders);
    const frictionForce = support.friction * body.mass * 9.8;
    const netForce = Math.max(0, appliedF - frictionForce);
    const accel = netForce / body.mass;

    if (netForce <= 0.5) {
      soundEngine.playError();
      this.r2LastAccelText = `F=${appliedF}N ≤ f_k=${frictionForce.toFixed(1)}N → Blocked by Friction!`;
    } else {
      soundEngine.playDrop(1.1);
      // Apply 0.6s thrust impulse
      const deltaV = accel * 0.65;
      body.velocity.addScaledVector(pushDir, deltaV);
      this.r2LastAccelText = `a = (${appliedF}−${frictionForce.toFixed(0)}) / ${body.mass}kg = ${accel.toFixed(1)} m/s²`;
    }

    if (this.r2ForceArrow) {
      this.r2ForceArrow.visible = true;
      this.r2ForceArrow.position.set(body.position.x, body.position.y + 0.9, body.position.z);
      this.r2ForceArrow.rotation.y = Math.atan2(-pushDir.x, -pushDir.z);
      this.r2ForceArrowTimer = 0.85;
    }
  }

  // ==================== PER-FRAME UPDATE ====================
  public update(
    dt: number,
    elapsed: number,
    moveInput: { forward: number; right: number; jump: boolean },
    camera: THREE.PerspectiveCamera,
    pointerLocked: boolean,
  ) {
    const clampedDt = Math.min(dt, 0.05);

    // 1. Escape cutscene in Room 5
    if (this.escaping) {
      this.escapeTimer += clampedDt;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, this.doorPos.z - 2.5, clampedDt * 2.5);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.2, clampedDt * 2.0);
      camera.rotation.set(0, 0, 0);
      if (this.escapeTimer > 1.8 && !this.hasExited) {
        this.hasExited = true;
        this.callbacks.onRoomExited();
      }
      this.updateParticles(clampedDt);
      return;
    }

    // 2. Animated background meshes
    this.animatedMeshes.forEach((fn) => fn(elapsed, clampedDt));

    if (this.currentRoomId === 'menu') {
      // Orbit camera gently around gyro core on Main Menu
      camera.position.set(Math.sin(elapsed * 0.22) * 7.5, 3.2, Math.cos(elapsed * 0.22) * 7.5);
      camera.lookAt(0, 2.1, 0);
      return;
    }

    // 3. Player Kinematics & Gravity
    const roomG = this.currentRoomId === 1 ? (this.r1Gravity > 0 ? -3.8 : this.r1Gravity) : -9.8;
    const speed = 5.4;

    const forwardVec = new THREE.Vector3(-Math.sin(this.playerYaw), 0, -Math.cos(this.playerYaw));
    const rightVec = new THREE.Vector3(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forwardVec, moveInput.forward)
      .addScaledVector(rightVec, moveInput.right);
    if (moveDir.lengthSq() > 0.001) moveDir.normalize();

    this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, moveDir.x * speed, 14, clampedDt);
    this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, moveDir.z * speed, 14, clampedDt);

    if (moveInput.jump && this.playerGrounded) {
      this.playerVel.y = this.currentRoomId === 1 && this.r1GravityModeIndex === 1 ? 6.8 : 5.6;
      this.playerGrounded = false;
      soundEngine.playJump();
    }

    this.playerVel.y += roomG * clampedDt;
    this.playerPos.addScaledVector(this.playerVel, clampedDt);

    // Support height check for player feet (eye height = 1.7)
    const feetY = this.playerPos.y - 1.7;
    const support = getSupportHeightAt(this.playerPos.x, this.playerPos.z, feetY, this.colliders);
    if (this.playerPos.y - 1.7 <= support.y) {
      this.playerPos.y = support.y + 1.7;
      if (this.playerVel.y < 0) this.playerVel.y = 0;
      this.playerGrounded = true;
    } else {
      this.playerGrounded = false;
    }

    // Room boundary clamping (allow stepping through open Exit Door!)
    const inDoorwayX = Math.abs(this.playerPos.x - this.doorPos.x) < 1.15;
    const minZAllowed = this.doorUnlocked && inDoorwayX ? -this.roomBounds.halfZ - 2.2 : -this.roomBounds.halfZ;
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -this.roomBounds.halfX, this.roomBounds.halfX);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, minZAllowed, this.roomBounds.halfZ);

    // Apply camera transform
    camera.position.copy(this.playerPos);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.playerYaw;
    camera.rotation.x = this.playerPitch;

    // 4. Update Carried Object position in front of camera
    const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
    if (this.carriedBody) {
      const holdPos = this.playerPos.clone().addScaledVector(lookDir, 2.0);
      holdPos.y = Math.max(0.55, holdPos.y - 0.15);
      holdPos.x = THREE.MathUtils.clamp(holdPos.x, -this.roomBounds.halfX + 0.4, this.roomBounds.halfX - 0.4);
      holdPos.z = THREE.MathUtils.clamp(holdPos.z, -this.roomBounds.halfZ + 0.4, this.roomBounds.halfZ - 0.4);
      this.carriedBody.position.lerp(holdPos, 1 - Math.exp(-18 * clampedDt));
      this.carriedBody.velocity.set(0, 0, 0);
    }

    // 5. Simulate Dynamic Physics Bodies
    this.stepDynamicBodies(clampedDt);

    // 6. Room-Specific Puzzle Logic
    if (this.currentRoomId === 1) this.updateRoom1();
    else if (this.currentRoomId === 2) this.updateRoom2(clampedDt);
    else if (this.currentRoomId === 4) this.updateRoom4(clampedDt);
    else if (this.currentRoomId === 5) this.updateRoom5(clampedDt);

    // 7. Animate Exit Door leaves
    if (this.doorHandle) {
      const targetOpen = this.doorUnlocked ? 1 : 0;
      this.doorHandle.openProgress = THREE.MathUtils.damp(this.doorHandle.openProgress, targetOpen, 4.5, clampedDt);
      const slide = this.doorHandle.openProgress * 1.18;
      this.doorHandle.leftLeaf.position.x = -0.56 - slide;
      this.doorHandle.rightLeaf.position.x = 0.56 + slide;
    }

    // Check if player walked through unlocked Exit Door
    if (
      this.doorUnlocked &&
      !this.hasExited &&
      this.playerPos.z <= this.doorPos.z + 0.45 &&
      Math.abs(this.playerPos.x - this.doorPos.x) < 1.35
    ) {
      if (this.currentRoomId === 5) {
        this.escaping = true;
        this.escapeTimer = 0;
        soundEngine.playVictory();
        this.spawnBurst(this.doorPos.clone().setY(1.8), 0x10b981, 80);
      } else {
        this.hasExited = true;
        this.callbacks.onRoomExited();
      }
    }

    this.updateParticles(clampedDt);
    this.emitTelemetry(camera, pointerLocked);
  }

  private stepDynamicBodies(dt: number) {
    const activeG = this.currentRoomId === 1 ? this.r1Gravity : -9.8;

    for (const b of this.dynamicBodies) {
      if (b.isCarried) continue;

      // Apply gravity
      b.velocity.y += activeG * dt;

      // Integrate
      b.position.addScaledVector(b.velocity, dt);

      // Floor / Support collision
      const halfH = b.shape === 'sphere' ? b.radius : b.halfExtents.y;
      const support = getSupportHeightAt(b.position.x, b.position.z, b.position.y - halfH, this.colliders);

      if (b.position.y - halfH <= support.y) {
        b.position.y = support.y + halfH;
        if (b.velocity.y < -1.4) {
          soundEngine.playDrop(Math.min(1.5, Math.abs(b.velocity.y) / 6));
          b.velocity.y = -b.velocity.y * b.restitution;
        } else {
          b.velocity.y = 0;
        }
        b.onGround = true;

        // Kinetic friction deceleration f_k = mu * g
        const mu = support.friction;
        const speedXZ = Math.hypot(b.velocity.x, b.velocity.z);
        if (speedXZ > 0.01) {
          const decel = mu * Math.abs(activeG) * dt;
          const nextSpeed = Math.max(0, speedXZ - decel);
          const scale = nextSpeed / speedXZ;
          b.velocity.x *= scale;
          b.velocity.z *= scale;
        } else {
          b.velocity.x = 0;
          b.velocity.z = 0;
        }
      } else {
        b.onGround = false;
        // Slight air drag
        b.velocity.x *= 1 - 0.08 * dt;
        b.velocity.z *= 1 - 0.08 * dt;
      }

      // Ceiling collision
      if (b.position.y + halfH >= this.roomBounds.height) {
        b.position.y = this.roomBounds.height - halfH;
        if (b.velocity.y > 0) b.velocity.y = -b.velocity.y * b.restitution;
      }

      // Wall boundaries
      const radXZ = b.shape === 'sphere' ? b.radius : b.halfExtents.x;
      if (b.position.x - radXZ < -this.roomBounds.halfX) {
        b.position.x = -this.roomBounds.halfX + radXZ;
        b.velocity.x = Math.abs(b.velocity.x) * b.restitution;
      } else if (b.position.x + radXZ > this.roomBounds.halfX) {
        b.position.x = this.roomBounds.halfX - radXZ;
        b.velocity.x = -Math.abs(b.velocity.x) * b.restitution;
      }

      if (b.position.z - radXZ < -this.roomBounds.halfZ) {
        b.position.z = -this.roomBounds.halfZ + radXZ;
        b.velocity.z = Math.abs(b.velocity.z) * b.restitution;
      } else if (b.position.z + radXZ > this.roomBounds.halfZ) {
        b.position.z = this.roomBounds.halfZ - radXZ;
        b.velocity.z = -Math.abs(b.velocity.z) * b.restitution;
      }
    }
  }

  private updateRoom1() {
    const heavy = this.dynamicBodies.find((b) => b.id === 'heavy_ball');
    const light = this.dynamicBodies.find((b) => b.id === 'light_ball');

    // Check Floor Weight Plate at (3.6, 0, -6.2) requiring >= 50 N
    if (!this.r1Lock1) {
      for (const b of [heavy, light]) {
        if (!b || b.isCarried) continue;
        const distXZ = Math.hypot(b.position.x - 3.6, b.position.z - -6.2);
        const weightN = this.r1Gravity < 0 ? computeWeightForce(b.mass, this.r1Gravity) : 0;
        if (distXZ < 1.0 && b.position.y < 1.0 && weightN >= 50) {
          this.r1Lock1 = true;
          if (this.r1PlatePad) {
            this.r1PlatePad.coreMat.color.setHex(0x10b981);
            this.r1PlatePad.coreMat.emissive.setHex(0x10b981);
          }
          soundEngine.playSwitchActivate();
          this.spawnBurst(new THREE.Vector3(3.6, 0.4, -6.2), 0x10b981, 30);
          this.awardMilestone('r1_lock1', 150);
        }
      }
    }

    // Check Ceiling Kinetic Switch at (-3.6, 6.8, -4.5)
    if (!this.r1Lock2) {
      for (const b of [light, heavy]) {
        if (!b || b.isCarried) continue;
        const dist = b.position.distanceTo(new THREE.Vector3(-3.6, 6.6, -4.5));
        if (dist < 1.55 || (this.r1Gravity > 0 && b.position.y > 5.8 && Math.hypot(b.position.x - -3.6, b.position.z - -4.5) < 2.2)) {
          this.r1Lock2 = true;
          if (this.r1CeilingMat) {
            this.r1CeilingMat.color.setHex(0x10b981);
            this.r1CeilingMat.emissive.setHex(0x10b981);
          }
          soundEngine.playSwitchActivate();
          this.spawnBurst(new THREE.Vector3(-3.6, 6.5, -4.5), 0x10b981, 35);
          this.awardMilestone('r1_lock2', 150);
        }
      }
    }

    if (this.r1Lock1 && this.r1Lock2 && !this.doorUnlocked) {
      this.unlockDoor();
    }
  }

  private updateRoom2(dt: number) {
    if (this.r2ForceArrow && this.r2ForceArrowTimer > 0) {
      this.r2ForceArrowTimer -= dt;
      if (this.r2ForceArrowTimer <= 0) this.r2ForceArrow.visible = false;
    }

    const light = this.dynamicBodies.find((b) => b.id === 'light_crate');
    const heavy = this.dynamicBodies.find((b) => b.id === 'heavy_crate');

    if (light && !this.r2PadA) {
      if (Math.hypot(light.position.x - -4.5, light.position.z - -6.2) < 1.25 && light.position.y > 0.7) {
        this.r2PadA = true;
        if (this.r2PadAMat) {
          this.r2PadAMat.color.setHex(0x10b981);
          this.r2PadAMat.emissive.setHex(0x10b981);
        }
        soundEngine.playSwitchActivate();
        this.spawnBurst(new THREE.Vector3(-4.5, 1.2, -6.2), 0x10b981, 30);
        this.awardMilestone('r2_padA', 150);
      }
    }

    if (heavy && !this.r2PadB) {
      if (Math.hypot(heavy.position.x - 0, heavy.position.z - -6.2) < 1.25) {
        this.r2PadB = true;
        if (this.r2PadBMat) {
          this.r2PadBMat.color.setHex(0x10b981);
          this.r2PadBMat.emissive.setHex(0x10b981);
        }
        soundEngine.playSwitchActivate();
        this.spawnBurst(new THREE.Vector3(0, 0.6, -6.2), 0x10b981, 30);
        this.awardMilestone('r2_padB', 150);
      }
    }

    if (this.r2PadA && this.r2PadB && !this.doorUnlocked) {
      this.unlockDoor();
    }
  }

  private updateRoom4(dt: number) {
    const iron = this.dynamicBodies.find((b) => b.id === 'iron_core');
    const slider = this.dynamicBodies.find((b) => b.id === 'mag_slider');
    const cube = this.dynamicBodies.find((b) => b.id === 'portable_magnet');

    // Electromagnet Coil A attraction on Iron Core
    if (iron && this.r4CoilOn) {
      const targetZ = -4.4;
      const dz = targetZ - iron.position.z;
      if (Math.abs(dz) > 0.08) {
        const pullAccel = Math.sign(dz) * Math.min(9.5, 16 / Math.max(1.2, Math.abs(dz)));
        iron.velocity.z += pullAccel * dt;
      }
    }

    // Iron Core lock check
    if (iron && !this.r4Lock1) {
      if (Math.hypot(iron.position.x - -4.5, iron.position.z - -4.4) < 0.85) {
        this.r4Lock1 = true;
        if (this.r4Pad1Mat) {
          this.r4Pad1Mat.color.setHex(0x10b981);
          this.r4Pad1Mat.emissive.setHex(0x10b981);
        }
        soundEngine.playSwitchActivate();
        this.spawnBurst(new THREE.Vector3(-4.5, 0.5, -4.4), 0x10b981, 30);
        this.awardMilestone('r4_lock1', 150);
      }
    }

    // Magnetic Dipole interaction between Portable Magnet Cube and Polarized Slider
    if (slider && cube) {
      const dx = slider.position.x - cube.position.x;
      const dz = slider.position.z - cube.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4.5 && dist > 0.45) {
        // Slider has North (+Z) and South (-Z).
        // If cube is behind slider (cube.z > slider.z) with North facing: N-N repels slider toward -Z (Socket 2)!
        // If cube is in front of slider (cube.z < slider.z) with South facing: S-N attracts slider toward -Z (Socket 2)!
        const cubeBehind = cube.position.z > slider.position.z;
        const magStrength = 18 / (dist * dist + 0.5);
        let dirZ = 0;
        if (cubeBehind) {
          dirZ = this.r4CubePolarity === 'N' ? -1 : 1;
        } else {
          dirZ = this.r4CubePolarity === 'S' ? -1 : 1;
        }
        slider.velocity.z += dirZ * magStrength * dt;
        slider.position.x = THREE.MathUtils.damp(slider.position.x, 4.5, 10, dt);
      }
    }

    if (slider && !this.r4Lock2) {
      if (Math.hypot(slider.position.x - 4.5, slider.position.z - -5.2) < 0.9) {
        this.r4Lock2 = true;
        if (this.r4Pad2Mat) {
          this.r4Pad2Mat.color.setHex(0x10b981);
          this.r4Pad2Mat.emissive.setHex(0x10b981);
        }
        soundEngine.playSwitchActivate();
        this.spawnBurst(new THREE.Vector3(4.5, 0.5, -5.2), 0x10b981, 30);
        this.awardMilestone('r4_lock2', 150);
      }
    }

    if (this.r4Lock1 && this.r4Lock2 && !this.doorUnlocked) {
      this.unlockDoor();
    }
  }

  private updateRoom5(dt: number) {
    if (this.r5Generator) {
      this.r5Generator.rotor.rotation.x += this.r5GeneratorSpin * dt;
    }

    if (!this.r5BallActive || !this.r5BallMesh) return;

    const heights = [2.0, 5.0, 8.0];
    const startH = heights[this.r5DropHeightIndex];

    // Parametric progression along X from -7.5 to +6.2
    const speedFactor = Math.max(0.14, Math.sqrt(Math.max(0, this.r5TotalEnergy)) / 42);
    this.r5BallS += speedFactor * dt;

    const x = THREE.MathUtils.lerp(-7.5, 6.2, Math.min(1, this.r5BallS));
    let y = 0.55;

    if (x < -2.5) {
      // Down chute (-7.5 -> -2.5)
      const t = (x - -7.5) / 5.0;
      y = THREE.MathUtils.lerp(startH, 0.65, t * (2 - t));
    } else if (x < 1.5) {
      // Bridge Ramp 1
      if (!this.r5Ramp1Aligned) {
        // Falls off misaligned bridge!
        this.r5BallActive = false;
        this.r5BallMesh.position.set(-7.5, startH, -2.5);
        this.r5StatusMsg = 'Bridge Ramp 1 is misaligned — Sphere fell off track!';
        soundEngine.playError();
        return;
      }
      y = 0.65;
    } else {
      // Boost Ramp 2 up to Generator (+1.5 -> +6.2)
      if (!this.r5Ramp2Aligned) {
        this.r5BallActive = false;
        this.r5BallMesh.position.set(-7.5, startH, -2.5);
        this.r5StatusMsg = 'Boost Ramp 2 is misaligned — Cannot reach Generator funnel!';
        soundEngine.playError();
        return;
      }
      const t = (x - 1.5) / 4.7;
      y = THREE.MathUtils.lerp(0.65, 2.05, t);
    }

    this.r5BallMesh.position.set(x, y, -2.5);
    this.r5BallMesh.rotation.z -= dt * 8;

    this.r5CurrentPE = computePotentialEnergy(5, 9.8, y);
    this.r5CurrentKE = Math.max(0, this.r5TotalEnergy - this.r5CurrentPE);
    this.r5BallSpeed = Math.sqrt((2 * this.r5CurrentKE) / 5);

    if (this.r5BallS >= 1) {
      this.r5BallActive = false;
      if (this.r5TotalEnergy >= 340) {
        // Success!
        this.r5GeneratorSpin = 14.0;
        if (this.r5Generator) {
          this.r5Generator.ringMat.color.setHex(0x10b981);
          this.r5Generator.ringMat.emissive.setHex(0x10b981);
        }
        this.r5StatusMsg = `Generator Energized (${Math.round(this.r5TotalEnergy)} J >= 340 J)! Escape Portal Open!`;
        this.spawnBurst(new THREE.Vector3(6.8, 1.8, -2.5), 0x10b981, 60);
        this.awardMilestone('r5_generator', 400);
        this.unlockDoor();
      } else {
        // Insufficient energy!
        this.r5BallMesh.position.set(-7.5, startH, -2.5);
        this.r5StatusMsg = `Only ${Math.round(this.r5TotalEnergy)} J delivered (< 340 J required)! Increase Tower Height!`;
        soundEngine.playError();
      }
    }
  }

  private unlockDoor() {
    if (this.doorUnlocked) return;
    this.doorUnlocked = true;
    if (this.doorHandle) {
      this.doorHandle.statusLightMat.color.setHex(0x10b981);
      this.doorHandle.statusLightMat.emissive.setHex(0x10b981);
    }
    soundEngine.playDoorUnlock();
    this.spawnBurst(this.doorPos.clone().setY(2.0), 0x10b981, 40);
    this.callbacks.onDoorUnlocked();
  }

  private awardMilestone(key: string, points: number) {
    if (this.scoredMilestones.has(key)) return;
    this.scoredMilestones.add(key);
    this.callbacks.onPuzzleStepScore(points);
  }

  private spawnBurst(origin: THREE.Vector3, colorHex: number, count: number) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;
      velocities[i * 3] = (Math.random() - 0.5) * 6;
      velocities[i * 3 + 1] = Math.random() * 5 + 1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.14,
      transparent: true,
      opacity: 1,
    });
    const pts = new THREE.Points(geo, mat);
    this.roomGroup.add(pts);
    this.particles.push({ points: pts, velocities, age: 0, maxAge: 1.4 });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.points.geometry.dispose();
        (p.points.material as THREE.Material).dispose();
        this.roomGroup.remove(p.points);
        this.particles.splice(i, 1);
        continue;
      }
      const attr = p.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let j = 0; j < arr.length / 3; j++) {
        p.velocities[j * 3 + 1] -= 6.5 * dt;
        arr[j * 3] += p.velocities[j * 3] * dt;
        arr[j * 3 + 1] += p.velocities[j * 3 + 1] * dt;
        arr[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
      }
      attr.needsUpdate = true;
      (p.points.material as THREE.PointsMaterial).opacity = 1 - p.age / p.maxAge;
    }
  }

  // ==================== RAYCAST TARGETING & TELEMETRY ====================
  public findTargetedInteractive(camera: THREE.PerspectiveCamera): InteractiveTarget | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 5.5;

    const objects: THREE.Object3D[] = [];
    this.interactives.forEach((it) => objects.push(it.object));
    this.dynamicBodies.forEach((b) => {
      if ((b.pickable || b.pushable) && !b.isCarried) objects.push(b.mesh);
    });

    const hits = raycaster.intersectObjects(objects, true);
    if (hits.length === 0) return null;

    let hitObj: THREE.Object3D | null = hits[0].object;
    while (hitObj) {
      const interactiveMatch = this.interactives.find((it) => it.object === hitObj);
      if (interactiveMatch) return interactiveMatch;

      const bodyMatch = this.dynamicBodies.find((b) => b.mesh === hitObj);
      if (bodyMatch) {
        return {
          id: bodyMatch.id,
          object: bodyMatch.mesh,
          label: bodyMatch.pickable
            ? `Pick Up ${bodyMatch.name}`
            : `Push ${bodyMatch.name}`,
          formulaHint:
            this.currentRoomId === 1
              ? `F = ${bodyMatch.mass} kg × ${Math.abs(this.r1Gravity).toFixed(1)} = ${(bodyMatch.mass * Math.abs(this.r1Gravity)).toFixed(1)} N`
              : this.currentRoomId === 2
              ? `m = ${bodyMatch.mass} kg | a = F_net / m`
              : undefined,
          onInteract: () => {},
        };
      }
      hitObj = hitObj.parent;
    }
    return null;
  }

  private emitTelemetry(camera: THREE.PerspectiveCamera, pointerLocked: boolean) {
    const target = this.findTargetedInteractive(camera);
    let objectiveText = '';
    let progressPercent = 0;
    let formulaLabel = '';
    let formulaLiveValue = '';
    let roomSpecificStatus = '';

    if (this.currentRoomId === 1) {
      const locks = (this.r1Lock1 ? 1 : 0) + (this.r1Lock2 ? 1 : 0);
      progressPercent = Math.round((locks / 2) * 100);
      objectiveText = this.doorUnlocked
        ? 'Exit Door Unlocked — Walk through the door!'
        : `Activate Floor Plate (${this.r1Lock1 ? 'OK' : 'Need ≥50 N'}) & Ceiling Switch (${this.r1Lock2 ? 'OK' : 'Pending'})`;
      formulaLabel = 'F = m · g';
      const activeMass = this.carriedBody ? this.carriedBody.mass : 8;
      formulaLiveValue = `g = ${this.r1Gravity.toFixed(1)} m/s² | F(${activeMass}kg) = ${(activeMass * Math.abs(this.r1Gravity)).toFixed(1)} N`;
      roomSpecificStatus = `Locks: ${locks}/2`;
    } else if (this.currentRoomId === 2) {
      const pads = (this.r2PadA ? 1 : 0) + (this.r2PadB ? 1 : 0);
      progressPercent = Math.round((pads / 2) * 100);
      const forces = [60, 180, 360];
      objectiveText = this.doorUnlocked
        ? 'Exit Door Unlocked — Walk through the door!'
        : `Move 5 kg Crate to Pad A (${this.r2PadA ? 'OK' : 'Pending'}) & 20 kg Crate to Pad B (${this.r2PadB ? 'OK' : 'Pending'})`;
      formulaLabel = 'F_net = m · a';
      formulaLiveValue = `Selected Thrust: ${forces[this.r2ForceLevelIndex]} N · ${this.r2LastAccelText}`;
      roomSpecificStatus = `Pads: ${pads}/2`;
    } else if (this.currentRoomId === 3) {
      progressPercent = this.r3Solved ? 100 : 25;
      objectiveText = this.doorUnlocked
        ? 'Receiver Energized — Walk through the Exit Door!'
        : 'Align Mirrors & Glass Prism so the laser strikes the Receiver';
      formulaLabel = 'θ_i = θ_r | n₁sinθ₁ = n₂sinθ₂';
      formulaLiveValue = this.r3Status;
      roomSpecificStatus = this.r3Solved ? 'Beam Locked' : 'Aligning Optics';
    } else if (this.currentRoomId === 4) {
      const locks = (this.r4Lock1 ? 1 : 0) + (this.r4Lock2 ? 1 : 0);
      progressPercent = Math.round((locks / 2) * 100);
      objectiveText = this.doorUnlocked
        ? 'Magnetic Locks Engaged — Exit Door Unlocked!'
        : `Iron Core Pad (${this.r4Lock1 ? 'OK' : 'Coil A'}) & Polarized Slider (${this.r4Lock2 ? 'OK' : 'Use Magnet'})`;
      formulaLabel = 'N↔S Attract | N↔N Repel';
      formulaLiveValue = `Coil A: ${this.r4CoilOn ? 'ON' : 'OFF'} · Cube Facing Pole: ${this.r4CubePolarity === 'N' ? 'North (Red)' : 'South (Blue)'}`;
      roomSpecificStatus = `Locks: ${locks}/2`;
    } else if (this.currentRoomId === 5) {
      progressPercent = this.doorUnlocked ? 100 : (this.r5Ramp1Aligned ? 35 : 0) + (this.r5Ramp2Aligned ? 35 : 0);
      objectiveText = this.doorUnlocked
        ? 'Generator Powered — Enter the Escape Portal!'
        : 'Align Ramp 1 & 2, set Height to 8 m, and Launch Sphere (≥ 340 J)';
      formulaLabel = 'PE = mgh | KE = ½mv²';
      formulaLiveValue = `PE: ${Math.round(this.r5CurrentPE)} J | KE: ${Math.round(this.r5CurrentKE)} J | v: ${this.r5BallSpeed.toFixed(1)} m/s`;
      roomSpecificStatus = this.r5StatusMsg;
    }

    this.callbacks.onTelemetry({
      objectiveText,
      progressPercent,
      formulaLabel,
      formulaLiveValue,
      targetPrompt: target
        ? `${target.label}${target.formulaHint ? ` (${target.formulaHint})` : ''}`
        : this.carriedBody
        ? `Click or Press E to Drop ${this.carriedBody.name}`
        : null,
      isCarrying: Boolean(this.carriedBody),
      carriedName: this.carriedBody ? this.carriedBody.name : null,
      doorUnlocked: this.doorUnlocked,
      roomSpecificStatus,
      pointerLocked,
    });
  }
}
