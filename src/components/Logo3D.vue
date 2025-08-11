<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const mouseX = ref(0)
const mouseY = ref(0)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let model: THREE.Group | null = null
let spotLight: THREE.SpotLight
let frontLight: THREE.DirectionalLight
let animationId: number

const initThreeJS = () => {
  if (!canvasRef.value) return

  // Scene
  scene = new THREE.Scene()
  
  // Camera
  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
  camera.position.z = 5 // Moved camera back to accommodate larger model

  // Renderer
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvasRef.value, 
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  })
  renderer.setSize(100, 100)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
  scene.add(ambientLight)
  
  // Create spotlight that follows mouse
  spotLight = new THREE.SpotLight(0xffffff, 100, 100, Math.PI / 4, 0.5, 2)
  spotLight.position.set(0, 0, 10)
  spotLight.target.position.set(0, 0, 0)
  scene.add(spotLight)
  scene.add(spotLight.target)
  
  // Add bright front-facing directional light
  frontLight = new THREE.DirectionalLight(0xffffff, 15)
  frontLight.position.set(0, 0, 10)
  scene.add(frontLight)

  // Load GLB model
  const loader = new GLTFLoader()
  loader.load('/sample.glb', (gltf) => {
    model = gltf.scene
    model.scale.setScalar(5.5) // Scale set to 5.5
    scene.add(model)
  }, undefined, (error) => {
    console.error('Error loading GLB model:', error)
  })

  // Animation loop
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    
    if (model) {
      // Apply mouse-based rotation
      model.rotation.y = mouseX.value * 0.3
      model.rotation.x = mouseY.value * 0.2
      
      // Move spotlight to mouse position
      const lightDistance = 8
      spotLight.position.set(
        mouseX.value * lightDistance, 
        mouseY.value * lightDistance, 
        10
      )
      spotLight.target.position.copy(model.position)
    }
    
    renderer.render(scene, camera)
  }
  animate()
}

const updateMousePosition = (event: MouseEvent) => {
  if (!canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  const deltaX = event.clientX - centerX
  const deltaY = event.clientY - centerY
  
  const maxDistance = 200
  mouseX.value = Math.max(-1, Math.min(1, deltaX / maxDistance))
  mouseY.value = Math.max(-1, Math.min(1, deltaY / maxDistance))
}

onMounted(() => {
  initThreeJS()
  document.addEventListener('mousemove', updateMousePosition)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', updateMousePosition)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<template>
  <canvas 
    ref="canvasRef" 
    class="logo-3d"
  />
</template>

<style scoped>
.logo-3d {
  width: 100px;
  height: 100px;
  margin-right: 10px;
  cursor: pointer;
}
</style>