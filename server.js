// --- 後端郵件代理伺服器 (使用 Node.js + Express + Nodemailer) ---
// 這個伺服器會安全地處理來自您網頁的表單請求，並將其作為 E-mail 寄出。

// 1. 引入必要的套件
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config(); // 用於管理敏感資訊 (如信箱密碼)

// 2. 初始化 Express 應用
const app = express();
const PORT = process.env.PORT || 3000;

// 3. 設定中介軟體 (Middleware)
app.use(cors()); // 允許跨來源請求
app.use(express.json()); // 解析 JSON 格式的請求內容
app.use(express.static('public')); // 託管 public 資料夾中的靜態檔案 (例如您的 web.html)

// 4. 建立郵件發送的 API 端點
app.post('/api/sendEmail', async (req, res) => {
    // 從請求中獲取表單資料
    const { name, company, email, phone } = req.body;

    // 簡單的後端驗證
    if (!name || !company || !email) {
        return res.status(400).json({ message: '姓名、公司和 Email 為必填欄位。' });
    }

    // --- Nodemailer 設定 ---
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,       // 例如: "smtp.gmail.com" 或您的公司郵件主機
        port: process.env.SMTP_PORT || 587, // 通常是 587 (TLS) 或 465 (SSL)
        secure: (process.env.SMTP_PORT || 587) == 465, // 如果是 465 port 就用 true
        auth: {
            user: process.env.SMTP_USER, // 您的發信信箱帳號
            pass: process.env.SMTP_PASS, // 您的發信信箱密碼或應用程式密碼
        },
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
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: '郵件已成功寄出！' });
    } catch (error) {
        console.error('郵件發送失敗:', error);
        res.status(500).json({ message: '伺服器發生錯誤，郵件未能寄出。' });
    }
});

// 6. 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器已在 http://localhost:${PORT} 上運行`);
});
