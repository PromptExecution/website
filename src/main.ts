import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import { TroisJSVuePlugin } from 'troisjs';


// An application instance won't render anything until its .mount() method is called
createApp(App)
.use(TroisJSVuePlugin)
.mount('#app')
