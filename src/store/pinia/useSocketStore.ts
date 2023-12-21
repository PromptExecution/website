// src/store/pinia/useSocketStore.ts
import { App } from "vue";
import { defineStore } from "pinia";
import { setupStore } from "@/store/pinia/store";
import { SocketStore } from "@/store/pinia/typeOfSocketStore";

export const useSocketStore = (app: App<Element>) => {
  return defineStore({
    id: "socket",
    state: (): SocketStore => ({
      // 连接状态
      isConnected: false,
      // 消息内容
      message: "",
      // 重新连接错误
      reconnectError: false,
      // 心跳消息发送时间
      heartBeatInterval: 50,
      // 心跳定时器
      heartBeatTimer: 0,

      // where we can push & pop messages
      incomingMessages: [],
      outgoingMessages: [],
    }),
    actions: {
      // Add a method to send a message
      // New method to receive messages from the websocket

      sendMessage(message: string) {
        // Add the message to the outgoing queue
        this.outgoingMessages.push(message);

        // Check if the WebSocket is connected, if not, establish a connection here
        if (!this.isConnected) {
          // Initialize WebSocket and connect here
          // On successful connection, send pending messages
          this.sendPendingMessages();
        }
      },
      // Function to send pending messages
      sendPendingMessages() {
        // Check if there are pending outgoing messages
        if (this.outgoingMessages.length > 0) {
          // Loop through the outgoing messages and send them
          this.outgoingMessages.forEach((message,index) => {
            // Send the message through the WebSocket
            app.config.globalProperties.$socket.sendObj({
              verb: "begin",
              msg: message,
            });

            // Remove the sent message from the outgoingMessages queue
          this.outgoingMessages.splice(index, 1);
          });

        }
      },


      // 连接打开
      SOCKET_ONOPEN(event: any) {
        console.log("successful websocket connection");
        app.config.globalProperties.$socket = event.currentTarget;
        this.isConnected = true;
        // 连接成功时启动定时发送心跳消息，避免被服务器断开连接
        // this.heartBeatTimer = window.setInterval(() => {
        //   const message = "心跳消息";  // Xīntiào xiāoxī : Heartbeat message
        //   this.isConnected &&
        //     app.config.globalProperties.$socket.sendObj({
        //       "verb": "begin",
        //       msg: message
        //     });
        // }, this.heartBeatInterval);
      },
      // 连接关闭
      SOCKET_ONCLOSE(event: any) {
        this.isConnected = false;
        // 连接关闭时停掉心跳消息
        window.clearInterval(this.heartBeatTimer);
        this.heartBeatTimer = 0;
        console.log("连接已断开: " + new Date());   // The line is disconnected
        console.log(event);
      },
      // 发生错误
      SOCKET_ONERROR(event: any) {
        console.error(event);
      },
      // 收到服务端发送的消息
      SOCKET_ONMESSAGE(message: any) {
        this.message = message;
        console.log(message)
      },
      // 自动重连
      SOCKET_RECONNECT(count: any) {
        console.info("消息系统重连中...", count);
      },
      // 重连错误
      SOCKET_RECONNECT_ERROR() {
        this.reconnectError = true;
      }
    }
  })();
};

// Need to be used outside the setup
export function useSocketStoreWithOut(app: App<Element>) {
  setupStore(app);
  return useSocketStore(app);
}
