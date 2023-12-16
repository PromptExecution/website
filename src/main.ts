// src/main.ts

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import { createPinia } from 'pinia'

// // An application instance won't render anything until its .mount() method is called
const app = createApp(App);

app.use(createPinia());

app.use(VueCookieNext);

// app.use(VueGtag, {
//     config: { 
//       id: "G-XP9X9LHTDV",
//       params: {
//         anonymize_ip: true
//       }
//     },
//     enabled: false
//   })
//   .provide('gtag', app.config.globalProperties.$gtag);

app.use(VueGtag, {
  property: { id: "G-XP9X9LHTDV" },
  isEnabled: false,
});

app.mount('#app');

  