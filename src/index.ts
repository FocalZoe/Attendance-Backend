// TEAM_001: 後端主要進入點 (Express + WebSocket Server)
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { telemetryRouter } from './routes/telemetry.js';
import { historyRouter } from './routes/history.js';

dotenv.config();
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const app = express();
const PORT = process.env.PORT || 5000;

// 中介軟體設定
app.use(cors({ origin: '*' }));
// 大容量 Body 解析，確保大解析度相機 Base64 能順利接收
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// HTTP 服務器與 WebSocket 整合
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 已連線之客戶端集合
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  console.log(`[TEAM_001 WebSocket] 前端客戶端已連線 (目前連線數: ${clients.size})`);

  // 發送歡迎連線訊號
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket 即時推播伺服器已連線' }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[TEAM_001 WebSocket] 前端客戶端已斷開 (目前連線數: ${clients.size})`);
  });

  ws.on('error', (err) => {
    console.error('[TEAM_001 WebSocket Error]', err);
    clients.delete(ws);
  });
});

/**
 * 全域廣播函式：推送事件至所有已連線前端
 */
export function broadcastEvent(eventPayload: any): void {
  const messageStr = JSON.stringify(eventPayload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// 註冊 API 路由
app.use('/api/telemetry', telemetryRouter);
app.use('/api/history', historyRouter);

// 健康檢查 Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    connectedClients: clients.size,
  });
});

// 啟動伺服器
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 [TEAM_001] 後端 API 伺服器啟動於 http://localhost:${PORT}`);
  console.log(`📡 WebSocket 廣播服務同步監聽中`);
  console.log(`=======================================================`);
});
