// src/main.ts

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import { createPinia } from 'pinia'
import router from '@/router'
import AppLink from '@/components/AppLink.vue'

import * as SuperTokens from "supertokens-web-js";
import * as Session from "supertokens-web-js/recipe/session";

SuperTokens.init({
    appInfo: {
        appName: "SuperTokens Demo",
        apiDomain: "http://localhost:3001",
    },
    recipeList: [Session.init()],
});


// // An application instance won't render anything until its .mount() method is called
const app = createApp(App);
app.component('AppLink', AppLink);  // globally register
app.use(router);
app.use(createPinia());
app.use(VueCookieNext);

app.use(VueGtag, {
  property: { id: "G-XP9X9LHTDV" },
  isEnabled: false,
});

// An application instance won't render anything until its .mount() method is called
app.mount('#app');

