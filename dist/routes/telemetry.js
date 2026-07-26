"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryRouter = void 0;
// TEAM_001: Telemetry API (接收 Ameba JSON 並儲存至 Supabase)
const express_1 = require("express");
const storageService_js_1 = require("../services/storageService.js");
const supabaseClient_js_1 = require("../supabaseClient.js");
const index_js_1 = require("../index.js");
exports.telemetryRouter = (0, express_1.Router)();
/**
 * POST /api/telemetry
 * 接收 Ameba (網路攝像機) 傳送之 JSON 數據
 * Body: { message: string, file: string (Base64), timestamp?: string }
 */
exports.telemetryRouter.post('/', async (req, res) => {
    try {
        const { message, file, timestamp } = req.body;
        if (!message || !file) {
            res.status(400).json({ error: 'Missing required fields: message and file (Base64) are required.' });
            return;
        }
        console.log(`[TEAM_001 API] 收到 Ameba JSON 資料: Message="${message}", 圖片長度=${file.length} 字元`);
        // 1. 上傳 Base64 圖片至 Supabase Storage 取得 file_url
        const fileUrl = await (0, storageService_js_1.uploadBase64Image)(file);
        console.log(`[TEAM_001 API] 圖片已成功上傳至 Supabase Storage: ${fileUrl}`);
        // 2. 準備寫入資料庫之欄位 (id, create_at, message, file_url)
        const createAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
        const insertPayload = {
            create_at: createAt,
            message: message,
            file_url: fileUrl,
        };
        // 3. 寫入 Supabase 資料庫 (優先使用 store_data 資料表)
        let data = null;
        let dbError = null;
        const tableCandidates = ['store_data', 'attendance_records', 'attendances', 'attendance', 'records'];
        for (const tableName of tableCandidates) {
            const result = await supabaseClient_js_1.supabase
                .from(tableName)
                .insert([insertPayload])
                .select('*')
                .single();
            if (!result.error) {
                data = result.data;
                dbError = null;
                console.log(`[TEAM_001 DB] 成功寫入資料表 [${tableName}] ID:`, data.id);
                break;
            }
            else {
                dbError = result.error;
            }
        }
        if (!data) {
            console.error('[TEAM_001 DB Insert Error]', dbError);
            const isTableMissing = dbError?.code === 'PGRST205' || dbError?.message?.includes('schema cache');
            const errorMsg = isTableMissing
                ? 'Supabase 資料庫尚未建立資料表！請至 Supabase 控制台 (SQL Editor) 執行建表 SQL：CREATE TABLE attendance_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), create_at TIMESTAMPTZ DEFAULT NOW(), message TEXT NOT NULL, file_url TEXT NOT NULL);'
                : 'Failed to save record to Supabase DB';
            res.status(500).json({ error: errorMsg, details: dbError?.message });
            return;
        }
        // 4. 通過 WebSocket 即時廣播給所有連線的前端 Dashboard
        (0, index_js_1.broadcastEvent)({
            type: 'NEW_ATTENDANCE_RECORD',
            data: data,
        });
        res.status(201).json({
            success: true,
            message: 'Telemetry data processed and stored successfully',
            record: data,
        });
    }
    catch (err) {
        console.error('[TEAM_001 Telemetry Error]', err);
        res.status(500).json({ error: 'Internal server error processing telemetry data', details: err?.message });
    }
});
