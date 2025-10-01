// --- 後端郵件代理伺服器 (使用 Node.js + Express + Nodemailer) ---
// 這個伺服器會安全地處理來自您網頁的表單請求，並將其作為 E-mail 寄出。

// 1. 引入必要的套件
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // 用於管理敏感資訊 (如信箱密碼)

// 2. 初始化 Express 應用
const app = express();
const PORT = process.env.PORT || 3000;

// 3. 設定中介軟體 (Middleware)
app.use(cors()); // 允許跨來源請求
app.use(express.json()); // 解析 JSON 格式的請求內容
app.use(express.urlencoded({ extended: true })); // 解析表單 urlencoded（保險起見）
app.use(express.static(path.join(__dirname, 'public'))); // 託管 public 資料夾中的靜態檔案 (例如您的 web.html)

// 讓根路由回傳 landing page，避免 "Cannot GET /" 的錯誤
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'web.html'));
});

// 4. 建立郵件發送的 API 端點
// 健康檢查：前端可用此端點判斷 SMTP 是否已設定
app.get('/api/health', (_req, res) => {
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const looksLikePlaceholder = (v) => !v || /your-email|smtp\.your-email-provider\.com/i.test(String(v));
    const smtpConfigured = !(looksLikePlaceholder(SMTP_HOST) || looksLikePlaceholder(SMTP_USER) || looksLikePlaceholder(SMTP_PASS));
    res.json({ ok: true, smtpConfigured, node: process.version, port: PORT });
});

app.post('/api/sendEmail', async (req, res) => {
    // 從請求中獲取表單資料
    const { name, company, email, phone } = req.body;

    // 簡單的後端驗證
    if (!name || !company || !email) {
        return res.status(400).json({ message: '姓名、公司和 Email 為必填欄位。' });
    }

    // 讀取 SMTP 設定
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    // 若未設定或仍為預設 placeholder，立即回覆（避免連線逾時導致前端一直轉圈）
    const looksLikePlaceholder = (v) => !v || /your-email|smtp\.your-email-provider\.com/i.test(String(v));
    if (looksLikePlaceholder(SMTP_HOST) || looksLikePlaceholder(SMTP_USER) || looksLikePlaceholder(SMTP_PASS)) {
        console.warn('[Email] SMTP 未設定或為預設值，略過寄信流程');
        return res.status(503).json({
            code: 'SMTP_NOT_CONFIGURED',
            message: '郵件服務尚未設定，請稍後再試。',
            hint: '請於 Render 環境變數設定 SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS 後重試'
        });
    }

    // --- Nodemailer 設定 ---
    let transporter = nodemailer.createTransport({
        host: SMTP_HOST,                    // 例如: "smtp.gmail.com" 或您的公司郵件主機
        port: SMTP_PORT,                    // 通常是 587 (TLS) 或 465 (SSL)
        secure: SMTP_PORT === 465,          // 如果是 465 port 就用 true
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        pool: true,
        maxConnections: 2,
        maxMessages: 20,
        connectionTimeout: 10000, // 10s 建立連線逾時
        greetingTimeout: 7000,    // 7s 等待伺服器問候
        socketTimeout: 15000      // 15s 任何 socket 操作逾時
    });

    // 設定信件內容
    let mailOptions = {
        from: `"ImobileBI 官網" <${process.env.SMTP_USER}>`, // 發件人顯示名稱與信箱
        to: 'info@imobilebi.com',                             // 收件人 (您公司的信箱)
        subject: '【新客戶預約】來自 ImobileBI 官網的 DEMO 演示請求', // 信件主旨
        html: `
            <h2>您有一封新的 Demo 預約請求</h2>
            <p><strong>姓名：</strong> ${name}</p>
            <p><strong>公司名稱：</strong> ${company}</p>
            <p><strong>聯絡 Email：</strong> ${email}</p>
            <p><strong>聯絡電話：</strong> ${phone || '未提供'}</p>
            <hr>
            <p>此信件由 ImobileBI 官網表單自動發送。</p>
        `,
    };

    // 5. 嘗試發送信件
    try {
        console.log('[Email] 收到表單', { name, company, email, hasPhone: Boolean(phone) });
        await transporter.sendMail(mailOptions);
        console.log('[Email] 寄送成功');
        res.status(200).json({ message: '郵件已成功寄出！' });
    } catch (error) {
        console.error('郵件發送失敗:', {
            message: error?.message,
            code: error?.code,
            command: error?.command
        });
        res.status(500).json({
            code: error?.code || 'MAIL_SEND_FAILED',
            message: '伺服器發生錯誤，郵件未能寄出。',
            details: error?.message || undefined
        });
    }
});

// 6. 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器已在 http://localhost:${PORT} 上運行`);
});
