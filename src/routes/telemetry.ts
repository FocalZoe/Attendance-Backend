// TEAM_005 & TEAM_006: Telemetry API (接收 Ameba 網路攝像機通報與照片並整合 AI 影像辨識)
// 【非程式人員導覽】：這個檔案是 API 伺服器中最核心的「考勤收件櫃檯」。
// 當 Ameba 網路攝像機或瀏覽器相機拍下照片並按下發送時，資料會傳到這個 POST /api/telemetry 窗口。
// 這裡會依序執行：
// 1. 檢查傳進來的照片與訊息是否完整。
// 2. 呼叫相簿服務將 Base64 圖片儲存到 Supabase 雲端相簿，拿到公開網址。
// 3. 【TEAM_006 新增】呼叫 visionService 本地開放原始碼 AI 引擎進行人臉特徵辨識與考勤身份確認。
// 4. 把考勤訊息、圖片網址與 ai_analysis 辨識結果寫入 Supabase 資料庫。
// 5. 透過 WebSocket 廣播通知線上所有監控儀表板即時更新。

import { Router, Request, Response } from 'express';
import { uploadBase64Image } from '../services/storageService.js'; // 匯入圖片上傳幫手
import { analyzeAttendanceImage } from '../services/visionService.js'; // TEAM_006: 匯入 AI 影像辨識服務
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

    console.log(`[TEAM_006 API] 收到 Ameba 相機打卡 JSON: Message="${message}", Base64 長度=${file.length} 字元`);

    // 2. 【上傳雲端相簿】：呼叫 uploadBase64Image 函式把 Base64 圖片碼解碼並上傳至 Supabase Storage，取得 fileUrl 公開圖片網址
    const fileUrl = await uploadBase64Image(file);
    console.log(`[TEAM_006 API] 圖片已成功上傳至 Supabase Storage: ${fileUrl}`);

    // 3. 【TEAM_006 AI 影像辨識】：呼叫 visionService 分析 Base64 照片人臉與特徵
    const aiAnalysis = await analyzeAttendanceImage(file, message);

    // 4. 準備要存進資料庫的欄位表單 (時間、打卡訊息、圖片網址、AI 辨識結果)
    const createAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    const insertPayload = {
      create_at: createAt,
      message: message,
      file_url: fileUrl,
      ai_analysis: aiAnalysis, // TEAM_006: 新增 AI 人臉辨識 JSONB 欄位
    };

    // 5. 【寫入資料庫】：寫入 Supabase PostgreSQL 資料庫
    let data = null;
    let dbError = null;

    const tableCandidates = ['store_data', 'attendance_records', 'attendances', 'attendance', 'records'];

    for (const tableName of tableCandidates) {
      const result = await supabase
        .from(tableName)
        .insert([insertPayload])
        .select('*')
        .single();

      if (!result.error) {
        data = result.data;
        dbError = null;
        console.log(`[TEAM_006 DB] 成功將考勤與 AI 辨識寫入資料表 [${tableName}]，UUID:`, data.id);
        break;
      } else {
        dbError = result.error;
      }
    }

    // 若寫入失敗且因為包含 ai_analysis 欄位，嘗試無 ai_analysis 的備用寫入，確保相容性
    if (!data) {
      console.warn('[TEAM_006 DB] 資料表降級嘗試 (除去 ai_analysis 欄位)...');
      const fallbackPayload = { create_at: createAt, message: message, file_url: fileUrl };
      for (const tableName of tableCandidates) {
        const result = await supabase.from(tableName).insert([fallbackPayload]).select('*').single();
        if (!result.error) {
          data = { ...result.data, ai_analysis: aiAnalysis }; // 補充本地 aiAnalysis
          dbError = null;
          break;
        }
      }
    }

    if (!data) {
      console.error('[TEAM_006 DB Insert Error]', dbError);
      res.status(500).json({ error: 'Failed to save record to Supabase DB', details: dbError?.message });
      return;
    }

    // 6. 【廣播大喇叭】：寫入成功後，把考勤紀錄與 AI 人臉辨識結果廣播給線上儀表板
    broadcastEvent({
      type: 'NEW_ATTENDANCE_RECORD',
      data: data,
    });

    // 7. 回應 201 Created 給相機或模擬器
    res.status(201).json({
      success: true,
      message: 'Telemetry and AI vision analysis processed successfully',
      record: data,
      ai_analysis: aiAnalysis,
    });
  } catch (err: any) {
    console.error('[TEAM_006 Telemetry Error]', err);
    res.status(500).json({ error: 'Internal server error processing telemetry data', details: err?.message });
  }
});
