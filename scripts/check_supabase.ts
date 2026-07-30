/// <reference types="node" />
// TEAM_005: Supabase 診斷與健康檢查腳本
// 【非程式人員導覽】：這個檔案是系統的「雲端資料庫健檢員」。
// 執行此檔時，它會自動連線上你的 Supabase 雲端資料庫，嘗試尋找專案需要的資料表 (如 store_data)。
// 如果發現找不到資料表，它會在螢幕上印出提示與建表 SQL 語法，教你如何一鍵建立。

import { supabase } from '../src/supabaseClient'; // 匯入 Supabase 連線鑰匙

async function checkSupabase() {
  console.log('🔍 正在檢測 Supabase 雲端資料庫連線與資料表是否存在...');

  // 列出系統可能使用的備用資料表名稱清單
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

  // 逐一輪詢嘗試讀取第一筆資料
  for (const table of candidates) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✅ 成功找到 Supabase 資料表: [${table}] (目前裡面包含 ${data?.length} 筆測試資料)`);
      foundTable = table;
      break;
    } else {
      console.log(`❌ [${table}] 資料表不存在: ${error.message}`);
    }
  }

  // 若發現資料表皆不存在，顯示警示與一鍵建表語法指引
  if (!foundTable) {
    console.log('\n⚠️ 在 Supabase 雲端資料庫中未發現預設的資料表！');
    console.log('請至 Supabase 控制台 (https://supabase.com) -> [SQL Editor]');
    console.log('執行專案根目錄的 supabase_schema.sql 或貼上以下 SQL 腳本建表：\n');
    console.log(`--------------------------------------------------`);
    console.log(`CREATE TABLE IF NOT EXISTS store_data (`);
    console.log(`    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
    console.log(`    create_at TIMESTAMPTZ DEFAULT NOW(),`);
    console.log(`    message TEXT NOT NULL,`);
    console.log(`    file_url TEXT NOT NULL`);
    console.log(`);`);
    console.log(`--------------------------------------------------\n`);
  }
}

checkSupabase();
