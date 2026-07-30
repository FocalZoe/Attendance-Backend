// TEAM_005: History API (查詢與搜尋歷史考勤紀錄的調閱窗口)
// 【非程式人員導覽】：這個檔案是 API 伺服器的「歷史檔案調閱櫃檯」。
// 當網頁儀表板打開或重新整理時，前端會傳送 HTTP GET 請求到 /api/history，
// 要求抓取 Supabase 資料庫中最近的打卡紀錄清單，或者根據關鍵字搜尋特定人員的打卡狀態。

import { Router, Request, Response } from 'express';
import { supabase } from '../supabaseClient.js'; // 匯入 Supabase 資料庫連線鑰匙

// 建立 Express 路由分流器
export const historyRouter = Router();

/**
 * HTTP GET /api/history
 * 取得 Supabase 歷史紀錄列表
 * 可選查詢網址參數 (Query Params):
 *  - limit: 限制要回傳幾筆資料 (例如 ?limit=20，預設 50 筆)
 *  - search: 關鍵字搜尋 (例如 ?search=張小明，會在打卡訊息中進行模糊比對)
 */
historyRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 解析網址傳進來的限制筆數 (limit) 與搜尋關鍵字 (search)
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';

    // 2. 備用資料表名稱清單，確保極高相容性
    const tableCandidates = ['store_data', 'attendance_records', 'attendances', 'attendance', 'records'];
    let recordsData: any[] = [];

    // 3. 逐一嘗試從 Supabase 資料庫查詢
    for (const tableName of tableCandidates) {
      // 建立查詢器：指定要抓取的資料表、選取全部欄位 (*)、按 create_at (建立時間) 降序排列 (最新打卡排前面)
      let query = supabase
        .from(tableName)
        .select('*')
        .order('create_at', { ascending: false })
        .limit(limit);

      // 如果有輸入搜尋關鍵字，加上 ilike (不分大小寫的模糊比對) 条件
      if (search) {
        query = query.ilike('message', `%${search}%`);
      }

      // 執行 Supabase 資料庫查詢
      const { data, error } = await query;
      if (!error && data) {
        recordsData = data; // 成功拿到紀錄清單
        break; // 跳出迴圈
      }
    }

    // 4. 以 JSON 格式將紀錄清單與總筆數回傳給前端網頁
    res.json({
      success: true,
      records: recordsData,
      count: recordsData.length,
    });
  } catch (err: any) {
    console.error('[TEAM_005 History Route Error]', err);
    res.status(500).json({ error: 'Internal server error fetching history', details: err?.message });
  }
});
