import { GoogleGenAI } from '@google/genai';

// 【地雷 2 破解】設定 API 最長執行時間為 60 秒，避免 Vercel 提早切斷語音分析
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text, audio, mimeType } = await req.json();

    // 【地雷 1 破解】把初始化移進來，確保每一次請求都能拿到最新的環境變數
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("找不到 GEMINI_API_KEY，請檢查 .env.local 或 Vercel 設定");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 準備要餵給 AI 的資料
    let parts: any[] = [
      { text: `你是一個專業品質稽核助理。請聽這段語音，並擷取以下資訊：
      1. 站別 (若無明確提及則填無，若有聽到具體站別名稱則如實填入)
      2. 缺失描述 (請根據內容，做專業描述修正並精修，字數約控制在約30字左右)
      3. 違反法規 (請根據缺失內容推論，例如缺乏生產紀錄建議參考 ISO9001 和 ISO 13485 和 ISO14971 和 IEC60601 紀錄管制要求，以上三個條文若皆有則個別列舉，若無則填無，字數控制在50字左右)
      
      請務必以 JSON 格式回傳。` }
    ];

    if (audio) {
      // 【地雷 3 破解】防呆機制：如果前端傳來的 base64 帶有逗號前綴，把它切乾淨
      const cleanBase64 = audio.includes(',') ? audio.split(',')[1] : audio;

      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || "audio/webm",
        }
      });
    } else if (text) {
      parts.push({ text: `口述內容：${text}` });
    }

    // 呼叫模型 (使用最便宜的 gemini-2.5-flash-lite)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            station: { type: "STRING", description: "發生缺失的站別" },
            description: { type: "STRING", description: "詳細的缺失描述" },
            regulation: { type: "STRING", description: "推論可能違反的法規或SOP條文，若無關聯則填無" }
          },
          required: ["station", "description", "regulation"]
        }
      }
    });

    // 回傳 JSON 給前端
    return new Response(response.text, {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Gemini 錯誤詳情:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
