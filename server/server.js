const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

/* ========================
   ① 中间件
======================== */
app.use(cors());
app.use(express.json());

// 让服务器直接提供前端页面
app.use(express.static(path.join(__dirname, "../")));

/* ========================
   ② 连接 MongoDB Atlas
======================== */
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://kakeiniu_DB:Hyron11%23@cluster0.ygeo1ay.mongodb.net/catcare";

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log("✅ MongoDB 连接成功");
  })
  .catch((err) => {
    console.error("❌ MongoDB 连接失败：", err && err.message ? err.message : err);
  });

const db = mongoose.connection;
db.on("error", (err) => {
  console.error("MongoDB 连接错误：", err);
});
db.on("connected", () => {
  console.log("MongoDB 事件：connected");
});
db.on("disconnected", () => {
  console.warn("MongoDB 事件：disconnected");
});

/* ========================
   ③ 定义预约数据模型
======================== */
const appointmentSchema = new mongoose.Schema({
  contact: String,
  address: String,
  catName: String,
  catAge: String,
  date: String,
  time: String,
  note: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

/* ========================
   ④ 接收预约并保存到数据库
======================== */
app.post("/api/appointment", async (req, res) => {
  try {
    console.log("📩 收到新的预约信息：");
    console.log(req.body);

    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB 未连接，当前状态：", mongoose.connection.readyState);
      return res.status(500).json({ success: false, message: "数据库连接失败，请稍后重试" });
    }

    // ===== 后端验证 =====
    const { contact, address, catName, catAge, date, time, note } = req.body;

    // 必填字段验证
    if (!contact || !contact.trim()) {
      return res.status(400).json({ success: false, message: "联系方式不能为空" });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: "上门地址不能为空" });
    }
    if (!catName || !catName.trim()) {
      return res.status(400).json({ success: false, message: "猫咪名字不能为空" });
    }
    if (!catAge || !catAge.trim()) {
      return res.status(400).json({ success: false, message: "猫咪年龄不能为空" });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: "服务日期不能为空" });
    }
    if (!time) {
      return res.status(400).json({ success: false, message: "服务时间不能为空" });
    }

    // 联系方式验证（至少7个字符）
    if (contact.trim().length < 7) {
      return res.status(400).json({ success: false, message: "联系方式过短，请确认是否完整" });
    }

    // 日期格式验证（YYYY-MM-DD）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, message: "日期格式错误" });
    }

    // 日期是否有效且不在过去
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(selectedDate.getTime()) || selectedDate < today) {
      return res.status(400).json({ success: false, message: "日期无效或已过期" });
    }

    // 创建预约对象
    const appointment = new Appointment({
      contact: contact.trim(),
      address: address.trim(),
      catName: catName.trim(),
      catAge: catAge.trim(),
      date,
      time,
      note: note ? note.trim() : ""
    });

    // 保存到数据库
    await appointment.save();

    console.log("✅ 已成功保存到 MongoDB");
    console.log("预约 ID：", appointment._id);

    res.json({
      success: true,
      message: "预约提交成功"
    });
  } catch (err) {
    console.error("❌ 保存失败：", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "服务器保存失败，请稍后重试"
    });
  }
});

/* ========================
   ⑤ 测试接口
======================== */
app.get("/test", (req, res) => {
  res.send("OK");
});

/* ========================
   ⑥ 启动服务器
======================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务器已启动：http://localhost:${PORT}`);
});