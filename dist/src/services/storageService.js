"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBase64Image = uploadBase64Image;
// TEAM_001: Supabase Storage 圖片上傳服務
const supabaseClient_js_1 = require("../supabaseClient.js");
const BUCKET_NAME = 'attendance-images';
/**
 * 將 Base64 字串解碼並上傳至 Supabase Storage，回傳公開讀取 URL (file_url)
 */
async function uploadBase64Image(base64Data) {
    try {
        // 檢查並自動初始化 Bucket
        await ensureBucketExists();
        let mimeType = 'image/jpeg';
        let extension = 'jpg';
        let base64String = base64Data;
        // 若包含 data:image/png;base64, 等前綴，進行解析
        if (base64Data.startsWith('data:')) {
            const parts = base64Data.split(';base64,');
            const header = parts[0];
            base64String = parts[1];
            const match = header.match(/data:(image\/\w+)/);
            if (match) {
                mimeType = match[1];
                extension = mimeType.split('/')[1] || 'jpg';
            }
        }
        // Supabase Storage 並不原生支援 SVG mime，若傳入 SVG 自動轉為 image/jpeg 標頭與副檔名
        if (mimeType.includes('svg')) {
            mimeType = 'image/jpeg';
            extension = 'jpg';
        }
        const buffer = Buffer.from(base64String, 'base64');
        const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
        const filePath = `uploads/${fileName}`;
        // 上傳至 Supabase Storage
        const { data, error } = await supabaseClient_js_1.supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: true,
        });
        if (error) {
            console.error('[TEAM_001 Storage Upload Error]', error);
            throw error;
        }
        // 取得 Public URL
        const { data: publicUrlData } = supabaseClient_js_1.supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);
        return publicUrlData.publicUrl;
    }
    catch (err) {
        console.error('[TEAM_001 Storage Service Exception]', err);
        throw err;
    }
}
/**
 * 確認 Storage Bucket 是否存在，若無則自動建立
 */
async function ensureBucketExists() {
    try {
        const { data: buckets } = await supabaseClient_js_1.supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === BUCKET_NAME);
        if (!exists) {
            console.log(`[TEAM_001] 建立 Supabase Storage Bucket: ${BUCKET_NAME}`);
            await supabaseClient_js_1.supabase.storage.createBucket(BUCKET_NAME, {
                public: true,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            });
        }
    }
    catch (err) {
        console.warn('[TEAM_001 Bucket Check Warning]', err);
    }
}
