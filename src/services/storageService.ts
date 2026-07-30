// TEAM_005: Supabase Storage 圖片上傳服務 (雲端相簿與解碼小幫手)
// 【非程式人員導覽】：這個檔案是我們的「雲端相簿處理專員」。
// 因為網路相機拍完照後，會把整張圖片轉化為一大串像密碼般的文字字串 (稱為 Base64)，
// 這個檔案的工作就是：
// 1. 把這串 Base64 文字解碼，還原成真正的 JPG/PNG 圖片檔案。
// 2. 自動檢查雲端相簿 (Storage Bucket `attendance-images`) 是否存在，沒有就幫忙建一個。
// 3. 把圖片檔案上傳放到 Supabase 雲端相簿中，並拿到一個人人都可以點開看照片的「公開存取網址 (Public URL)」。

import { supabase } from '../supabaseClient.js'; // 匯入 Supabase 連線鑰匙

// 定義 Supabase Storage 雲端相簿資料夾的名稱
const BUCKET_NAME = 'attendance-images';

/**
 * 主要上傳函式：傳入 Base64 文字字串，回傳 Supabase 雲端相簿的圖片網址
 */
export async function uploadBase64Image(base64Data: string): Promise<string> {
  try {
    // 步驟 1：確保 Supabase 雲端相簿 (Bucket) 已經存在
    await ensureBucketExists();

    // 預設檔案格式為 JPEG
    let mimeType = 'image/jpeg';
    let extension = 'jpg';
    let base64String = base64Data;

    // 步驟 2：解析前綴標頭 (例如 data:image/png;base64,xxxx)
    if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(';base64,');
      const header = parts[0];
      base64String = parts[1]; // 取得真正的 Base64 純文字碼
      
      const match = header.match(/data:(image\/\w+)/);
      if (match) {
        mimeType = match[1];
        extension = mimeType.split('/')[1] || 'jpg';
      }
    }

    // 若傳入 SVG 格式，為了相容性自動調整標頭與副檔名為 jpg
    if (mimeType.includes('svg')) {
      mimeType = 'image/jpeg';
      extension = 'jpg';
    }

    // 步驟 3：使用 Buffer.from 將 Base64 文字還原為電腦看得懂的二進位圖片 Data (Buffer)
    const buffer = Buffer.from(base64String, 'base64');
    
    // 隨機產生一個唯一的圖片檔名 (防止重複檔名被覆蓋)，例如 img_1711234567_a8f9k.jpg
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const filePath = `uploads/${fileName}`;

    // 步驟 4：將二進位圖片檔案上傳至 Supabase Storage 雲端相簿
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: mimeType, // 設定圖片的 MIME 類型 (例如 image/jpeg)
        upsert: true,          // 若遇到同名檔案允許覆蓋
      });

    if (error) {
      console.error('[TEAM_005 Storage Upload Error]', error);
      throw error;
    }

    // 步驟 5：向 Supabase 查詢這張圖片的公開存取網址 (Public URL)
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    // 回傳圖片的專屬網址，給後面寫入資料庫使用
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[TEAM_005 Storage Service Exception]', err);
    throw err;
  }
}

/**
 * 輔助函式：檢查 Supabase Storage 中的 Bucket 是否存在；若尚不存在則自動調用 API 建立一個公開的相簿
 */
async function ensureBucketExists(): Promise<void> {
  try {
    // 取得目前的相簿清單
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);

    // 若相簿不存在，自動建立相簿
    if (!exists) {
      console.log(`[TEAM_005] 自動建立 Supabase Storage 雲端相簿 Bucket: ${BUCKET_NAME}`);
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // 設為公開相簿，任何人都能點擊網址看圖
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], // 允許的圖片格式
      });
    }
  } catch (err) {
    console.warn('[TEAM_005 Bucket Check Warning]', err);
  }
}
