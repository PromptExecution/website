import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// ts-ignore
import glsl from 'vue-glsl'

// An application instance won't render anything until its .mount() method is called
createApp(App)
.use(glsl)
.mount('#app')
