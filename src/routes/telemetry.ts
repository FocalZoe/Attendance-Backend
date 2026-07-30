// TEAM_005: Telemetry API (接收 Ameba 網路攝像機通報與照片的接待窗口)
// 【非程式人員導覽】：這個檔案是 API 伺服器中最核心的「考勤收件櫃檯」。
// 當 Ameba 網路攝像機或瀏覽器相機拍下照片並按下發送時，資料就會傳到這個 POST /api/telemetry 窗口。
// 這裡會依序執行 4 大任務：
// 1. 檢查傳進來的照片與訊息是否完整。
// 2. 呼叫相簿服務將 Base64 圖片儲存到 Supabase 雲端相簿，拿到公開網址。
// 3. 把考勤訊息與圖片網址記錄寫入 Supabase 資料庫。
// 4. 拿起對講機 (WebSocket) 廣播通知線上所有監控儀表板即時更新。

import { Router, Request, Response } from 'express';
import { uploadBase64Image } from '../services/storageService.js'; // 匯入圖片上傳幫手
import { supabase } from '../supabaseClient.js'; // 匯入 Supabase 資料庫連線鑰匙
import { broadcastEvent } from '../index.js'; // 匯入對講機全域廣播大喇叭函式

// 建立 Express 路由分流器
export const telemetryRouter = Router();

/**
 * HTTP POST /api/telemetry
 * 接收相機傳送之 JSON 資料
 * 要求的包裹內容 (Body)：{ message: "打卡訊息", file: "Base64 圖片碼", timestamp?: "打卡時間" }
 */
telemetryRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 從請求包裹 (req.body) 中解開 message(打卡訊息), file(Base64 圖片), timestamp(時間點)
    const { message, file, timestamp } = req.body;

    // 【安全檢查】：如果沒有傳打卡訊息或沒有傳圖片，退回包裹並報錯 400 (Bad Request)
    if (!message || !file) {
      res.status(400).json({ error: 'Missing required fields: message and file (Base64) are required.' });
      return;
    }

    console.log(`[TEAM_005 API] 收到相機打卡 JSON 資料: Message="${message}", 圖片文字碼長度=${file.length} 字元`);

    // 2. 【上傳雲端相簿】：呼叫 uploadBase64Image 函式把 Base64 圖片碼解碼並上傳至 Supabase Storage，取得 fileUrl 公開圖片網址
    const fileUrl = await uploadBase64Image(file);
    console.log(`[TEAM_005 API] 圖片已成功上傳至 Supabase Storage 雲端相簿: ${fileUrl}`);

    // 3. 準備要存進資料庫的資料表單欄位 (時間、打卡訊息、圖片網址)
    const createAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    const insertPayload = {
      create_at: createAt,
      message: message,
      file_url: fileUrl,
    };

    // 4. 【寫入資料庫】：寫入 Supabase PostgreSQL 資料庫 (優先嘗試寫入 store_data 資料表)
    let data = null;
    let dbError = null;

    // 定義可能使用的資料表名稱清單，確保系統最具相容性
    const tableCandidates = ['store_data', 'attendance_records', 'attendances', 'attendance', 'records'];

    for (const tableName of tableCandidates) {
      const result = await supabase
        .from(tableName)
        .insert([insertPayload]) // 插入新紀錄
        .select('*')
        .single(); // 回傳單筆寫入成功的完整資料物件

      if (!result.error) {
        data = result.data;
        dbError = null;
        console.log(`[TEAM_005 DB] 成功將考勤寫入資料表 [${tableName}]，分配到的 UUID 是:`, data.id);
        break; // 寫入成功即跳出迴圈
      } else {
        dbError = result.error;
      }
    }

    // 若所有資料表嘗試後都寫入失敗，回傳 500 錯誤與詳細診斷訊息
    if (!data) {
      console.error('[TEAM_005 DB Insert Error]', dbError);
      const isTableMissing = dbError?.code === 'PGRST205' || dbError?.message?.includes('schema cache');
      const errorMsg = isTableMissing
        ? 'Supabase 資料庫尚未建立資料表！請至 Supabase 控制台 (SQL Editor) 執行 supabase_schema.sql 建表腳本。'
        : 'Failed to save record to Supabase DB';
        
      res.status(500).json({ error: errorMsg, details: dbError?.message });
      return;
    }

    // 5. 【廣播大喇叭】：寫入資料庫成功後，立刻拿起 WebSocket 對講機，把新打卡紀錄廣播給所有正在看網頁儀表板的人
    broadcastEvent({
      type: 'NEW_ATTENDANCE_RECORD',
      data: data,
    });

    // 6. 回應 201 Created 給傳送資料的相機，告知全套流程處理成功
    res.status(201).json({
      success: true,
      message: 'Telemetry data processed and stored successfully',
      record: data,
    });
  } catch (err: any) {
    console.error('[TEAM_005 Telemetry Error]', err);
    res.status(500).json({ error: 'Internal server error processing telemetry data', details: err?.message });
  }
});
