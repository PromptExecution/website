export type SocketStore = {
  // 连接状态
  isConnected: boolean;
  // 消息内容
  message: string;
  // 重新连接错误
  reconnectError: boolean;
  // 心跳消息发送时间
  heartBeatInterval: number;
  // 心跳定时器
  heartBeatTimer: number;

  incomingMessages: string[]; // Queue for incoming messages
  outgoingMessages: string[]; // Queue for outgoing messages
};
