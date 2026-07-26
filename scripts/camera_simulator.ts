/// <reference types="node" />
// TEAM_001: 網路攝像機 JSON 單次/手動觸發器 (已移除 8 秒自動循環)
import http from 'http';
import readline from 'readline';

const API_URL = 'http://localhost:5000/api/telemetry';

// 測試用 Base64 JPEG
const sampleBase64Jpegs = [
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAYABgBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
];

async function sendSingleTelemetry(customMessage?: string, base64Image?: string) {
  const defaultMsg = `網路攝像機事件通報: 辨識對象 #${Math.floor(1000 + Math.random() * 9000)}`;
  const messageToSend = customMessage || defaultMsg;
  const imageToSend = base64Image || sampleBase64Jpegs[Math.floor(Math.random() * sampleBase64Jpegs.length)];

  const payload = JSON.stringify({
    message: messageToSend,
    file: imageToSend,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n📸 [網路攝像機] 正在發送 JSON 數據至 ${API_URL}...`);
  console.log(`💬 Message: "${messageToSend}"`);
  console.log(`🖼️ Base64 長度: ${imageToSend.length} 字元`);

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
        console.log(`✅ [Response Status: ${res.statusCode}]`);
        try {
          const parsed = JSON.parse(data);
          console.log(`🎉 成功寫入 Supabase store_data 資料表！ID: ${parsed.record?.id || 'N/A'}`);
          console.log(`🔗 Supabase Storage 圖片網址: ${parsed.record?.file_url || 'N/A'}`);
        } catch {
          console.log(`Response Body: ${data}`);
        }
      });
    }
  );

  req.on('error', (err) => {
    console.error('❌ [Send Error]', err.message);
  });

  req.write(payload);
  req.end();
}

// 互動式命令列 (移除 8 秒定時器，由使用者按 Enter 觸發)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('=======================================================');
console.log('📷 Ameba / 網路攝像機手動觸發發送器已啟動');
console.log('👉 按 [Enter] 鍵立即捕捉畫面並發送單次 JSON 數據');
console.log('👉 輸入自訂訊息後按 [Enter] 發送指定內容');
console.log('👉 輸入 [q] 或按 Ctrl+C 結束程式');
console.log('=======================================================\n');

function promptUser() {
  rl.question('按 [Enter] 發送 (或輸入訊息): ', (answer) => {
    if (answer.trim().toLowerCase() === 'q') {
      console.log('👋 已退出攝像機觸發器程式');
      process.exit(0);
    }
    
    sendSingleTelemetry(answer.trim() || undefined);
    setTimeout(promptUser, 1000);
  });
}

promptUser();
