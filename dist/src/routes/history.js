"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyRouter = void 0;
// TEAM_001: History API (查詢歷史紀錄與統計數據)
const express_1 = require("express");
const supabaseClient_js_1 = require("../supabaseClient.js");
exports.historyRouter = (0, express_1.Router)();
/**
 * GET /api/history
 * 取得 Supabase 歷史紀錄列表
 * Query Params: limit, search
 */
exports.historyRouter.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const tableCandidates = ['store_data', 'attendance_records', 'attendances', 'attendance', 'records'];
        let recordsData = [];
        for (const tableName of tableCandidates) {
            let query = supabaseClient_js_1.supabase
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
    }
    catch (err) {
        console.error('[TEAM_001 History Route Error]', err);
        res.status(500).json({ error: 'Internal server error fetching history', details: err?.message });
    }
});
