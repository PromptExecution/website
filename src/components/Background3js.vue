<!--
  mrdoob/three.js/

  https://www.npmjs.com/package/simplex-noise

-->
<template>
  <Renderer ref="renderer" :pointer="{ onMove: updateTilt }" resize="window">
    <Camera :position="{ y: -20, z: 10 }" :look-at="{ x: 0, y: 0, z: 0 }" />
    <Scene background="#ffffff">
      <AmbientLight />
      <PointLight ref="light" :position="{ y: 0, z: 20 }" />
      <InstancedMesh ref="imesh" :count="NUM_INSTANCES" :position="{ y: 20, z: 10 }">
        <BoxGeometry :size="SIZE" />
        <PhongMaterial vertex-colors />
      </InstancedMesh>
    </Scene>
    <EffectComposer>
      <RenderPass />
      <FXAAPass />
      <TiltShiftPass :blur-radius="10" :gradient-radius="tiltRadius" :start="{ x: 0, y: tiltY }" :end="{ x: 100, y: tiltY }" />
    </EffectComposer>
  </Renderer>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { Renderer, Camera, Scene, AmbientLight, PointLight, InstancedMesh, BoxGeometry, PhongMaterial, EffectComposer, RenderPass, FXAAPass, TiltShiftPass } from 'troisjs';
import { InstancedBufferAttribute, Object3D, InstancedMesh as ThreeInstancedMesh } from 'three';
import { createNoise3D, NoiseFunction3D } from 'simplex-noise';

export default defineComponent({
  setup() {
    const NUM_INSTANCES = ref(625); // NX * NY
    const SIZE = 1.6, NX = 25, NY = 25, PADDING = 1;
    const SIZEP = SIZE + PADDING;
    const W = NX * SIZEP - PADDING;
    const H = NY * SIZEP - PADDING;
    const tiltRadius = ref(100);
    const tiltY = ref(100);
    const renderer = ref<InstanceType<typeof Renderer> | null>(null);
    const imesh = ref<InstanceType<typeof InstancedMesh> | null>(null);

    onMounted(() => {
      console.log('mounted')
      const noise3D = createNoise3D();
      const colors = [];
      for (let i = 0; i < NUM_INSTANCES.value; i++) {
        const c = Math.random();
        colors.push(c, c, c);
      }

      if (imesh.value && renderer.value) {
        const mesh = imesh.value.mesh as ThreeInstancedMesh;
        mesh.geometry.setAttribute('color', new InstancedBufferAttribute(new Float32Array(colors), 3));

        const dummy = new Object3D();
        renderer.value.onBeforeRender(() => {
          updateInstanceMatrix(dummy, W, H, SIZEP, NX, NY, noise3D);
        });
      }
    });


    const updateTilt = () => {
      if (renderer.value && renderer.value.three.pointer) {
        tiltRadius.value = renderer.value.three.size.height / 3;
        tiltY.value = (renderer.value.three.pointer.positionN.y + 1) * 0.5 * renderer.value.three.size.height;
      }
    };

    const updateInstanceMatrix = (dummy: Object3D, W: number, H: number, SIZEP: number, NX: number, NY: number, simplex: NoiseFunction3D) => {
      const x0 = -W / 2 + PADDING;
      const y0 = -H / 2 + PADDING;
      const time = Date.now() * 0.0001;
      const noise = 0.005;
      if (imesh.value && imesh.value.mesh) {
        const mesh = imesh.value.mesh as ThreeInstancedMesh;
        let x, y, nx, ny, rx, ry;
        for (let i = 0; i < NX; i++) {
          for (let j = 0; j < NY; j++) {
            x = x0 + i * SIZEP;
            y = y0 + j * SIZEP;
            nx = x * noise;
            ny = y * noise;
            rx = simplex(nx, ny, time) * Math.PI;
            ry = simplex(ny, nx, time) * Math.PI;
            dummy.position.set(x, y, -10);
            dummy.rotation.set(rx, ry, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(i * NY + j, dummy.matrix);
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    };

    return { renderer, imesh, NUM_INSTANCES, SIZE, NX, NY, PADDING, SIZEP, W, H, tiltRadius, tiltY, updateTilt };
  }
});
</script>

