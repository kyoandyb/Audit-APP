import { Client } from '@notionhq/client';

// 初始化 Notion 客戶端
const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function POST(req: Request) {
  try {
    const { station, text, regulation } = await req.json();

    // 防呆檢查
    if (!process.env.NOTION_DATABASE_ID) {
      throw new Error("找不到 NOTION_DATABASE_ID，請檢查 .env.local");
    }

    // 將資料寫入 Notion 資料庫
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        '站別': {
          title: [
            { text: { content: station || '未填寫' } },
          ],
        },
        // 這裡對應你 Notion 表格的名稱
        '稽核內容': {
          rich_text: [
            { text: { content: text || '未填寫' } },
          ],
        },
        '法規相關': {
          rich_text: [
            { text: { content: regulation || '未填寫' } },
          ],
        },
      },
    });

    // 成功回傳 JSON
    return new Response(JSON.stringify({ success: true, id: response.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Notion 報錯內容:', error.body || error);
    // 失敗回傳 JSON
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}