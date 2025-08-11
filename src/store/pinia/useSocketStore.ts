// src/store/pinia/useSocketStore.ts
import { App } from "vue";
import { defineStore } from "pinia";
import { setupStore } from "@/store/pinia/store";
import { SocketStore } from "@/store/pinia/typeOfSocketStore";
import { emitter } from "@/eventBus";

export const useSocketStore = defineStore({
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
      console.log("sent message: " + message);

      // Check if the WebSocket is connected, if not, establish a connection here
      if (this.isConnected) {
        // Initialize WebSocket and connect here
        // On successful connection, send pending messages
        this.sendPendingMessages();
      } else {
        console.log("WebSocket NOT connected queue len:" + this.outgoingMessages.length);
      }
    },
    // Function to send pending messages
    sendPendingMessages() {
      // Check if there are pending outgoing messages
      if (this.outgoingMessages.length > 0) {
        // Loop through the outgoing messages and send them
        this.outgoingMessages.forEach((message,index) => {
          // Send the message through the WebSocket
          // TODO: Get app reference properly for WebSocket
          // app.config.globalProperties.$socket.sendObj({
          //   verb: "begin",
          //   msg: message,
          // });

          // Remove the sent message from the outgoingMessages queue
        this.outgoingMessages.splice(index, 1);
        });

      }
    },


    // 连接打开
    SOCKET_ONOPEN(event: any) {
      // TODO: Set socket reference properly
      // app.config.globalProperties.$socket = event.currentTarget;
      this.isConnected = true;

      this.sendMessage("👋🏻");
      emitter.emit("webSocket.open", event);
      console.log("successful websocket connection");
    },
    // 连接关闭
    SOCKET_ONCLOSE(event: any) {
      emitter.emit("webSocket.close", event);
      this.isConnected = false;
      // 连接关闭时停掉心跳消息
      window.clearInterval(this.heartBeatTimer);
      this.heartBeatTimer = 0;
      console.log("连接已断开: " + new Date());   // The line is disconnected
      console.log(event);
    },
    // 发生错误
    SOCKET_ONERROR(event: any) {
      emitter.emit("webSocket.error", event);
      console.error(event);
    },
    // 收到服务端发送的消息
    SOCKET_ONMESSAGE(message: any) {
      this.message = message;
      emitter.emit("webSocket.onMessage", message);
      console.log(message);    
    },
    // 自动重连
    SOCKET_RECONNECT(count: any) {
      emitter.emit("webSocket.Reconnect", count)
      console.info("消息系统重连中...", count);
    },
    // 重连错误
    SOCKET_RECONNECT_ERROR() {
      emitter.emit("webSocket.ReconnectError")
      this.reconnectError = true;
    }
  }
});

// Need to be used outside the setup
export function useSocketStoreWithOut(app: App<Element>) {
  setupStore(app);
  return useSocketStore;
}
