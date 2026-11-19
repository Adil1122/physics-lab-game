import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GameScreen, GameSettings, LiveTelemetry, RoomId } from '../types/game';
import { RoomController } from '../three/RoomController';
import { soundEngine } from '../audio/soundEngine';

export interface MobileInputState {
  forward: number;
  right: number;
  jump: boolean;
}

export interface ViewportActionsRef {
  interact: () => void;
  drop: () => void;
  lookDelta: (dx: number, dy: number) => void;
  reloadRoom: () => void;
}

interface GameViewportProps {
  screen: GameScreen;
  roomId: RoomId;
  resetCounter: number;
  settings: GameSettings;
  mobileInputRef: React.MutableRefObject<MobileInputState>;
  actionsRef: React.MutableRefObject<ViewportActionsRef | null>;
  onPauseRequest: () => void;
  onHintRequest: () => void;
  onDoorUnlocked: () => void;
  onRoomExited: () => void;
  onPuzzleStepScore: (points: number) => void;
  onTelemetry: (telemetry: LiveTelemetry) => void;
}

export const GameViewport: React.FC<GameViewportProps> = ({
  screen,
  roomId,
  resetCounter,
  settings,
  mobileInputRef,
  actionsRef,
  onPauseRequest,
  onHintRequest,
  onDoorUnlocked,
  onRoomExited,
  onPuzzleStepScore,
  onTelemetry,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<RoomController | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const screenRef = useRef<GameScreen>(screen);
  const settingsRef = useRef<GameSettings>(settings);
  const callbacksRef = useRef({
    onPauseRequest,
    onHintRequest,
    onDoorUnlocked,
    onRoomExited,
    onPuzzleStepScore,
    onTelemetry,
  });

  useEffect(() => {
    screenRef.current = screen;
    if (screen !== 'playing' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [screen]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    callbacksRef.current = {
      onPauseRequest,
      onHintRequest,
      onDoorUnlocked,
      onRoomExited,
      onPuzzleStepScore,
      onTelemetry,
    };
  }, [onPauseRequest, onHintRequest, onDoorUnlocked, onRoomExited, onPuzzleStepScore, onTelemetry]);

  // Mount Three.js WebGLRenderer once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      68,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      120,
    );
    cameraRef.current = camera;

    const controller = new RoomController(scene, renderer, isSoftwareGl, {
      onDoorUnlocked: () => callbacksRef.current.onDoorUnlocked(),
      onRoomExited: () => callbacksRef.current.onRoomExited(),
      onPuzzleStepScore: (pts) => callbacksRef.current.onPuzzleStepScore(pts),
      onTelemetry: (t) => callbacksRef.current.onTelemetry(t),
    });
    controllerRef.current = controller;

    if (screenRef.current === 'menu') {
      controller.loadMenuBackdrop();
    } else {
      controller.loadRoom(roomId);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Input state
    const keys: Record<string, boolean> = {};
    let isDraggingLook = false;
    let dragDistance = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerLocked = false;

    const triggerInteract = () => {
      if (screenRef.current !== 'playing' || !cameraRef.current || !controllerRef.current) return;
      const target = controllerRef.current.findTargetedInteractive(cameraRef.current);
      const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(cameraRef.current.rotation).normalize();
      controllerRef.current.interactWith(target, lookDir);
    };

    actionsRef.current = {
      interact: triggerInteract,
      drop: () => {
        if (!cameraRef.current || !controllerRef.current) return;
        const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(cameraRef.current.rotation).normalize();
        controllerRef.current.dropCarriedBody(lookDir);
      },
      lookDelta: (dx: number, dy: number) => {
        if (!controllerRef.current) return;
        const sens = 0.0024 * settingsRef.current.mouseSensitivity;
        controllerRef.current.playerYaw -= dx * sens;
        controllerRef.current.playerPitch = THREE.MathUtils.clamp(
          controllerRef.current.playerPitch - dy * sens,
          -1.35,
          1.35,
        );
      },
      reloadRoom: () => {
        controllerRef.current?.loadRoom(roomId);
      },
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (screenRef.current !== 'playing') return;

      if (e.code === 'KeyE') {
        e.preventDefault();
        triggerInteract();
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        callbacksRef.current.onHintRequest();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        callbacksRef.current.onPauseRequest();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const canvasEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (screenRef.current !== 'playing') return;
      soundEngine.unlock();

      if (e.button === 0) {
        isDraggingLook = true;
        dragDistance = 0;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        if (!pointerLocked && canvasEl.requestPointerLock) {
          try {
            const p = canvasEl.requestPointerLock() as unknown as Promise<void> | undefined;
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch {
            // Pointer lock optional; drag-look fallback handles look seamlessly
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (screenRef.current !== 'playing' || !controllerRef.current) return;
      const sens = 0.0022 * settingsRef.current.mouseSensitivity;

      if (document.pointerLockElement === canvasEl) {
        controllerRef.current.playerYaw -= e.movementX * sens;
        controllerRef.current.playerPitch = THREE.MathUtils.clamp(
          controllerRef.current.playerPitch - e.movementY * sens,
          -1.35,
          1.35,
        );
      } else if (isDraggingLook) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        dragDistance += Math.hypot(dx, dy);
        controllerRef.current.playerYaw -= dx * sens * 1.3;
        controllerRef.current.playerPitch = THREE.MathUtils.clamp(
          controllerRef.current.playerPitch - dy * sens * 1.3,
          -1.35,
          1.35,
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 0 && screenRef.current === 'playing') {
        // Click interaction if pointer locked OR if short click without large drag
        if (document.pointerLockElement === canvasEl || dragDistance < 8) {
          triggerInteract();
        }
      }
      isDraggingLook = false;
    };

    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === canvasEl;
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('webglcontextlost', onContextLost);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (screenRef.current === 'playing' || screenRef.current === 'menu') {
        const fwd =
          (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) -
          (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) +
          mobileInputRef.current.forward;
        const right =
          (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
          (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) +
          mobileInputRef.current.right;
        const jump = Boolean(keys['Space'] || mobileInputRef.current.jump);

        controller.update(
          dt,
          elapsed,
          {
            forward: THREE.MathUtils.clamp(fwd, -1, 1),
            right: THREE.MathUtils.clamp(right, -1, 1),
            jump,
          },
          camera,
          pointerLocked,
        );
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('webglcontextlost', onContextLost);

      controller.disposeCurrentRoom();
      envTarget.dispose();
      renderer.dispose();
      if (canvasEl.parentElement === container) {
        container.removeChild(canvasEl);
      }
    };
  }, []);

  // Switch between Menu backdrop and Room 1..5
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (screen === 'menu') {
      if (controller.currentRoomId !== 'menu') {
        controller.loadMenuBackdrop();
      }
    } else if (screen === 'playing') {
      controller.loadRoom(roomId);
    }
  }, [roomId, resetCounter, screen === 'menu']);

  return <div ref={mountRef} className="w-full h-full bg-slate-950" />;
};
