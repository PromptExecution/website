// src/main.ts

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// https://matteo-gabriele.gitbook.io/vue-gtag/
import VueGtag from "vue-gtag-next";
import { VueCookieNext } from 'vue-cookie-next';
import VueNativeSock from "vue-native-websocket-vue3";

import { useSocketStoreWithOut } from "./store/pinia/useSocketStore";
import { createPinia } from 'pinia'

// 🤓: https://github.com/eladcandroid/v-idle-3
// import Vidle from 'v-idle-3'

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


// apparently use() after mount is 👍🏻
const piniaSocketStore = useSocketStoreWithOut(app);
app.use(VueNativeSock,"ws://fung1.lan:8080",{
    // 启用pinia集成 | enable pinia integration
    // store: myPinia,
    // store: useSocketStoreWithOut,
    store: piniaSocketStore,
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


export default app;
