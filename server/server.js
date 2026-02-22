const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// ===============================
// 基础配置
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// Gmail 邮件服务配置
// ===============================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "njh000314@gmail.com",       // ✅ 发信 Gmail
    pass: "这里填写你的16位应用专用密码" // ❗不是登录密码
  }
});

// 启动时检查邮件服务
transporter.verify((error) => {
  if (error) {
    console.error("❌ 邮件服务配置失败：", error);
  } else {
    console.log("✅ 邮件服务已就绪，可以发送邮件");
  }
});

// ===============================
// 接收预约信息接口
// ===============================
app.post("/api/appointment", async (req, res) => {
  const data = req.body;

  console.log("📩 收到新的预约信息：");
  console.log(data);

  const mailText = `
【新的猫咪上门看护预约】

👤 联系人信息
姓名：${data.name}
联系方式：${data.contact}
上门地址：${data.address}

🐱 猫咪信息
名字：${data.catName}
年龄：${data.catAge}
特殊说明：${data.note}

📅 上门时间
日期：${data.date}
时间段：${data.time}
  `;

  try {
    await transporter.sendMail({
      from: `"猫咪上门看护" <njh000314@gmail.com>`,
      to: "njh000314@gmail.com", // ✅ 发送给你自己（测试用）
      subject: "🐱 新的猫咪上门看护预约",
      text: mailText
    });

    console.log("📧 邮件发送成功");

    res.json({
      success: true,
      message: "预约信息已提交"
    });
  } catch (error) {
    console.error("❌ 邮件发送失败：", error);
    res.status(500).json({
      success: false,
      message: "服务器错误"
    });
  }
});

// ===============================
// 启动服务器
// ===============================
app.listen(3000, () => {
  console.log("🚀 服务器已启动：http://localhost:3000");
});