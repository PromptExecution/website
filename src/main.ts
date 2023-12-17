// src/main.ts

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import { createPinia } from 'pinia'

import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import About from './views/About.vue';


const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/about', name: 'About', component: About }
  ]
});


const app = createApp(App);
app.use(router);
app.use(createPinia());
app.use(VueCookieNext);



// BEFORE:  vue-gtag-next
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

// An application instance won't render anything until its .mount() method is called
app.mount('#app');

