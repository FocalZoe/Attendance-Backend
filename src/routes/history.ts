// TEAM_001: History API (查詢歷史紀錄與統計數據)
import { Router, Request, Response } from 'express';
import { supabase } from '../supabaseClient.js';

export const historyRouter = Router();

/**
 * GET /api/history
 * 取得 Supabase 歷史紀錄列表
 * Query Params: limit, search
 */
historyRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';

    const tableCandidates = ['store_data', 'attendance_records', 'attendances', 'attendance', 'records'];
    let recordsData: any[] = [];

    for (const tableName of tableCandidates) {
      let query = supabase
        .from(tableName)
        .select('*')
        .order('create_at', { ascending: false })
        .limit(limit);

      if (search) {
        query = query.ilike('message', `%${search}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        recordsData = data;
        break;
      }
    }

    res.json({
      success: true,
      records: recordsData,
      count: recordsData.length,
    });
  } catch (err: any) {
    console.error('[TEAM_001 History Route Error]', err);
    res.status(500).json({ error: 'Internal server error fetching history', details: err?.message });
  }
});
