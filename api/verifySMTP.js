// Vercel Serverless Function: SMTP 驗證端點
// 路徑會自動對應到 /api/verifySMTP
// 注意：Vercel 建議使用 Resend API，SMTP 可能不穩定

export default function handler(req, res) {
    // 在 Vercel 上，我們只檢查 Resend 設定
    if (process.env.RESEND_API_KEY) {
        return res.status(200).json({
            ok: true,
            provider: 'resend',
            message: 'Resend API 已設定'
        });
    }

    return res.status(503).json({
        ok: false,
        code: 'NO_PROVIDER',
        message: 'Vercel 部署建議使用 Resend API',
        hint: '請設定 RESEND_API_KEY 環境變數'
    });
}
