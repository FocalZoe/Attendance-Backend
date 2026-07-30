/// <reference types="node" />
// TEAM_005: 網路攝像機 JSON 單次/手動觸發發送器 (命令行測試模擬腳本)
// 【非程式人員導覽】：這個檔案是一個能在 Terminal「小黑窗」中執行的測試工具。
// 當身邊沒有實體 Ameba 相機或實體 Web 鏡頭時，你可以執行這個腳本。
// 只要在鍵盤上按 [Enter]，它就會模擬一部網路攝影機，自動將一張測試用的圖片碼與打卡訊息發送到後端 API 伺服器，
// 方便你測試後端、Supabase 資料庫與網頁儀表板的反應。

import http from 'http'; // 載入 HTTP 網路發送工具
import readline from 'readline'; // 載入命令列文字輸入讀取工具

// 後端接收相機打卡資料的 API 門牌地址
const API_URL = 'http://localhost:5000/api/telemetry';

// 內建兩張微型的測試用圖片 Base64 文字碼 (讓相機隨機挑選發送)
const sampleBase64Jpegs = [
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAYABgBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
];

/**
 * 觸發發送單次打卡通報的函式
 * @param customMessage 可選的自訂訊息（若沒填則自動產生亂數識別碼）
 * @param base64Image 可選的自訂 Base64 圖片
 */
async function sendSingleTelemetry(customMessage?: string, base64Image?: string) {
  // 若沒輸入文字，預設產生如 "網路攝像機事件通報: 辨識對象 #3482"
  const defaultMsg = `網路攝像機事件通報: 辨識對象 #${Math.floor(1000 + Math.random() * 9000)}`;
  const messageToSend = customMessage || defaultMsg;
  const imageToSend = base64Image || sampleBase64Jpegs[Math.floor(Math.random() * sampleBase64Jpegs.length)];

  // 打包成 JSON 文字格式
  const payload = JSON.stringify({
    message: messageToSend,
    file: imageToSend,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n📸 [模擬網路攝像機] 正在發送 JSON 打卡包裹至 ${API_URL}...`);
  console.log(`💬 Message 打卡訊息: "${messageToSend}"`);
  console.log(`🖼️ Base64 圖片長度: ${imageToSend.length} 字元`);

  // 發送 HTTP POST 請求給後端 API 伺服器
  const req = http.request(
    API_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`✅ [後端回應狀態碼 Response Status: ${res.statusCode}]`);
        try {
          const parsed = JSON.parse(data);
          console.log(`🎉 成功寫入 Supabase store_data 資料表！分配 ID: ${parsed.record?.id || 'N/A'}`);
          console.log(`🔗 產出的 Supabase Storage 圖片公開網址: ${parsed.record?.file_url || 'N/A'}`);
        } catch {
          console.log(`回應內容: ${data}`);
        }
      });
    }
  );

  req.on('error', (err) => {
    console.error('❌ [發送錯誤 Error]', err.message);
  });

  // 將資料寫入網路傳輸流並結束傳送
  req.write(payload);
  req.end();
}

// 建立 Terminal 命令列互動介面 (按 Enter 即可發送)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('=======================================================');
console.log('📷 Ameba / 網路攝像機手動觸發發送器 (命令行測試版) 已啟動');
console.log('👉 按 [Enter] 鍵：立即捕捉畫面並發送單次打卡 JSON 數據');
console.log('👉 輸入自訂訊息後按 [Enter]：發送該指定訊息內容');
console.log('👉 輸入 [q] 或按 Ctrl+C：結束程式');
console.log('=======================================================\n');

function promptUser() {
  rl.question('按 [Enter] 發送 (或輸入自訂打卡訊息): ', (answer) => {
    if (answer.trim().toLowerCase() === 'q') {
      console.log('👋 已退出攝像機觸發器程式');
      process.exit(0);
    }
    
    sendSingleTelemetry(answer.trim() || undefined);
    setTimeout(promptUser, 1000);
  });
}

promptUser();
