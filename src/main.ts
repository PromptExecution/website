// src/main.ts

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import { createPinia } from 'pinia'


// 🤓: https://github.com/eladcandroid/v-idle-3

const app = createApp(App);
/*
app.config.unwrapInjectedRef = true
*/


app.use(createPinia());
app.use(VueCookieNext);


app.use(VueGtag, {
  property: { id: "G-XP9X9LHTDV" },
  isEnabled: false,
});

app.mount('#app');

