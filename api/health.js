// Vercel Serverless Function: 健康檢查端點
// 路徑會自動對應到 /api/health

export default function handler(req, res) {
    const provider = process.env.RESEND_API_KEY ? 'resend' : 'none';
    const resendConfigured = Boolean(process.env.RESEND_API_KEY);

    res.status(200).json({
        ok: true,
        provider,
        resendConfigured,
        platform: 'vercel',
        node: process.version
    });
}
