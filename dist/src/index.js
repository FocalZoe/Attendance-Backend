"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastEvent = broadcastEvent;
// TEAM_001: 後端主要進入點 (Express + WebSocket Server)
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const telemetry_js_1 = require("./routes/telemetry.js");
const history_js_1 = require("./routes/history.js");
dotenv_1.default.config();
if (!process.env.SUPABASE_URL) {
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// 中介軟體設定
app.use((0, cors_1.default)({ origin: '*' }));
// 大容量 Body 解析，確保大解析度相機 Base64 能順利接收
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// HTTP 服務器與 WebSocket 整合
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
// 已連線之客戶端集合
const clients = new Set();
wss.on('connection', (ws) => {
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
function broadcastEvent(eventPayload) {
    const messageStr = JSON.stringify(eventPayload);
    clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}
// 註冊 API 路由
app.use('/api/telemetry', telemetry_js_1.telemetryRouter);
app.use('/api/history', history_js_1.historyRouter);
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
