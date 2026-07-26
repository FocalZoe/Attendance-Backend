/// <reference types="node" />
// TEAM_001: Supabase 診斷腳本 (檢查權限與可用資料表)
import { supabase } from '../src/supabaseClient';

async function checkSupabase() {
  console.log('🔍 正在檢測 Supabase 連線與資料表名稱...');

  // 嘗試常見資料表名稱
  const candidates = [
    'store_data',
    'attendance_records',
    'attendance',
    'attendances',
    'records',
    'logs',
    'attendance_log',
    'attendance_logs',
    'zoe_attendance',
    'ameba_records',
  ];

  let foundTable: string | null = null;

  for (const table of candidates) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✅ 成功找到 Supabase 資料表: [${table}] (包含 ${data?.length} 筆資料)`);
      foundTable = table;
      break;
    } else {
      console.log(`❌ [${table}] 不存在: ${error.message}`);
    }
  }

  if (!foundTable) {
    console.log('\n⚠️ 在 Supabase 中未發現上述預設資料表！');
    console.log('請至 Supabase 控制台 (https://supabase.com) -> [SQL Editor]');
    console.log('執行以下 SQL 腳本以一鍵建立資料表與欄位：\n');
    console.log(`--------------------------------------------------`);
    console.log(`CREATE TABLE IF NOT EXISTS attendance_records (`);
    console.log(`    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
    console.log(`    create_at TIMESTAMPTZ DEFAULT NOW(),`);
    console.log(`    message TEXT NOT NULL,`);
    console.log(`    file_url TEXT NOT NULL`);
    console.log(`);`);
    console.log(`--------------------------------------------------\n`);
  }
}

checkSupabase();
