import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag";
import { VueCookieNext } from 'vue-cookie-next';
import { useCookies } from './useCookies'

// An application instance won't render anything until its .mount() method is called
const app = createApp(App);

app
.use(VueCookieNext)
.use(VueGtag, {
    config: { 
      id: "G-XP9X9LHTDV",
      params: {
        anonymize_ip: true
      }
    },
    enabled: false
  })
.provide('gtag', app.config.globalProperties.$gtag)
.mount('#app')
