// Vercel Serverless Function: 處理表單提交並發送郵件
// 路徑會自動對應到 /api/sendEmail

export default async function handler(req, res) {
    // 只接受 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // 從請求中獲取表單資料
    const { name, company, email, phone } = req.body;

    // 簡單的後端驗證
    if (!name || !company || !email) {
        return res.status(400).json({ message: '姓名、公司和 Email 為必填欄位。' });
    }

    // 如果設定了 RESEND_API_KEY，優先使用 Resend（HTTP API，不受 SMTP 連線問題影響）
    const useResend = Boolean(process.env.RESEND_API_KEY);

    if (useResend) {
        const apiKey = process.env.RESEND_API_KEY;
        const fromAddr = process.env.RESEND_FROM || 'ImobileBI <onboarding@resend.dev>';
        const toAddr = process.env.CONTACT_TO || 'info@imobilebi.com';

        try {
            const resp = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: fromAddr,
                    to: [toAddr],
                    subject: '【新客戶諮詢】來自 ImobileBI 官網的產品諮詢',
                    html: `
                        <h2>您有一封新的客戶諮詢</h2>
                        <p><strong>姓名：</strong> ${name}</p>
                        <p><strong>公司名稱：</strong> ${company}</p>
                        <p><strong>聯絡 Email：</strong> ${email}</p>
                        <p><strong>聯絡電話：</strong> ${phone || '未提供'}</p>
                        <hr>
                        <p>此信件由 ImobileBI 官網表單自動發送。</p>
                    `
                })
            });

            if (!resp.ok) {
                let errJson; try { errJson = await resp.json(); } catch (_) {}
                console.error('[Resend] API 錯誤:', {
                    status: resp.status,
                    statusText: resp.statusText,
                    error: errJson
                });
                return res.status(502).json({
                    code: 'RESEND_API_ERROR',
                    message: '郵件服務（Resend）回應失敗',
                    details: errJson || { status: resp.status },
                    hint: errJson?.message || '請檢查 Resend API Key 與 FROM 地址設定'
                });
            }

            return res.status(200).json({ message: '郵件已成功寄出！' });
        } catch (error) {
            console.error('[Resend] 發送失敗:', error?.message || error);
            return res.status(500).json({
                code: 'RESEND_SEND_FAILED',
                message: 'Resend 發送失敗',
                details: error?.message
            });
        }
    }

    // SMTP fallback（若未設定 Resend）
    // 注意：Vercel 的 Serverless Functions 不建議使用 Nodemailer，
    // 因為可能會有連線問題。建議使用 Resend API。
    return res.status(503).json({
        code: 'SMTP_NOT_SUPPORTED',
        message: 'Vercel 部署建議使用 Resend API，請設定 RESEND_API_KEY 環境變數',
        hint: '請於 Vercel 環境變數設定 RESEND_API_KEY、RESEND_FROM、CONTACT_TO'
    });
}
