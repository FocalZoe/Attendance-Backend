// TEAM_005: 後端主要進入點 (Express API 伺服器 + WebSocket 即時廣播對講機)
// 【非程式人員導覽】：這個檔案是後端程式的「總指揮中心」。
// 它負責開門營業（啟動 HTTP 伺服器）、聽候指示（處理 API 請求），以及手拿對講機（WebSocket），
// 只要有任何相機傳來新的打卡紀錄，就會第一時間透過對講機通知所有打開網頁的人。

import express from 'express'; // 載入 Express：這是一個幫我們快速蓋好「網站後端與 API 視窗」的熱門工具庫。
import cors from 'cors'; // 載入 CORS：這是一張「通行證保護開關」，允許來自不同網址（如前端網頁）的請求順利連線進來。
import http from 'http'; // 載入 Node.js 原生的 HTTP 網路通訊基礎模組。
import { WebSocketServer, WebSocket } from 'ws'; // 載入 WebSocket 模組：這就像是雙向即時對講機，能讓後端主動發送訊息給前端網頁。
import dotenv from 'dotenv'; // 載入 dotenv：專門用來讀取 .env 設定檔（如資料庫密碼、雲端網址等秘密設定）。
import path from 'path'; // 載入路徑處理工具：幫我們計算檔案在硬碟中的正確位置。
import { telemetryRouter } from './routes/telemetry.js'; // 匯入「接收相機照片與訊息」的窗口路由。
import { historyRouter } from './routes/history.js'; // 匯入「查詢歷史考勤紀錄」的窗口路由。

// 讀取設定檔：優先讀取當前目錄的 .env，若沒有則尋找上層目錄的 .env 檔案
dotenv.config();
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

// 建立 Express 伺服器實例（就像創建了一家服務總公司）
const app = express();

// 設定伺服器監聽的門牌號碼 (Port 埠號)：優先使用環境變數指定的 Port，若無則預設為 5000
const PORT = process.env.PORT || 5000;

// 【中介軟體 1】：開啟全區跨域存取 (CORS)，讓任何來源的瀏覽器或裝置都能存取這個後端
app.use(cors({ origin: '*' }));

// 【中介軟體 2】：設定大容量 JSON 接收限制 (50MB)
// 【為什麼要設 50MB？】：因為相機拍下的高解析度照片轉成文字碼 (Base64) 後體積較大，若不特別加大限制，伺服器會拒絕接收。
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 建立 HTTP 網路伺服器，將 Express 總公司包裝進去
const server = http.createServer(app);

// 在同一個 HTTP 伺服器上安裝「WebSocket 即時廣播對講機廣播塔」
const wss = new WebSocketServer({ server });

// 建立一個集合 (Set)，專門紀錄「目前有哪些網頁瀏覽器正連著對講機」
const clients = new Set<WebSocket>();

// 當有新的前端網頁（瀏覽器）開啟並連線上 WebSocket 對講機時觸發此動作
wss.on('connection', (ws: WebSocket) => {
  // 將這個新連線的網頁加入我們的對講機名冊中
  clients.add(ws);
  console.log(`[TEAM_005 WebSocket] 前端客戶端已連線 (目前線上人數/連線數: ${clients.size})`);

  // 剛連線上時，主動發送一則「歡迎連線成功」的廣播給該前端網頁
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket 即時推播伺服器已連線' }));

  // 當前端網頁關閉視頁或斷開連線時觸發
  ws.on('close', () => {
    clients.delete(ws); // 從對講機名冊中移除
    console.log(`[TEAM_005 WebSocket] 前端客戶端已斷開 (目前連線數: ${clients.size})`);
  });

  // 當連線發生網路錯誤時觸發
  ws.on('error', (err) => {
    console.error('[TEAM_005 WebSocket Error]', err);
    clients.delete(ws);
  });
});

/**
 * 【全域廣播大喇叭函式】：
 * 當後端收到任何新打卡資料時，呼叫此函式，它會把新資料打包成廣播訊號，
 * 一口氣發送給所有正在線上觀看儀表板的人。
 */
export function broadcastEvent(eventPayload: any): void {
  const messageStr = JSON.stringify(eventPayload); // 將物件資料轉為文字訊號
  clients.forEach((client) => {
    // 確保客戶端對講機處於開啟狀態才發送訊號
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// 【掛載業務窗口/路由】：
// 只要網址是 /api/telemetry，就交給 telemetryRouter 窗口處理（負責接收相機上傳照片）
app.use('/api/telemetry', telemetryRouter);

// 只要網址是 /api/history，就交給 historyRouter 窗口處理（負責提供歷史打卡紀錄查詢）
app.use('/api/history', historyRouter);

// 【健康檢查 Endpoint】：提供給監控系統或維運人員測試伺服器是否正常運作中
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online', // 代表伺服器在線正常
    timestamp: new Date().toISOString(), // 目前伺服器時間
    connectedClients: clients.size, // 目前在線的 WebSocket 前端連線數量
  });
});

// 啟動伺服器並開始在指定的 Port 門牌號碼聽候連線
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 [TEAM_005] 後端 API 伺服器啟動於 http://localhost:${PORT}`);
  console.log(`📡 WebSocket 廣播服務同步監聽中`);
  console.log(`=======================================================`);
});
