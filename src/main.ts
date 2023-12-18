// src/main.ts

import { createApp, reactive } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import { createPinia } from 'pinia'
import router from '@/router'
import AppLink from '@/components/AppLink.vue'

const app = createApp(App);
app.component('AppLink', AppLink);  // globally register
app.use(router);
app.use(createPinia());
app.use(VueCookieNext);

app.use(VueGtag, {
  property: { id: "G-XP9X9LHTDV" },
  isEnabled: false,
});

import { useKindeAuth } from '@/plugins/useKindeAuth';
const { isAuthenticated, login, logout } = useKindeAuth();
app.provide('kindeAuth', { isAuthenticated, login, logout });

// Here you check if the URL contains a code parameter and handle it
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
if (code) {
    // Handle the code, exchange it for tokens
    // This part will depend on how Kinde expects you to send the code back to them
}

// An application instance won't render anything until its .mount() method is called
app.mount('#app');

