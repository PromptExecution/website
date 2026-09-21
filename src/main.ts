// src/main.ts

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import VueNativeSock from "vue-native-websocket-vue3";
// @ts-expect-error — vue-web-terminal ships createTerminal but its .d.ts
// references an unresolvable ~/ path; the runtime export is fine.
import { createTerminal } from 'vue-web-terminal';

import { setupStore } from "./store/pinia/store";
import { useSocketStoreWithOut } from "./store/pinia/useSocketStore";

// 🤓: https://github.com/eladcandroid/v-idle-3
// import Vidle from 'v-idle-3'

const app = createApp(App);
/*
app.config.unwrapInjectedRef = true
*/

app.use(VueCookieNext);

app.use(VueGtag, {
  property: { id: "G-XP9X9LHTDV" },
  isEnabled: false,
});

// Register vue-web-terminal — must use createTerminal() so initStore() runs.
// The default export is the component itself (no install method), so
// app.use(defaultExport) silently skips store init, causing
// "The store must be initialized before reading" on every command.
app.use(createTerminal());

// Pinia must always be installed — useMainStore() in App.vue needs it.
setupStore(app);

// Only initialise the socket store and websocket plugin when the env var is set.
// Without this guard, useSocketStoreWithOut() registers a Pinia store that
// reads socket state before the plugin is installed, throwing
// "The store must be initialized before reading" and breaking command execution.
const terminalWebSocketUrl = import.meta.env.VITE_TERMINAL_WS_URL;
if (terminalWebSocketUrl) {
  useSocketStoreWithOut(app);
  app.use(VueNativeSock, terminalWebSocketUrl, {
    // 启用pinia集成 | enable pinia integration
    // store: piniaSocketStore(),
    // 数据发送/接收使用使用json
    format: "json",
    // 开启手动调用 connect() 连接服务器
    connectManually: true,
    // 开启自动重连
    reconnection: true,
    // 尝试重连的次数
    reconnectionAttempts: 5,
    // 重连间隔时间
    reconnectionDelay: 3000
  });
}

app.mount('#app');

export default app;
