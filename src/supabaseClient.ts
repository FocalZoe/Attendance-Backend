// TEAM_005: Supabase 雲端服務初始化模組
// 【非程式人員導覽】：這個檔案是我們伺服器連線到「Supabase 雲端資料庫與雲端相簿」的鑰匙保管箱。
// 它負責向 Supabase 出示正確的網址與權限密鑰 (Service Role Key)，建立出一條穩定的安全連線通道。

import { createClient } from '@supabase/supabase-js'; // 載入 Supabase 官方提供的 SDK 工具包
import dotenv from 'dotenv'; // 載入環境變數讀取工具
import path from 'path'; // 載入檔案路徑工具

// 優先載入當前目錄的 .env 檔案；若找不到，則向上讀取父目錄的 .env
dotenv.config();
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

// 從環境變數中取得 Supabase 的專屬網址與金鑰
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// 若檢查發現環境變數缺少金鑰，在控制台發出警報提醒管理者設定
if (!supabaseUrl || !supabaseKey) {
  console.warn('[TEAM_005 Warning] Supabase 認證資訊未在環境變數 (.env) 中完整設定');
}

// 【建立 Supabase 官方客戶端連線實例】：
// 傳入 Supabase 網址與金鑰。我們設定 persistSession: false 代表後端不需要保持使用者登入狀態（因為這是伺服器對伺服器的連線）。
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});
