/// <reference types="node" />
// TEAM_005 & TEAM_006: 網路攝像機 JSON 單次/手動觸發發送器 (含 AI 視覺辨識回應驗證)

import http from 'http';
import readline from 'readline';

const API_URL = 'http://localhost:5000/api/telemetry';

const sampleBase64Jpegs = [
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAYABgBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
];

async function sendSingleTelemetry(customMessage?: string, base64Image?: string) {
  const defaultMsg = `網路攝像機考勤打卡: 張小明 #${Math.floor(1000 + Math.random() * 9000)}`;
  const messageToSend = customMessage || defaultMsg;
  const imageToSend = base64Image || sampleBase64Jpegs[Math.floor(Math.random() * sampleBase64Jpegs.length)];

  const payload = JSON.stringify({
    message: messageToSend,
    file: imageToSend,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n📸 [模擬 Ameba 網路攝像機] 正在發送 JSON 通報與照片至 ${API_URL}...`);
  console.log(`💬 打卡訊息: "${messageToSend}"`);

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
        console.log(`✅ [後端回應狀態碼: ${res.statusCode}]`);
        try {
          const parsed = JSON.parse(data);
          console.log(`🎉 成功寫入 Supabase DB！紀錄 UUID: ${parsed.record?.id || 'N/A'}`);
          console.log(`🤖 AI 影像辨識結果: 人員="${parsed.ai_analysis?.recognized_person || 'N/A'}", 狀態=${parsed.ai_analysis?.status || 'N/A'}, 信心度=${(parsed.ai_analysis?.confidence * 100 || 0).toFixed(1)}%`);
          console.log(`🔗 Supabase Storage 圖片網址: ${parsed.record?.file_url || 'N/A'}`);
        } catch {
          console.log(`回應內容: ${data}`);
        }
      });
    }
  );

  req.on('error', (err) => {
    console.error('❌ [發送錯誤 Error]', err.message);
  });

  req.write(payload);
  req.end();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('=======================================================');
console.log('📷 Ameba 網路攝像機 (AI 人臉辨識模組測試版) 已啟動');
console.log('👉 按 [Enter] 鍵：發送單次打卡與相片並印出 AI 辨識結果');
console.log('👉 輸入 [q] 或按 Ctrl+C：結束程式');
console.log('=======================================================\n');

function promptUser() {
  rl.question('按 [Enter] 發送 (或輸入自訂打卡訊息): ', (answer) => {
    if (answer.trim().toLowerCase() === 'q') {
      console.log('👋 已退出程式');
      process.exit(0);
    }
    
    sendSingleTelemetry(answer.trim() || undefined);
    setTimeout(promptUser, 1000);
  });
}

promptUser();
