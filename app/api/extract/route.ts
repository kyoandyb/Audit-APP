import { GoogleGenAI } from '@google/genai';

// 1. 新版寫法：必須傳入帶有 apiKey 屬性的物件
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const { text, audio, mimeType } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("找不到 GEMINI_API_KEY，請檢查 .env.local");
    }

    // 2. 準備要餵給 AI 的資料 (包含提示詞與音檔)
    let parts: any[] = [
      { text: `你是一個專業品質稽核助理。請聽這段語音，並擷取以下資訊：
      1. 站別 (若無明確提及則填無，禁止腦補)
      2. 缺失描述 (請潤飾成專業中文)
      3. 違反法規條文 (請根據缺失內容推論，例如缺乏生產紀錄建議參考 ISO 9001 7.5.1 或 ISO 13485 紀錄管制要求，若無則填無)
      
      請務必以 JSON 格式回傳。` }
    ];

    if (audio) {
      parts.push({
        inlineData: {
          data: audio,
          mimeType: mimeType || "audio/webm",
        }
      });
    } else if (text) {
      parts.push({ text: `口述內容：${text}` });
    }

    // 3. 新版寫法：直接呼叫 ai.models.generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

    // 4. 新版回傳文字的方式
    return new Response(response.text, {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Gemini 錯誤詳情:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}