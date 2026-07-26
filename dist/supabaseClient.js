"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
// TEAM_001: Supabase 初始化模組
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 優先載入目前目錄 .env，若無則讀取父目錄 .env
dotenv_1.default.config();
if (!process.env.SUPABASE_URL) {
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
}
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.warn('[TEAM_001 Warning] Supabase 認證資訊未在環境變數中完整設定');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
    },
});
