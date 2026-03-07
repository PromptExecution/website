<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';

type BackgroundMode = 'circuit' | 'legacy';

// Keep the legacy background path available for special occasions.
const BACKGROUND_MODE: BackgroundMode = 'circuit';
const canvasRef = ref<HTMLCanvasElement | null>(null);

interface PathSampler {
  points: THREE.Vector3[];
  cumulative: number[];
  totalLength: number;
}

interface PulseMarker {
  core: THREE.Mesh;
  aura: THREE.Mesh;
  phase: number;
}

interface CircuitLine {
  group: THREE.Group;
  segments: THREE.Mesh[];
  joints: THREE.Mesh[];
  material: THREE.MeshBasicMaterial;
  baseColor: THREE.Color;
  sampler: PathSampler;
  pulses: PulseMarker[];
  speedFactor: number;
  depthOffset: number;
  baseThickness: number;
}

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let animationId = 0;
let centerHole: THREE.Mesh | null = null;
let centerRing: THREE.Mesh | null = null;
let centerHalo: THREE.Mesh | null = null;
let legacyStars: THREE.Points | null = null;

const circuits: CircuitLine[] = [];
const pointerParallax = new THREE.Vector2(0, 0);
const pointerTarget = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();
const FLOW_SPEED_START = 11.5;
const FLOW_ACCEL_PER_SECOND = 0.018;
const FLOW_SPEED_MAX = 15.5;
const FLOW_DEPTH_SPAN = 320;
const FLOW_NEAR_LIMIT = 48;
const PULSE_SPEED_BASE = 0.032;
const PULSE_SPEED_FLOW_GAIN = 0.0022;

const PIPE_AXIS = new THREE.Vector3(0, 1, 0);
const cameraToGroup = new THREE.Vector3();
const colorNear = new THREE.Color(0xc8ffff);
const focalPoint = new THREE.Vector3(0, 0, 0);
const focalTarget = new THREE.Vector3(0, 0, 0);
let flowTravel = 0;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickAxis(exclude: number) {
  const axes = [0, 1, 2].filter((axis) => axis !== exclude);
  return axes[Math.floor(Math.random() * axes.length)];
}

function pushPoint(points: THREE.Vector3[], point: THREE.Vector3) {
  const previous = points[points.length - 1];
  if (!previous || previous.distanceToSquared(point) > 1e-6) {
    points.push(point);
  }
}

function randomShellPosition(radius: number) {
  const point = new THREE.Vector3(
    rand(-radius, radius),
    rand(-radius, radius),
    rand(-radius, radius),
  );
  const dominantAxis = Math.floor(Math.random() * 3);
  const direction = Math.random() > 0.5 ? 1 : -1;
  if (dominantAxis === 0) point.x = direction * radius;
  if (dominantAxis === 1) point.y = direction * radius;
  if (dominantAxis === 2) point.z = direction * radius;
  return point;
}

function createOrthogonalPath() {
  const points: THREE.Vector3[] = [];
  const current = randomShellPosition(rand(55, 90));
  pushPoint(points, current.clone());

  let previousAxis = -1;
  const segmentCount = Math.floor(rand(8, 15));

  for (let i = 0; i < segmentCount; i += 1) {
    const axis = pickAxis(previousAxis);
    previousAxis = axis;

    const next = current.clone();
    const axisValue = axis === 0 ? current.x : axis === 1 ? current.y : current.z;
    const towardCenter = Math.sign(-axisValue) || (Math.random() > 0.5 ? 1 : -1);
    const maxStep = Math.max(6, Math.abs(axisValue) * 0.85);
    const step = Math.min(rand(6, 15), maxStep);

    if (axis === 0) next.x += towardCenter * step;
    if (axis === 1) next.y += towardCenter * step;
    if (axis === 2) next.z += towardCenter * step;

    next.x = THREE.MathUtils.clamp(next.x, -95, 95);
    next.y = THREE.MathUtils.clamp(next.y, -95, 95);
    next.z = THREE.MathUtils.clamp(next.z, -95, 95);

    current.copy(next);
    pushPoint(points, current.clone());
  }

  const axes = (['x', 'y', 'z'] as Array<'x' | 'y' | 'z'>).sort(() => Math.random() - 0.5);
  for (const axis of axes) {
    if (Math.abs(current[axis]) <= 1) continue;
    const next = current.clone();
    next[axis] = 0;
    current.copy(next);
    pushPoint(points, current.clone());
  }

  pushPoint(points, new THREE.Vector3(0, 0, 0));
  return points;
}

function createSampler(points: THREE.Vector3[]): PathSampler {
  const cumulative: number[] = [0];
  let totalLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalLength += points[i - 1].distanceTo(points[i]);
    cumulative.push(totalLength);
  }
  return { points, cumulative, totalLength };
}

function samplePath(sampler: PathSampler, t: number) {
  const target = THREE.MathUtils.clamp(t, 0, 1) * sampler.totalLength;
  for (let i = 1; i < sampler.cumulative.length; i += 1) {
    const start = sampler.cumulative[i - 1];
    const end = sampler.cumulative[i];
    if (target <= end) {
      const segmentLength = end - start || 1;
      const alpha = (target - start) / segmentLength;
      return sampler.points[i - 1].clone().lerp(sampler.points[i], alpha);
    }
  }
  return sampler.points[sampler.points.length - 1].clone();
}

function createPipeSegment(start: THREE.Vector3, end: THREE.Vector3, material: THREE.MeshBasicMaterial, baseThickness: number) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length <= 0.001) return null;

  const geometry = new THREE.CylinderGeometry(1, 1, length, 12, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(PIPE_AXIS, direction.normalize());
  mesh.scale.set(baseThickness, 1, baseThickness);
  return mesh;
}

function addCenterHole() {
  if (!scene) return;

  centerHole = new THREE.Mesh(
    new THREE.SphereGeometry(8, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x020206 }),
  );
  scene.add(centerHole);

  centerRing = new THREE.Mesh(
    new THREE.RingGeometry(9.2, 12.4, 80),
    new THREE.MeshBasicMaterial({
      color: 0x0f2a35,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  centerRing.rotation.x = Math.PI / 2;
  scene.add(centerRing);

  centerHalo = new THREE.Mesh(
    new THREE.SphereGeometry(13.5, 36, 36),
    new THREE.MeshBasicMaterial({
      color: 0x0a2734,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(centerHalo);
}

function createCircuitFlow() {
  if (!scene) return;

  for (let i = 0; i < 42; i += 1) {
    const pathPoints = createOrthogonalPath();
    const sampler = createSampler(pathPoints);
    const group = new THREE.Group();
    const hue = rand(0.51, 0.57);
    const baseColor = new THREE.Color().setHSL(hue, rand(0.78, 0.94), rand(0.5, 0.62));
    const material = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const baseThickness = rand(0.08, 0.14);
    const segments: THREE.Mesh[] = [];
    const joints: THREE.Mesh[] = [];
    for (let j = 1; j < pathPoints.length; j += 1) {
      const segment = createPipeSegment(pathPoints[j - 1], pathPoints[j], material, baseThickness);
      if (!segment) continue;
      group.add(segment);
      segments.push(segment);
    }
    for (let j = 1; j < pathPoints.length - 1; j += 1) {
      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(1, 14, 12),
        material,
      );
      joint.position.copy(pathPoints[j]);
      joint.scale.setScalar(baseThickness * 1.05);
      group.add(joint);
      joints.push(joint);
    }

    const pulses: PulseMarker[] = [];
    const pulseCount = 2 + Math.floor(Math.random() * 2);

    for (let j = 0; j < pulseCount; j += 1) {
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.2, 0.42), 14, 14),
        new THREE.MeshBasicMaterial({
          color: 0x8ff8ff,
          transparent: true,
          opacity: rand(0.55, 0.82),
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );

      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.55, 1.0), 14, 14),
        new THREE.MeshBasicMaterial({
          color: 0x34b6ff,
          transparent: true,
          opacity: rand(0.16, 0.3),
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );

      group.add(core);
      group.add(aura);
      pulses.push({
        core,
        aura,
        phase: j / pulseCount + Math.random() * 0.12,
      });
    }

    const depthOffset = rand(0, FLOW_DEPTH_SPAN);
    group.position.z = depthOffset - FLOW_DEPTH_SPAN + FLOW_NEAR_LIMIT;
    scene.add(group);

    circuits.push({
      group,
      segments,
      joints,
      material,
      baseColor,
      sampler,
      pulses,
      speedFactor: rand(0.94, 1.08),
      depthOffset,
      baseThickness,
    });
  }

  addCenterHole();
}

function createLegacyBackground() {
  if (!scene) return;

  const starCount = 650;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    positions[i * 3] = rand(-120, 120);
    positions[i * 3 + 1] = rand(-90, 90);
    positions[i * 3 + 2] = rand(-160, 20);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x6f8ba4,
    size: 0.35,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  legacyStars = new THREE.Points(geometry, material);
  scene.add(legacyStars);
}

function animate() {
  if (!scene || !camera || !renderer) return;

  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  const flowSpeed = Math.min(FLOW_SPEED_MAX, FLOW_SPEED_START + elapsed * FLOW_ACCEL_PER_SECOND);
  flowTravel += delta * flowSpeed;

  pointerParallax.lerp(pointerTarget, 0.035);
  focalTarget.set(pointerTarget.x * 30, pointerTarget.y * 18, 0);
  focalPoint.lerp(focalTarget, 0.1);
  camera.position.x = pointerParallax.x * 2.4;
  camera.position.y = pointerParallax.y * 1.8;
  camera.position.z = 72;
  camera.lookAt(focalPoint);

  if (BACKGROUND_MODE === 'circuit') {
    for (const circuit of circuits) {
      const wrappedDepth = (circuit.depthOffset + flowTravel * circuit.speedFactor) % FLOW_DEPTH_SPAN;
      circuit.group.position.x = focalPoint.x;
      circuit.group.position.y = focalPoint.y;
      circuit.group.position.z = wrappedDepth - FLOW_DEPTH_SPAN + FLOW_NEAR_LIMIT;
      circuit.group.updateMatrixWorld();
      cameraToGroup.setFromMatrixPosition(circuit.group.matrixWorld);
      const distanceToCamera = camera.position.distanceTo(cameraToGroup);
      const proximity = THREE.MathUtils.clamp(1 - distanceToCamera / 250, 0, 1);
      const thickness = circuit.baseThickness * (0.86 + proximity * 0.95);

      for (const segment of circuit.segments) {
        segment.scale.x = thickness;
        segment.scale.z = thickness;
      }
      for (const joint of circuit.joints) {
        joint.scale.setScalar(thickness * 1.08);
      }
      circuit.material.opacity = 0.15 + proximity * 0.7;
      circuit.material.color.copy(circuit.baseColor).lerp(colorNear, proximity * 0.75);

      const linePulseSpeed = (PULSE_SPEED_BASE + flowSpeed * PULSE_SPEED_FLOW_GAIN) * circuit.speedFactor;
      for (const pulse of circuit.pulses) {
        let progress = (elapsed * linePulseSpeed + pulse.phase) % 1;
        if (proximity > 0.58) {
          const jumpStep = THREE.MathUtils.lerp(0.028, 0.11, (proximity - 0.58) / 0.42);
          progress = Math.round(progress / jumpStep) * jumpStep;
        }
        const flowT = Math.pow(progress, 0.82);
        const position = samplePath(circuit.sampler, flowT);
        pulse.core.position.copy(position);
        pulse.aura.position.copy(position);

        const distanceFade = Math.max(0.06, 1 - flowT);
        const pulseWave = 0.88 + Math.sin((elapsed + pulse.phase) * 9) * 0.12;
        const coreMaterial = pulse.core.material as THREE.MeshBasicMaterial;
        const auraMaterial = pulse.aura.material as THREE.MeshBasicMaterial;
        coreMaterial.opacity = 0.08 + proximity * 0.42 + distanceFade * 0.46;
        auraMaterial.opacity = 0.04 + proximity * 0.19 + distanceFade * 0.16;
        pulse.core.scale.setScalar((0.76 + proximity * 0.36) * pulseWave);
        pulse.aura.scale.setScalar((0.84 + proximity * 0.38) + pulseWave * 0.22);
      }
    }

    if (centerRing) {
      centerRing.position.copy(focalPoint);
      centerRing.rotation.z += delta * 0.06;
      const ringMaterial = centerRing.material as THREE.MeshBasicMaterial;
      ringMaterial.opacity = 0.3 + Math.sin(elapsed * 1.4) * 0.08;
    }
    if (centerHalo) {
      centerHalo.position.copy(focalPoint);
      const haloMaterial = centerHalo.material as THREE.MeshBasicMaterial;
      haloMaterial.opacity = 0.1 + Math.sin(elapsed * 1.1) * 0.04;
      centerHalo.scale.setScalar(0.98 + Math.sin(elapsed * 0.9) * 0.03);
    }
    if (centerHole) {
      centerHole.position.copy(focalPoint);
    }
  } else if (legacyStars) {
    legacyStars.rotation.y += delta * 0.03;
    legacyStars.rotation.x = Math.sin(elapsed * 0.08) * 0.08;
  }

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

function handleMouseMove(event: MouseEvent) {
  const { innerWidth, innerHeight } = window;
  pointerTarget.x = ((event.clientX / innerWidth) * 2 - 1) * 0.75;
  pointerTarget.y = (-(event.clientY / innerHeight) * 2 + 1) * 0.75;
}

function handleResize() {
  if (!camera || !renderer) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function initScene() {
  if (!canvasRef.value) return;

  flowTravel = 0;
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070b, 0.01);

  camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.set(0, 0, 72);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.AmbientLight(0x5b7791, 0.24));
  const centerLight = new THREE.PointLight(0x1e9dff, 9, 80, 2.3);
  centerLight.position.set(0, 0, 0);
  scene.add(centerLight);

  if (BACKGROUND_MODE === 'circuit') {
    createCircuitFlow();
  } else {
    createLegacyBackground();
  }

  clock.start();
  animate();
}

function disposeScene() {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handleMouseMove);

  for (const circuit of circuits) {
    for (const segment of circuit.segments) {
      segment.geometry.dispose();
    }
    for (const joint of circuit.joints) {
      joint.geometry.dispose();
    }
    circuit.material.dispose();
    for (const pulse of circuit.pulses) {
      pulse.core.geometry.dispose();
      (pulse.core.material as THREE.Material).dispose();
      pulse.aura.geometry.dispose();
      (pulse.aura.material as THREE.Material).dispose();
    }
  }
  circuits.length = 0;

  if (legacyStars) {
    legacyStars.geometry.dispose();
    (legacyStars.material as THREE.Material).dispose();
    legacyStars = null;
  }

  if (centerRing) {
    centerRing.geometry.dispose();
    (centerRing.material as THREE.Material).dispose();
    centerRing = null;
  }
  if (centerHalo) {
    centerHalo.geometry.dispose();
    (centerHalo.material as THREE.Material).dispose();
    centerHalo = null;
  }
  if (centerHole) {
    centerHole.geometry.dispose();
    (centerHole.material as THREE.Material).dispose();
    centerHole = null;
  }

  if (scene) {
    scene.clear();
    scene = null;
  }

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  camera = null;
}

onMounted(() => {
  initScene();
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove, { passive: true });
});

onUnmounted(() => {
  disposeScene();
});
</script>

<template>
  <canvas ref="canvasRef" class="circuit-background" aria-hidden="true" />
</template>

<style scoped>
.circuit-background {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}
</style>
