// src/main.ts

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import { createPinia } from 'pinia'

import * as SuperTokens from "supertokens-web-js";
import * as Session from "supertokens-web-js/recipe/session";

// import SuperTokens from 'supertokens-web-js';
// import Session from 'supertokens-web-js/recipe/session';
// import ThirdPartyPasswordless from 'supertokens-web-js/recipe/thirdpartypasswordless'

// SuperTokens.init({
//     appInfo: {
//         apiDomain: "http://localhost:8080",
//         apiBasePath: "/auth",
//         appName: "...",
//     },
//     recipeList: [
//         Session.init(),
//         ThirdPartyPasswordless.init(),
//     ],
// });

SuperTokens.init({
    appInfo: {
        appName: "SuperTokens Demo",
        apiDomain: "http://localhost:3001",
    },
    recipeList: [Session.init()],
});


// // An application instance won't render anything until its .mount() method is called
const app = createApp(App);

app.use(createPinia());
app.use(VueCookieNext);
app.use(VueGtag, {
  property: { id: "G-XP9X9LHTDV" },
  isEnabled: false,
});

app.mount('#app');

  